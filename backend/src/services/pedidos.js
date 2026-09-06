// =====================================================
// SERVICIO · CREAR UN PEDIDO
//
// La regla más importante de todo el archivo:
//
//   LOS PRECIOS SALEN DE LA BASE, NUNCA DEL CARRITO.
//
// El navegador manda qué producto y cuántas unidades. El
// precio, el nombre y el total los calcula el servidor
// leyendo la tabla de productos. Si se confiara en lo que
// manda el cliente, cualquiera podría comprar una biblia
// a un peso cambiando un número antes de enviar.
//
// Todo ocurre en una transacción: si algo falla no queda un
// pedido sin items ni un cliente creado al pedo.
// =====================================================

const { transaccion } = require("../database/connection");
const { errores } = require("../utils/errores");
const validar = require("../utils/validar");
const logger = require("../utils/logger");

const clientes = require("../repositories/clientes");


const MAX_LINEAS = 50;
const MAX_UNIDADES = 999;


// -----------------------------------------------------
// DATOS DE QUIEN COMPRA
// -----------------------------------------------------

function leerContacto(datos = {}) {

    const contacto = {
        nombre: validar.texto(datos.nombre, {
            campo: "tu nombre", requerido: true, max: 120
        }),
        apellido: validar.texto(datos.apellido, { campo: "tu apellido", max: 120 }),
        email: validar.texto(datos.email, { campo: "tu email", max: 160 }),
        telefono: validar.texto(datos.telefono, { campo: "tu teléfono", max: 40 }),
        direccion: validar.texto(datos.direccion, { campo: "la dirección", max: 200 }),
        ciudad: validar.texto(datos.ciudad, { campo: "la ciudad", max: 120 }),
        provincia: validar.texto(datos.provincia, { campo: "la provincia", max: 120 })
    };

    if (contacto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.email)) {
        throw errores.solicitudInvalida("Ese email no parece válido");
    }

    // Sin alguna forma de contacto no hay manera de responder el
    // pedido, y sería un pedido inútil para las dos partes.
    if (!contacto.email && !contacto.telefono) {
        throw errores.solicitudInvalida(
            "Dejanos un email o un teléfono para poder confirmarte el pedido"
        );
    }

    return contacto;
}


// -----------------------------------------------------
// LINEAS DEL CARRITO
// -----------------------------------------------------

function leerLineas(items) {

    if (!Array.isArray(items) || items.length === 0) {
        throw errores.solicitudInvalida("Tu carrito está vacío");
    }

    if (items.length > MAX_LINEAS) {
        throw errores.solicitudInvalida(
            `Un pedido puede tener hasta ${MAX_LINEAS} productos distintos`
        );
    }

    // Si el mismo producto viene repetido se suman las unidades en
    // vez de crear dos líneas iguales.
    const porProducto = new Map();

    for (const item of items) {

        const productoId = validar.uuid(item?.producto_id, { campo: "el producto" });

        const cantidad = validar.numero(item?.cantidad, {
            campo: "la cantidad", requerido: true,
            min: 1, max: MAX_UNIDADES, entero: true
        });

        porProducto.set(productoId, (porProducto.get(productoId) || 0) + cantidad);
    }

    return porProducto;
}


// -----------------------------------------------------
// CREAR
// -----------------------------------------------------

