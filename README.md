# Peregrinar Platform

Plataforma e-commerce multi-tenant. Primer tenant: **Editorial Peregrinar**.

Node.js + Express + PostgreSQL en el backend. HTML, CSS y JavaScript vanilla en
el frontend, servido por el mismo Express. Sin frameworks de frontend, sin build.

---

## Puesta en marcha

```bash
cd backend
npm install
cp .env.example .env      # completar DATABASE_URL y JWT_SECRET
npm run migrate           # a partir de la Etapa 3
npm run dev
```

Abrir http://localhost:3000

---

## Estructura

```
backend/src/
├── config/env.js        Único lugar que lee process.env
├── database/            Conexión, migraciones versionadas, seed
├── middleware/          auth · roles · tenantResolver · upload · errorHandler
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
`productos/editorial-peregrinar/abc.jpg`. La URL la arma `storage/`. Así cambiar
a Cloudinary es un archivo y no una migración de datos.

**7. El frontend nunca usa `fetch()` ni URLs absolutas.**
Todo pasa por `EP.api` (`shared/js/api.js`).

**8. Nada de `alert()` ni `confirm()`.**
`EP.notificar.exito(...)` y `await EP.confirmar({...})`.

**9. Ningún color literal en las hojas de estilo.**
Se usan las variables de `shared/css/tokens.css`, que es el contrato con el
editor de apariencia.

**10. Los cambios de esquema van en una migración numerada.**
Nunca SQL ejecutado a mano.

---

## Variables de entorno

Ver `backend/.env.example`. `backend/.env` no se versiona.

## Estado

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Análisis | ✅ |
| 2 | Arquitectura y contratos transversales | ✅ |
| 3 | Base de datos y migraciones | pendiente |
| 4 | Núcleo del backend (tenant, storage) | pendiente |
| 5 | Autenticación y roles | pendiente |
| 6 | API pública + productos y categorías | pendiente |
| 7 | Panel administrativo | pendiente |
| 8 | Tienda pública | pendiente |
| 9 | Editor de apariencia | pendiente |
| 10 | Clientes, pedidos y carrito | pendiente |
| 11 | Contenido: banners, galerías, contacto, pagos, módulos | pendiente |
| 12 | Producción | pendiente |
