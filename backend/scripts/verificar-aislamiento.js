// =====================================================
// VERIFICACION DEL AISLAMIENTO MULTI-TENANT
//
//   npm run verificar
//
// Comprueba que la BASE DE DATOS, por si sola, impide que
// los datos de dos tiendas se crucen. No prueba la API:
// prueba las reglas que estan un nivel mas abajo y que
// siguen valiendo aunque alguien se olvide un WHERE.
//
// Todo corre dentro de una transaccion que termina en
// ROLLBACK: no deja nada en la base.
//
// Se ejecuta contra la base de desarrollo (DATABASE_URL).
// Se niega a correr con NODE_ENV=production.
// =====================================================

const config = require("../src/config/env");
const { pool } = require("../src/database/connection");


let pasadas = 0;
let falladas = 0;

const linea = (texto = "") => console.log(texto);
const ok = (texto) => { pasadas++; console.log(`  ✓ ${texto}`); };
const mal = (texto, detalle) => {
    falladas++;
    console.log(`  ✗ ${texto}${detalle ? "\n      " + detalle : ""}`);
};


// La operacion TIENE que ser rechazada por la base.
async function debeFallar(cliente, titulo, sql, params, codigoEsperado) {

    try {
        await cliente.query("SAVEPOINT sp");
        await cliente.query(sql, params);
        await cliente.query("RELEASE SAVEPOINT sp");
        mal(titulo, "la base lo ACEPTÓ y no debía");

    } catch (falla) {
        await cliente.query("ROLLBACK TO SAVEPOINT sp");

        if (codigoEsperado && falla.code !== codigoEsperado) {
            mal(titulo, `falló con ${falla.code}, se esperaba ${codigoEsperado}`);
        } else {
            ok(`${titulo}  [${falla.code}]`);
        }
    }
}


// La operacion TIENE que funcionar.
async function debeFuncionar(cliente, titulo, sql, params) {

    try {
        await cliente.query("SAVEPOINT sp");
        await cliente.query(sql, params);
        await cliente.query("RELEASE SAVEPOINT sp");
        ok(titulo);

    } catch (falla) {
        await cliente.query("ROLLBACK TO SAVEPOINT sp");
        mal(titulo, `${falla.code} · ${falla.message}`);
    }
}