async function crearPedido(tenantId, cuerpo = {}) {

    const contacto = leerContacto(cuerpo.contacto);
    const lineas = leerLineas(cuerpo.items);

    const observaciones = validar.texto(cuerpo.observaciones, {
        campo: "las observaciones", max: 1000
    });


    return transaccion(async (cliente) => {

        // El número de pedido es correlativo POR TIENDA. Sin este
        // candado, dos compras simultáneas podrían calcular el mismo
        // número y una de las dos fallaría contra el índice único.
        await cliente.query("SELECT pg_advisory_xact_lock(hashtext($1))", [tenantId]);


        // ---------- PRODUCTOS, LEIDOS DE LA BASE ----------

        const ids = [...lineas.keys()];

        const { rows: productos } = await cliente.query(
            `SELECT id, nombre, sku, precio, stock, disponible
             FROM productos
             WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
            [tenantId, ids]
        );

        const porId = new Map(productos.map(p => [p.id, p]));


        const items = [];
        let subtotal = 0;

        for (const [productoId, cantidad] of lineas) {

            const producto = porId.get(productoId);

            // Se pudo haber eliminado o despublicado mientras el
            // carrito estaba abierto en otra pestaña.
            if (!producto || !producto.disponible) {
                throw errores.conflicto(
                    producto
                        ? `"${producto.nombre}" ya no está a la venta. Quitalo del carrito para continuar.`
                        : "Uno de los productos de tu carrito ya no existe. Actualizá la página.",
                    { producto_id: productoId, motivo: "no_disponible" }
                );
            }

            if (producto.stock === 0) {
                throw errores.conflicto(
                    `"${producto.nombre}" se quedó sin stock.`,
                    { producto_id: productoId, motivo: "sin_stock" }
                );
            }

            if (cantidad > producto.stock) {
                throw errores.conflicto(
                    `De "${producto.nombre}" quedan ${producto.stock} ` +
                    (producto.stock === 1 ? "unidad." : "unidades."),
                    { producto_id: productoId, motivo: "stock_insuficiente",
                      disponible: producto.stock }
                );
            }

            // El precio sale de acá, no del navegador.
            const precio = Number(producto.precio);
            const lineaSubtotal = Number((precio * cantidad).toFixed(2));

            subtotal += lineaSubtotal;

            items.push({
                producto_id: producto.id,
                nombre_producto: producto.nombre,
                sku_producto: producto.sku,
                precio_unitario: precio,
                cantidad,
                subtotal: lineaSubtotal
            });
        }

        subtotal = Number(subtotal.toFixed(2));


        // ---------- MEDIO DE PAGO ----------
        // Tiene que ser uno de los que esta tienda tiene activos.

        const { rows: medios } = await cliente.query(
            `SELECT tipo, nombre FROM medios_pago
             WHERE tenant_id = $1 AND activo`,
            [tenantId]
        );

        let metodoPago = null;

        if (cuerpo.metodo_pago) {
            const elegido = medios.find(m => m.tipo === cuerpo.metodo_pago);
            if (!elegido) {
                throw errores.solicitudInvalida(
                    "Ese medio de pago no está disponible en esta tienda"
                );
            }
            metodoPago = elegido.tipo;

        } else if (medios.length > 0) {
            throw errores.solicitudInvalida("Elegí cómo querés pagar");
        }


        // ---------- CLIENTE ----------

        const comprador = await clientes.buscarOCrear(cliente, tenantId, contacto);


        // ---------- PEDIDO ----------

        const { rows: siguiente } = await cliente.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 AS numero
             FROM pedidos WHERE tenant_id = $1`,
            [tenantId]
        );

        const numero = Number(siguiente[0].numero);

        // El envío y el descuento se calculan en cero: esta tienda
        // los acuerda por WhatsApp al confirmar. Las columnas ya
        // existen para cuando haga falta.
        const { rows: creado } = await cliente.query(
            `INSERT INTO pedidos
                 (tenant_id, cliente_id, numero, estado, metodo_pago,
                  subtotal, descuento, envio, total,
                  observaciones, datos_contacto)
             VALUES ($1, $2, $3, 'pendiente', $4, $5, 0, 0, $5, $6, $7)
             RETURNING id, numero, estado, total, created_at`,
            [tenantId, comprador.id, numero, metodoPago,
             subtotal, observaciones, JSON.stringify(contacto)]
        );

        const pedido = creado[0];


        for (const item of items) {
            await cliente.query(
                `INSERT INTO pedido_items
                     (tenant_id, pedido_id, producto_id, nombre_producto,
                      sku_producto, precio_unitario, cantidad, subtotal)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [tenantId, pedido.id, item.producto_id, item.nombre_producto,
                 item.sku_producto, item.precio_unitario, item.cantidad, item.subtotal]
            );
        }


        await cliente.query(
            `INSERT INTO pedido_historial (tenant_id, pedido_id, estado, nota)
             VALUES ($1, $2, 'pendiente', 'Pedido recibido desde la tienda')`,
            [tenantId, pedido.id]
        );


        logger.info("Pedido creado", {
            numero: pedido.numero,
            items: items.length,
            total: Number(pedido.total)
        });


        return {
            numero: pedido.numero,
            estado: pedido.estado,
            total: Number(pedido.total),
            creado_en: pedido.created_at,
            items: items.map(i => ({
                nombre: i.nombre_producto,
                cantidad: i.cantidad,
                precio_unitario: i.precio_unitario,
                subtotal: i.subtotal
            })),
            metodo_pago: metodoPago
                ? medios.find(m => m.tipo === metodoPago)?.nombre
                : null,
            cliente: {
                nombre: comprador.nombre,
                email: comprador.email,
                telefono: comprador.telefono
            }
        };
    });
}


module.exports = { crearPedido, MAX_LINEAS, MAX_UNIDADES };
