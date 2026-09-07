# Peregrinar Platform

Plataforma e-commerce multi-tenant. Primer tenant: **Editorial Peregrinar**.

Node.js + Express + PostgreSQL 15 o superior en el backend. HTML, CSS y
JavaScript vanilla en el frontend, servido por el mismo Express. Sin frameworks
de frontend, sin build.

---

## Puesta en marcha

```bash
cd backend
npm install
cp .env.example .env      # completar JWT_SECRET
npm run bd:iniciar        # PostgreSQL del proyecto, sin contraseña
npm run migrate           # crea la base y aplica el esquema
npm run seed              # carga Editorial Peregrinar (una sola vez)
npm run dev
```

Abrir http://localhost:3000

`npm run seed` imprime el email y la contraseña del administrador una única vez.

### La base de datos de desarrollo

`npm run bd:iniciar` crea un PostgreSQL propio del proyecto, en
`.datos-postgres/`, puerto 5433 y **sin contraseña**. No toca la instalación de
PostgreSQL de la máquina y no hay ninguna contraseña que recordar; borrar la
base de desarrollo es borrar una carpeta.

Sin contraseña está bien acá y estaría muy mal en producción: solo acepta
conexiones desde la misma computadora y solo tiene datos de prueba. En
producción la base es la de Render o Railway, con su contraseña, y eso se
configura en `DATABASE_URL`.

**Después de reiniciar la computadora hay que volver a levantarla**
(`npm run bd:iniciar`): no arranca sola.

| Comando | |
|---|---|
| `npm run bd:iniciar` | La crea si no existe y la enciende |
| `npm run bd:detener` | La apaga |
| `npm run bd:estado` | Dice si está corriendo |
| `npm run bd:borrar -- --si` | La elimina entera |

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm run migrate` | Crea la base si falta y aplica las migraciones pendientes |
| `npm run migrate -- --estado` | Muestra qué migraciones están aplicadas, sin tocar nada |
| `npm run seed` | Carga el tenant inicial y un catálogo de ejemplo |
| `npm run verificar` | Comprueba que la base impide cruzar datos entre tiendas |
| `npm run crear-tenant -- --ayuda` | Crea una tienda nueva con su primer administrador |
| `npm run crear-usuario -- --ayuda` | Crea un administrador, un empleado o un superadmin |

---

## Estructura

```
backend/src/
├── config/env.js        Único lugar que lee process.env
├── database/            Conexión, migraciones versionadas, seed
├── middleware/          auth · roles · tenantResolver · modulo · upload · errorHandler
├── storage/             Driver de archivos (local hoy, externo después)
├── routes/
│   ├── public/          Tienda. Sin token. Tenant por dominio.
│   ├── admin/           Panel. Token obligatorio. Tenant del JWT.
│   └── platform/        Superadmin. Administra tenants.
├── controllers/         Lógica de cada recurso
├── repositories/        TODO el SQL. tenant_id siempre obligatorio.
└── utils/               respuesta · errores · logger

