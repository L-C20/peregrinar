# Poner la tienda en internet

Guía para publicar en **Render** con PostgreSQL y Cloudinary. Todo tiene plan
gratuito suficiente para arrancar.

Son cuatro pasos y una media hora.

---

## 1. Cloudinary (para que las fotos no se pierdan)

**Esto no es opcional.** En Render el disco es efímero: cada vez que se publica
una versión nueva, el servidor arranca con el disco vacío. Sin un
almacenamiento externo, todas las fotos de productos que hayas subido
desaparecen en el siguiente despliegue.

1. Crear una cuenta en [cloudinary.com](https://cloudinary.com) (el plan gratis
   alcanza de sobra: 25 GB).
2. En el panel, arriba, anotar tres datos:
   - **Cloud name**
   - **API Key**
   - **API Secret**

Guardalos, los vas a cargar en el paso 3.

---

## 2. Subir el proyecto a GitHub

Render publica desde un repositorio.

```bash
git remote add origin https://github.com/TU-USUARIO/peregrinar-platform.git
git push -u origin main
```

`.env` y `.datos-postgres/` están en `.gitignore`: **ninguna contraseña sube al
repositorio.** Conviene confirmarlo antes de empujar:

```bash
git ls-files | grep -E "\.env$|datos-postgres"
```

No tiene que devolver nada.

---

## 3. Crear todo en Render

1. Entrar a [render.com](https://render.com) y conectar la cuenta de GitHub.
2. **New → Blueprint**, elegir el repositorio.

   Render lee `render.yaml` y arma solo el servicio web y la base de datos, con
   `JWT_SECRET` generado y `DATABASE_URL` conectada.

3. Va a pedir las variables que faltan, que son las que no se guardan en el
   repositorio por ser secretas:

   | Variable | De dónde sale |
   |---|---|
   | `CLOUDINARY_CLOUD_NAME` | del paso 1 |
   | `CLOUDINARY_API_KEY` | del paso 1 |
   | `CLOUDINARY_API_SECRET` | del paso 1 |
   | `PUBLIC_URL` | dejarla vacía por ahora |

4. **Apply**. El primer despliegue tarda unos minutos: instala, corre las
   migraciones y levanta el servidor.

Cuando termine, Render da una dirección tipo
`https://peregrinar-platform.onrender.com`. Volvé a las variables y poné esa
dirección en `PUBLIC_URL`.

---

## 4. Crear la tienda y su administrador

La base arranca vacía: tiene las tablas pero ninguna tienda. En Render,
**Shell** (en el menú del servicio):

```bash
npm run crear-tenant -- \
    --nombre "Editorial Peregrinar" \
    --slug editorial-peregrinar \
    --admin-email tu@email.com
```

Imprime la contraseña **una sola vez**. Copiala antes de cerrar la ventana.

> El `--slug` tiene que coincidir con `DEFAULT_TENANT_SLUG`, que en
> `render.yaml` está en `editorial-peregrinar`.

Ya podés entrar en `https://tu-direccion.onrender.com/login/`.

### Si querés arrancar con los productos de ejemplo

```bash
npm run seed -- --forzar
```

El `--forzar` está porque el seed carga datos de ejemplo y se niega a correr en
producción sin que se lo pidan explícitamente. Es útil para ver la tienda
funcionando; después borrás los productos de ejemplo desde el panel.

---

## Conectar tu dominio

1. En Render, **Settings → Custom Domain**, agregar `editorialperegrinar.com`.
   Render dice qué registro DNS cargar donde compraste el dominio.
2. Cuando el dominio ya resuelva, registrarlo en la base para que el sistema
   sepa a qué tienda corresponde. En el Shell:

```bash
psql "$DATABASE_URL" -c "INSERT INTO tenant_dominios (tenant_id, dominio, principal) SELECT id, 'editorialperegrinar.com', true FROM tenants WHERE slug = 'editorial-peregrinar';"
```

3. Actualizar `PUBLIC_URL` con `https://editorialperegrinar.com`.

A partir de ahí, agregar una tienda nueva con su propio dominio es repetir
`crear-tenant` y una fila en `tenant_dominios`. No hay nada que programar.

---

## Cosas que conviene saber

**El plan gratuito de Render duerme el servicio.** Después de 15 minutos sin
visitas, el servidor se apaga y la primera visita siguiente tarda unos 30
segundos en cargar. Para una tienda que recibe pedidos conviene el plan pago
más barato, que no duerme.

**La base gratuita de Render vence a los 90 días.** Antes de eso hay que pasar
al plan pago o migrar los datos. Render avisa por email. Si preferís evitarlo
desde el arranque, Supabase y Neon tienen planes gratuitos sin vencimiento:
alcanza con poner su `DATABASE_URL` y no crear la base de Render.

**Copias de seguridad.** El plan pago de Render hace copias diarias. En el
gratuito no hay: si te importa lo cargado, una copia a mano cada tanto.

```bash
pg_dump "$DATABASE_URL" > respaldo.sql
```

**Las migraciones corren en el build.** Cada despliegue aplica lo que falte y
se saltea lo ya aplicado. Si alguna falla, el despliegue se detiene y la
versión anterior sigue en línea.

---

## Cuando algo no anda

**El despliegue falla en el build.** Mirar el log en Render. Casi siempre es
una migración: el mensaje dice cuál y por qué.

**La tienda carga pero dice "La tienda no está disponible".** No hay ninguna
tienda con el slug de `DEFAULT_TENANT_SLUG`. Volver al paso 4.

**Las fotos nuevas no se ven.** Revisar que `STORAGE_DRIVER` diga `cloudinary`
y que las tres variables de Cloudinary estén cargadas. En el log del arranque
tiene que decir `Almacenamiento de archivos: cloudinary`.

**Las fotos viejas no se ven pero las nuevas sí.** Son las que se subieron
mientras estaba en `local` y se perdieron con un despliegue. Hay que volver a
subirlas; las nuevas ya están a salvo en Cloudinary.

**Comprobar que el servicio está sano:**

```
https://tu-direccion.onrender.com/api/health
```

Tiene que responder `"baseDatos": "conectada"`.
