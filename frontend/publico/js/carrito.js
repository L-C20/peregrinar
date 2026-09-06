// =====================================================
// CARRITO
//
// Vive en el navegador de quien compra (localStorage), no
// en el servidor: no hace falta que se registre para juntar
// productos, y si cierra la pestaña no pierde lo que eligió.
//
// Guarda el precio SOLO para mostrarlo. Al confirmar el
// pedido se manda qué producto y cuántas unidades, y el
// servidor vuelve a leer los precios de la base. Si alguien
// edita el localStorage, no compra más barato.
//
// La clave incluye el identificador de la tienda: dos
// tiendas distintas en el mismo navegador no se mezclan.
// =====================================================

window.EP = window.EP || {};

(function () {

    const MAX_UNIDADES = 999;

    let clave = "ep_carrito";
    let items = [];

    const oyentes = new Set();


    function leer() {
        try {
            const guardado = JSON.parse(localStorage.getItem(clave) || "[]");
            return Array.isArray(guardado) ? guardado.filter(esValido) : [];
        } catch {
            return [];
        }
    }


    function esValido(item) {
        return item
            && typeof item.producto_id === "string"
            && Number.isFinite(Number(item.cantidad))
            && Number(item.cantidad) > 0;
    }


    function guardar() {
        try {
            localStorage.setItem(clave, JSON.stringify(items));
        } catch {
            // Modo privado o almacenamiento lleno: el carrito sigue
            // funcionando en esta pestaña, solo no sobrevive al cierre.
        }
        for (const oyente of oyentes) oyente(items);
    }


    // -------------------------------------------------
    // API
    // -------------------------------------------------

    const carrito = {

        // La llama tienda.js cuando ya sabe de qué tienda se trata.
        preparar(slugTienda) {
            clave = `ep_carrito_${slugTienda}`;
            items = leer();
            for (const oyente of oyentes) oyente(items);
        },

        items: () => items.slice(),

        cantidad: () => items.reduce((suma, i) => suma + i.cantidad, 0),

        total: () => Number(
            items.reduce((suma, i) => suma + i.precio * i.cantidad, 0).toFixed(2)
        ),

        vacio: () => items.length === 0,

        tiene: (productoId) => items.some(i => i.producto_id === productoId),


        agregar(producto, cantidad = 1) {

            const existente = items.find(i => i.producto_id === producto.id);

            if (existente) {
                existente.cantidad = Math.min(MAX_UNIDADES, existente.cantidad + cantidad);

            } else {
                items.push({
                    producto_id: producto.id,
                    slug: producto.slug,
                    nombre: producto.nombre,
                    // Solo para mostrar: el servidor lo recalcula.
                    precio: Number(producto.precio),
                    imagen_url: producto.imagen_url || null,
                    cantidad: Math.min(MAX_UNIDADES, Math.max(1, cantidad))
                });
            }

            guardar();
            return items;
        },


        cambiar(productoId, cantidad) {

            const item = items.find(i => i.producto_id === productoId);
            if (!item) return items;

            const nueva = Math.max(0, Math.min(MAX_UNIDADES, Math.trunc(cantidad)));

            if (nueva === 0) return carrito.quitar(productoId);

            item.cantidad = nueva;
            guardar();
            return items;
        },


        quitar(productoId) {
            items = items.filter(i => i.producto_id !== productoId);
            guardar();
            return items;
        },


        vaciar() {
            items = [];
            guardar();
        },


        // Lo que se le manda al servidor: nada de precios.
        paraEnviar: () => items.map(i => ({
            producto_id: i.producto_id,
            cantidad: i.cantidad
        })),


        alCambiar(oyente) {
            oyentes.add(oyente);
            oyente(items);
            return () => oyentes.delete(oyente);
        }
    };


    // Si el mismo carrito se toca en otra pestaña, esta se entera.
    window.addEventListener("storage", (evento) => {
        if (evento.key !== clave) return;
        items = leer();
        for (const oyente of oyentes) oyente(items);
    });


    EP.carrito = carrito;

})();