frontend/
├── publico/             Tienda
├── admin/               Panel administrativo
├── auth/                Login
├── shared/              api.js · sesion.js · notificaciones.js · tokens.css
└── assets/              Imágenes fijas del proyecto
```

---

## Reglas del proyecto

Estas reglas son las que sostienen el aislamiento entre tiendas. No se rompen
sin discutirlo primero.

**1. El `tenant_id` nunca viene del frontend.**
En `/api/admin/*` sale del JWT. En `/api/public/*` lo resuelve `tenantResolver`
a partir del dominio. Un `tenant_id` en el body o en el query se ignora siempre.

**2. Todo el SQL vive en `repositories/`.**
Cada función recibe `tenantId` como primer parámetro. Ninguna consulta a una
tabla con `tenant_id` puede ejecutarse sin ese filtro.

**3. Toda unicidad es compuesta con `tenant_id`.**
`UNIQUE (tenant_id, slug)`, nunca `UNIQUE (slug)`. Si no, el segundo tenant no
puede tener su propia categoría "biblias".

**4. La API responde siempre igual.**
`{ ok: true, data }` o `{ ok: false, error }`. Se usa `utils/respuesta.js`.
Ninguna ruta llama a `res.json()` directamente.

**5. Los errores se lanzan, no se responden.**
`throw errores.noEncontrado("Producto no encontrado")`. Express 5 los envía al
manejador central, que arma la respuesta. Sin `try/catch` repetido en cada ruta.

**6. En la base se guarda la clave del archivo, no la URL.**
Las columnas se llaman `imagen`, `logo`, `favicon`, `og_imagen` — nunca
`*_url` — y guardan algo como `productos/editorial-peregrinar/abc.jpg`.
La URL la arma `storage/`. Así cambiar a Cloudinary es un archivo y no una
migración de datos.

**7. El frontend nunca usa `fetch()` ni URLs absolutas.**
Todo pasa por `EP.api` (`shared/js/api.js`).

**8. Nada de `alert()` ni `confirm()`.**
`EP.notificar.exito(...)` y `await EP.confirmar({...})`.

**9. Ningún color literal en las hojas de estilo.**
Se usan las variables de `shared/css/tokens.css`, que es el contrato con el
editor de apariencia.

**10. Los cambios de esquema van en una migración numerada.**
Nunca SQL ejecutado a mano, y nunca editando una migración ya aplicada: el
runner guarda el checksum de cada archivo y se detiene si alguno cambió.

---

## Cómo la base impide que se crucen los datos

El aislamiento no depende de acordarse de escribir `WHERE tenant_id = ...`.
Está en el esquema:

- Las 21 tablas de negocio tienen `tenant_id NOT NULL` con
  `ON DELETE CASCADE` hacia `tenants`. Eliminar una tienda borra todo lo suyo.
- Cada tabla que es destino de una relación declara `UNIQUE (tenant_id, id)`, y
  las relaciones internas usan claves foráneas **compuestas**:

  ```sql
  FOREIGN KEY (tenant_id, categoria_id) REFERENCES categorias (tenant_id, id)
  ```

  Un producto de la Tienda A no puede apuntar a una categoría de la Tienda B:
  PostgreSQL rechaza el `INSERT`. Lo mismo con imágenes, pedidos, items de
  pedido y galerías.
- Toda unicidad es compuesta con `tenant_id`, así que cada tienda tiene su
  propio espacio de nombres: sus slugs, sus emails de administrador y su
  numeración de pedidos, que arranca en 1 para cada una.

`npm run verificar` comprueba las 21 reglas y no deja nada en la base.

---

## De dónde sale el tenant en cada petición

| Superficie | Origen | Queda en |
|---|---|---|
| `/api/public/*` | header `Host` → tabla `tenant_dominios`; si el dominio no está registrado, `DEFAULT_TENANT_SLUG` | `req.tenant` |
| `/api/admin/*` | el JWT del usuario | `req.usuario.tenant_id` |
| `/api/platform/*` | lo elige el superadmin | — |

`tenantDe(req)` en `middleware/tenantResolver.js` es el único lugar que contesta
esa pregunta. Un `tenant_id` que llegue en el body, el query o un header **se
ignora siempre**. Si una ruta consulta la base sin haber resuelto el tenant, la
consulta ni se intenta: `repositories/base.js` lanza un error de programación.

En desarrollo se puede pedir otra tienda con `?tienda=<slug>` para probar el
aislamiento sobre localhost. En producción se ignora: manda el dominio.

Los módulos de cada tienda se controlan con `moduloActivo("galeria")` en la
definición de la ruta. Si la tienda no lo tiene contratado, la petición corta
con 403 y un mensaje entendible.

---

## Archivos e imágenes

Todo pasa por `storage/`, que hoy usa el disco local y mañana puede usar
Cloudinary sin tocar nada más:

```js
const { clave } = await storage.guardar({
    carpeta: "productos",          // lista cerrada, nunca viene del cliente
    tenantSlug: tenant.slug,       // cada tienda en su propia carpeta
    buffer: archivo.buffer,
    mime: archivo.mimetype         // la extensión sale del tipo, no del nombre
});

storage.url(clave)   // -> /uploads/productos/editorial-peregrinar/1712-a3f9.png
```

multer recibe los archivos **en memoria**; quién los escribe y dónde lo decide
el driver. En la base se guarda `clave`, nunca la URL.

---

## La tienda

| Dirección | Qué es |
|---|---|
| `/` | Portada: bienvenida, categorías, destacados, novedades |
| `/catalogo` | Catálogo con filtros, búsqueda y paginación |
| `/producto/:slug` | Detalle con galería y relacionados |
| `/p/:clave` | Páginas de texto (nosotros, trabajos personalizados…) |
| `/preguntas-frecuentes` · `/contacto` | |

`tienda.css` no tiene **ni un color ni una tipografía literal**: todo sale de
las variables de `shared/css/tokens.css`, que `tienda.js` pisa al cargar con lo
que el cliente guardó en su apariencia. Por eso el editor de apariencia
(Etapa 9) va a poder cambiar la tienda entera sin tocar una línea de CSS.

Todo lo que se lee en estas páginas se carga desde el panel: los banners de la
portada, las páginas de texto, las preguntas frecuentes, los datos de contacto,
las redes y las formas de pago. **Nada de eso vive en el HTML**, así que el
cliente cambia lo que dice su tienda sin pedirle nada a nadie.

Los filtros del catálogo viven en la URL, no en una variable: así se puede
compartir "las biblias en oferta" por WhatsApp, el botón atrás funciona y
recargar no pierde lo que se estaba mirando.

Las páginas del menú salen de la base: si el cliente crea una página nueva
desde el panel, aparece sola en el menú y en el pie.

---

## Carrito y pedidos

**El precio lo pone el servidor, nunca el carrito.** El navegador manda qué
producto y cuántas unidades; el precio, el nombre y el total los calcula
`services/pedidos.js` leyendo la tabla de productos. Si se confiara en lo que
llega, cualquiera compraría una biblia a un peso editando un número antes de
enviar.

El carrito vive en el `localStorage` de quien compra, separado por tienda. Al
confirmar se valida de nuevo contra la base: que el producto siga publicado y
que haya stock. Si algo cambió mientras el carrito estaba abierto, la respuesta
dice qué producto y por qué, y la tienda lo marca en rojo.

El número de pedido es correlativo **por tienda** —cada una arranca en 1— y se
asigna bajo un candado de PostgreSQL, para que dos compras simultáneas no
calculen el mismo número.

El pedido guarda una **foto del momento**: nombre y precio quedan copiados en
`pedido_items`. Si después cambia el precio o se elimina el producto, el pedido
viejo sigue diciendo qué se vendió y a cuánto.

El límite por IP cuenta **pedidos creados**, no intentos: contar los intentos
dejaría afuera a quien se equivoca al escribir su email unas cuantas veces.

**Sobre el stock:** se valida al momento del pedido pero no se descuenta solo.
Con pago en efectivo o transferencia y confirmación manual, descontar al crear
el pedido dejaría stock trabado por compras que nunca se concretan. El stock lo
ajusta el cliente desde el panel al preparar el pedido.

---

## Ingreso y roles

El login resuelve **primero la tienda** por el dominio y **después** busca al
usuario dentro de ella. Por eso dos tiendas pueden tener un administrador con el
mismo email y contraseñas distintas, sin pisarse. El superadmin es la excepción:
no pertenece a ninguna tienda y se busca aparte.

| Rol | Alcance | Entra a |
|---|---|---|
| `superadmin` | toda la plataforma | `/api/platform/*` |
| `admin` | su tienda, sin límites | `/api/admin/*` |
| `empleado` | su tienda, según `usuarios.permisos` | `/api/admin/*` |

```js
router.post("/",     autenticar, requireRol("admin"),            ctrl.crear)
router.put("/:id",   autenticar, requirePermiso("productos.editar"), ctrl.editar)
```

Los permisos de un empleado se guardan como JSONB
(`{ "productos": ["ver","crear"] }`). `admin` y `superadmin` no se consultan
contra ese objeto. La estructura existe desde ahora para que sumar permisos
finos más adelante no requiera migrar la base.

**Qué protege el login**

- La respuesta de un intento fallido es siempre la misma, exista el email o no,
  y se compara contra un hash señuelo para que además tarde lo mismo. Decir cuál
  de las dos cosas falló le regala al atacante la mitad del trabajo.
- Ocho intentos fallidos por IP y email bloquean 15 minutos (`429` con
  `Retry-After`). El bloqueo es por email, así que nadie puede dejar afuera al
  dueño de una cuenta ajena fallando a propósito.
- Cada petición comprueba contra la base que el usuario siga existiendo,
  habilitado y con el mismo rol. Sin eso, dar de baja a un empleado no tendría
  efecto hasta que venciera su token, ocho horas después. La comprobación se
  cachea un minuto, y el panel la invalida al instante cuando cambia algo.

**Contraseñas.** Nunca hay una escrita en el código. Los scripts y el seed la
toman de una variable de entorno o generan una al azar y la muestran una sola
vez.

---

## La API

Respuestas siempre `{ ok, data }` o `{ ok, error }`. Los listados agregan `meta`
con la paginación.

### Tienda — `/api/public` · sin token, tenant por dominio

| | |
|---|---|
| `GET /tienda` | Nombre de la tienda y módulos habilitados |
| `GET /categorias` | Categorías activas, con cuántos productos tiene cada una |
| `GET /productos` | `?categoria=` `?buscar=` `?destacados=` `?novedades=` `?pagina=` `?por_pagina=` |
| `GET /productos/:slug` | Detalle con sus imágenes y productos relacionados |

Solo devuelve productos disponibles, y nunca expone `tenant_id`, el stock
exacto ni las fechas internas.

| `GET /faq` | Preguntas frecuentes |
| `GET /paginas/:clave` | Nosotros, trabajos personalizados, lo que el cliente cree |
| `GET /banners` | Banners de la portada |
| `POST /pedidos` | Crear un pedido (único punto público que escribe) |

`GET /tienda` devuelve todo lo que cualquier página necesita al cargar
—identidad, apariencia, contacto, redes, medios de pago, módulos y qué páginas
existen— en una sola vuelta. Separarlo serían cinco viajes para dibujar el
encabezado.

### Panel — `/api/admin` · token obligatorio, tenant del JWT

| | |
|---|---|
| `GET · POST /categorias` | Listar y crear |
| `PUT · DELETE /categorias/:id` | Editar y eliminar |
| `PATCH /categorias/orden` | Guardar el orden de la lista |
| `GET · POST /productos` | Listar con filtros y paginación; crear con imágenes |
| `GET · PUT · DELETE /productos/:id` | Detalle, editar, eliminar |
| `PATCH /productos/:id/disponible` | Sacar de la tienda sin borrar |
| `PATCH /productos/orden` | Guardar el orden |
| `POST /productos/:id/imagenes` | Agregar (hasta 6 por producto) |
| `DELETE /productos/:id/imagenes/:imagenId` | Quitar una |
| `PATCH /productos/:id/imagenes/:imagenId/principal` | Elegir cuál se muestra primero |

Cada ruta pasa por `requirePermiso("productos.editar")` y por
`moduloActivo("catalogo")`.

**Contenido** — `requirePermiso("contenido.editar")`

| | |
|---|---|
| `GET · POST /contenido/banners` | Listar y crear (la imagen es obligatoria) |
| `PUT · DELETE /contenido/banners/:id` | Editar y eliminar |
| `PATCH /contenido/banners/orden` | Guardar el orden |
| `GET · POST /contenido/paginas` | Listar y crear |
| `PUT · DELETE /contenido/paginas/:id` | Editar y eliminar |
| `GET · POST /contenido/faq` | Listar y crear |
| `PUT · DELETE /contenido/faq/:id` | Editar y eliminar |
| `PATCH /contenido/faq/orden` | Guardar el orden |

**Configuración** — `requirePermiso("configuracion.editar")`

| | |
|---|---|
| `GET /configuracion` | Identidad, contacto, redes y SEO en una sola respuesta |
| `PUT /configuracion/identidad` | Nombre, logo, ícono y los textos de la portada |
| `DELETE /configuracion/identidad/:imagen` | Quitar el logo o el ícono (`logo` \| `favicon`) |
| `PUT /configuracion/contacto` | Teléfono, WhatsApp, dirección, horarios, mapa |
| `PUT /configuracion/redes` | La lista entera: lo que no viene, se borra |
| `PUT /configuracion/sitio` | SEO, imagen para compartir y franja de aviso |
| `GET · POST /configuracion/medios-pago` | Listar y agregar una forma de pago |
| `PUT · DELETE /configuracion/medios-pago/:id` | Editar y eliminar |

Los **módulos habilitados no se tocan desde el panel de la tienda**: son lo que
esa tienda tiene contratado, no una preferencia suya. Se administran desde
`/api/platform`. Un dueño que pudiera encenderse módulos solo estaría
salteándose el plan.

**Cosas que resuelve el backend para que el cliente no tenga que pensarlas**

- El slug de la URL se arma solo a partir del nombre, y si ya existe otro igual
  en esa tienda se le agrega un número. Editar el nombre de un producto ya
  publicado no le cambia el enlace.
- Eliminar una categoría con productos responde `409` diciendo cuántos son;
  repitiendo con `?desasignar=true` esos productos quedan sin categoría y la
  categoría se borra, todo en una transacción.
- Al borrar un producto o una imagen se borra también el archivo del disco.
- `imagen_principal` se mantiene sola: al agregar la primera imagen, al borrar
  la principal o al elegir otra.
- Los precios se aceptan con coma o con punto, y vuelven al frontend como
  número, no como texto.
- El texto con formato de las páginas se limpia contra una lista de etiquetas
  permitidas antes de guardarse (`utils/htmlSeguro.js`). No se filtra "lo
  malo": cada etiqueta se reconstruye desde cero y lo único que sobrevive es
  el `href` de un enlace, si apunta a `http`, `https`, `mailto` o `/`.
- El número de WhatsApp se guarda solo con dígitos, como lo pide `wa.me`,
  escríbalo el cliente como lo escriba.
- Guardar el formulario de identidad sin volver a subir el logo no lo borra:
  para sacarlo hay un botón propio.

---

## Variables de entorno

Ver `backend/.env.example`. `backend/.env` no se versiona.

## Publicar

`render.yaml` deja el despliegue en Render armado: crea el servicio y la base
de datos, genera el `JWT_SECRET` y las conecta. Los pasos completos —incluida
la cuenta de Cloudinary, que **no es opcional** porque el disco de Render se
borra en cada despliegue— están en [PRODUCCION.md](PRODUCCION.md).

En producción cambian tres cosas por su cuenta:

- `trust proxy`, para que el límite de intentos cuente la IP real del visitante
  y no la del proxy de Render. Sin esto, el primero que fallara ocho veces al
  ingresar dejaría afuera a todo el mundo.
- Cabeceras de seguridad, incluida HSTS y una política de contenido que no
  permite scripts de terceros.
- Aviso al arrancar si `STORAGE_DRIVER` quedó en `local`.

---

## Estado

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Análisis | ✅ |
| 2 | Arquitectura y contratos transversales | ✅ |
| 3 | Base de datos y migraciones | ✅ |
| 4 | Núcleo del backend (tenant, storage) | ✅ |
| 5 | Autenticación y roles | ✅ |
| 6 | API pública + productos y categorías | ✅ |
| 7 | Panel administrativo | ✅ |
| 8 | Tienda pública | ✅ |
| 9 | Editor de apariencia | salteada en la ruta corta |
| 10 | Clientes, pedidos y carrito | ✅ |
| 11 | Contenido y configuración de la tienda | ✅ |
| 12 | Producción | ✅ |