async function verificar() {

    if (config.esProduccion) {
        console.error("  ✗ No se ejecuta con NODE_ENV=production.");
        process.exit(1);
    }

    const cliente = await pool.connect();

    try {
        await cliente.query("BEGIN");

        // -------------------------------------------------
        // DOS TIENDAS
        // -------------------------------------------------

        const tiendaA = (await cliente.query(
            `INSERT INTO tenants (nombre, slug)
             VALUES ('Verificación A', 'verificacion-a') RETURNING id`
        )).rows[0].id;

        const tiendaB = (await cliente.query(
            `INSERT INTO tenants (nombre, slug)
             VALUES ('Verificación B', 'verificacion-b') RETURNING id`
        )).rows[0].id;

        const categoriaA = (await cliente.query(
            `INSERT INTO categorias (tenant_id, nombre, slug)
             VALUES ($1, 'Biblias', 'biblias') RETURNING id`,
            [tiendaA]
        )).rows[0].id;

        const productoA = (await cliente.query(
            `INSERT INTO productos (tenant_id, categoria_id, nombre, slug, precio)
             VALUES ($1, $2, 'Biblia', 'biblia', 1000) RETURNING id`,
            [tiendaA, categoriaA]
        )).rows[0].id;

        const galeriaA = (await cliente.query(
            `INSERT INTO galerias (tenant_id, nombre, slug)
             VALUES ($1, 'Trabajos', 'trabajos') RETURNING id`,
            [tiendaA]
        )).rows[0].id;

        const clienteB = (await cliente.query(
            `INSERT INTO clientes (tenant_id, nombre)
             VALUES ($1, 'Cliente de B') RETURNING id`,
            [tiendaB]
        )).rows[0].id;


        // -------------------------------------------------

        linea();
        linea("  AISLAMIENTO ENTRE TIENDAS");
        linea();

        await debeFallar(cliente,
            "Un producto de B no puede usar una categoría de A",
            `INSERT INTO productos (tenant_id, categoria_id, nombre, slug, precio)
             VALUES ($1, $2, 'Intruso', 'intruso', 100)`,
            [tiendaB, categoriaA], "23503");

        await debeFallar(cliente,
            "Una imagen de B no puede colgar de un producto de A",
            `INSERT INTO producto_imagenes (tenant_id, producto_id, imagen)
             VALUES ($1, $2, 'x.jpg')`,
            [tiendaB, productoA], "23503");

        await debeFallar(cliente,
            "Un pedido de A no puede apuntar a un cliente de B",
            `INSERT INTO pedidos (tenant_id, cliente_id, numero)
             VALUES ($1, $2, 900)`,
            [tiendaA, clienteB], "23503");

        await debeFallar(cliente,
            "Una imagen de galería de B no puede colgar de una galería de A",
            `INSERT INTO galeria_imagenes (tenant_id, galeria_id, imagen)
             VALUES ($1, $2, 'x.jpg')`,
            [tiendaB, galeriaA], "23503");


        linea();
        linea("  CADA TIENDA CON SU PROPIO ESPACIO DE NOMBRES");
        linea();

        await debeFuncionar(cliente,
            "B puede tener su propia categoría con el slug 'biblias'",
            `INSERT INTO categorias (tenant_id, nombre, slug)
             VALUES ($1, 'Biblias', 'biblias')`,
            [tiendaB]);

        await debeFuncionar(cliente,
            "A y B pueden tener un administrador con el mismo email",
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol)
             VALUES ($1, 'Admin A', 'admin@ejemplo.com', 'x', 'admin'),
                    ($2, 'Admin B', 'admin@ejemplo.com', 'x', 'admin')`,
            [tiendaA, tiendaB]);

        await debeFallar(cliente,
            "Dentro de una tienda el email no se repite",
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol)
             VALUES ($1, 'Duplicado', 'ADMIN@ejemplo.com', 'x', 'admin')`,
            [tiendaA], "23505");

        await debeFuncionar(cliente,
            "Las dos tiendas pueden tener el pedido número 1",
            `INSERT INTO pedidos (tenant_id, numero) VALUES ($1, 1), ($2, 1)`,
            [tiendaA, tiendaB]);

        await debeFallar(cliente,
            "Una tienda no puede repetir el número de pedido",
            `INSERT INTO pedidos (tenant_id, numero) VALUES ($1, 1)`,
            [tiendaA], "23505");


        linea();
        linea("  REGLAS DE ROLES");
        linea();

        await debeFuncionar(cliente,
            "El superadmin existe sin pertenecer a ninguna tienda",
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol)
             VALUES (NULL, 'Super', 'super@verificacion.local', 'x', 'superadmin')`,
            []);

        await debeFallar(cliente,
            "Un admin no puede quedar sin tienda",
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol)
             VALUES (NULL, 'Huérfano', 'h@verificacion.local', 'x', 'admin')`,
            [], "23514");

        await debeFallar(cliente,
            "Un superadmin no puede pertenecer a una tienda",
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol)
             VALUES ($1, 'Super A', 'sa@verificacion.local', 'x', 'superadmin')`,
            [tiendaA], "23514");


        linea();
        linea("  INTEGRIDAD DE DATOS");
        linea();

        await debeFallar(cliente,
            "No se acepta un precio negativo",
            `INSERT INTO productos (tenant_id, nombre, slug, precio)
             VALUES ($1, 'Malo', 'malo', -5)`,
            [tiendaA], "23514");

        await debeFallar(cliente,
            "No se acepta un slug con mayúsculas ni espacios",
            `INSERT INTO productos (tenant_id, nombre, slug, precio)
             VALUES ($1, 'Malo', 'Slug Malo', 10)`,
            [tiendaA], "23514");

        await debeFallar(cliente,
            "No se acepta un color que no sea hexadecimal",
            `INSERT INTO configuracion_apariencia (tenant_id, color_principal)
             VALUES ($1, 'rojo')`,
            [tiendaA], "23514");

        await debeFallar(cliente,
            "No se acepta un estado de pedido inventado",
            `INSERT INTO pedidos (tenant_id, numero, estado)
             VALUES ($1, 777, 'despachado')`,
            [tiendaA], "23514");

        await debeFallar(cliente,
            "No se puede eliminar una categoría que tiene productos",
            `DELETE FROM categorias WHERE id = $1`,
            [categoriaA], "23001");


        linea();
        linea("  HISTORIAL DE VENTAS");
        linea();

        const pedidoA = (await cliente.query(
            `INSERT INTO pedidos (tenant_id, numero) VALUES ($1, 800) RETURNING id`,
            [tiendaA]
        )).rows[0].id;

        await cliente.query(
            `INSERT INTO pedido_items
                 (tenant_id, pedido_id, producto_id, nombre_producto,
                  precio_unitario, cantidad, subtotal)
             VALUES ($1, $2, $3, 'Biblia', 1000, 1, 1000)`,
            [tiendaA, pedidoA, productoA]
        );

        await cliente.query(
            `UPDATE productos SET categoria_id = NULL WHERE id = $1`,
            [productoA]
        );

        await debeFuncionar(cliente,
            "Se puede eliminar del catálogo un producto ya vendido",
            `DELETE FROM productos WHERE id = $1`,
            [productoA]);

        const item = (await cliente.query(
            `SELECT nombre_producto, precio_unitario,
                    producto_id IS NULL  AS sin_enlace,
                    tenant_id  IS NOT NULL AS con_tenant
             FROM pedido_items WHERE pedido_id = $1`,
            [pedidoA]
        )).rows[0];

        if (item && item.sin_enlace && item.con_tenant &&
            item.nombre_producto === "Biblia") {
            ok("El pedido conserva nombre y precio del producto eliminado");
        } else {
            mal("El pedido perdió los datos del producto eliminado",
                JSON.stringify(item));
        }


        linea();
        linea("  BORRADO EN CASCADA");
        linea();

        await cliente.query("DELETE FROM tenants WHERE id = $1", [tiendaB]);

        const restos = (await cliente.query(
            `SELECT (SELECT count(*) FROM productos  WHERE tenant_id = $1) AS productos,
                    (SELECT count(*) FROM categorias WHERE tenant_id = $1) AS categorias,
                    (SELECT count(*) FROM usuarios   WHERE tenant_id = $1) AS usuarios,
                    (SELECT count(*) FROM pedidos    WHERE tenant_id = $1) AS pedidos,
                    (SELECT count(*) FROM clientes   WHERE tenant_id = $1) AS clientes`,
            [tiendaB]
        )).rows[0];

        if (Object.values(restos).every(valor => Number(valor) === 0)) {
            ok("Al eliminar una tienda no queda ningún dato suyo");
        } else {
            mal("Quedaron datos huérfanos", JSON.stringify(restos));
        }

        const quedanEnA = Number((await cliente.query(
            "SELECT count(*) AS n FROM categorias WHERE tenant_id = $1",
            [tiendaA]
        )).rows[0].n);

        if (quedanEnA === 1) ok("La otra tienda quedó intacta");
        else mal(`La otra tienda quedó con ${quedanEnA} categorías, se esperaba 1`);

    } finally {
        // Nada de lo anterior queda en la base.
        await cliente.query("ROLLBACK");
        cliente.release();
    }
}


// -----------------------------------------------------
// ENTRADA
// -----------------------------------------------------

if (require.main === module) {

    linea();
    linea("Verificando el aislamiento entre tiendas");

    verificar()
        .then(() => {
            linea();
            linea(`  ${pasadas} verificaciones correctas · ${falladas} fallas`);
            linea();
            process.exit(falladas > 0 ? 1 : 0);
        })
        .catch((falla) => {

            const conocidos = {
                "3D000": "La base de datos no existe. Ejecutá primero: npm run migrate",
                "42P01": "Faltan tablas. Ejecutá primero: npm run migrate",
                "28P01": "Usuario o contraseña incorrectos en DATABASE_URL",
                ECONNREFUSED: "No hay ningún PostgreSQL escuchando en la dirección de DATABASE_URL"
            };

            linea();
            console.error(`  ✗ ${conocidos[falla.code] || falla.message}`);
            linea();
            process.exit(1);
        })
        .finally(() => pool.end());
}


module.exports = verificar;
