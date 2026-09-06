// =====================================================
// PIEZAS COMPARTIDAS DE LA TIENDA
//
// La tarjeta de producto, la de categoría y los estados de
// carga y vacío. Las usan la portada, el catálogo y el
// detalle, así que viven en un solo lugar: si cambia el
// diseño de una tarjeta, cambia en toda la tienda.
// =====================================================

window.EP = window.EP || {};

(function () {

    const { crear, icono, precio } = EP.tienda;


    // -------------------------------------------------
    // TARJETA DE PRODUCTO
    // -------------------------------------------------

    function tarjetaProducto(producto) {

        const cintas = [];

        if (producto.en_oferta) {
            const descuento = Math.round(
                (1 - producto.precio / producto.precio_anterior) * 100
            );
            cintas.push(crear("span", {
                clase: "cinta cinta--oferta",
                texto: descuento >= 5 ? `-${descuento}%` : "Oferta"
            }));
        }

        if (producto.novedad) {
            cintas.push(crear("span", { clase: "cinta cinta--novedad", texto: "Nuevo" }));
        }

        if (!producto.hay_stock) {
            cintas.push(crear("span", { clase: "cinta cinta--sin-stock", texto: "Sin stock" }));
        }


        return crear("a", {
            clase: "producto",
            href: `/producto/${producto.slug}`
        }, [

            crear("div", { clase: "producto__marco" }, [

                producto.imagen_url
                    ? crear("img", {
                        clase: "producto__imagen",
                        src: producto.imagen_url,
                        alt: producto.nombre,
                        loading: "lazy"
                      })
                    : crear("div", { clase: "producto__sin-imagen" }, [icono("imagen")]),

                cintas.length > 0 && crear("div", { clase: "producto__cintas" }, cintas)
            ]),

            crear("div", { clase: "producto__cuerpo" }, [

                producto.categoria && crear("span", {
                    clase: "producto__categoria",
                    texto: producto.categoria.nombre
                }),

                crear("h3", { clase: "producto__nombre", texto: producto.nombre }),

                crear("div", { clase: "producto__precios" }, [
                    crear("span", { clase: "producto__precio", texto: precio(producto.precio) }),
                    producto.en_oferta && crear("span", {
                        clase: "producto__precio-anterior",
                        texto: precio(producto.precio_anterior)
                    })
                ])
            ])
        ]);
    }


    // -------------------------------------------------
    // TARJETA DE CATEGORIA
    // -------------------------------------------------

    function tarjetaCategoria(categoria) {

        return crear("a", {
            clase: "categoria",
            href: `/catalogo?categoria=${encodeURIComponent(categoria.slug)}`
        }, [

            categoria.imagen_url && crear("img", {
                clase: "categoria__fondo",
                src: categoria.imagen_url,
                alt: "",
                loading: "lazy"
            }),

            categoria.imagen_url && crear("div", { clase: "categoria__velo" }),

            crear("div", { clase: "categoria__texto" }, [
                crear("span", { clase: "categoria__nombre", texto: categoria.nombre }),
                crear("span", {
                    clase: "categoria__cantidad",
                    texto: categoria.productos === 1
                        ? "1 producto"
                        : `${categoria.productos} productos`
                })
            ])
        ]);
    }


    // -------------------------------------------------
    // ESTADOS
    // -------------------------------------------------

    // Mientras carga se muestran huecos del tamaño real de las
    // tarjetas: la página no salta cuando llegan los datos.
    function esqueletoProductos(cantidad = 8) {
        return crear("div", { clase: "grilla-productos" },
            Array.from({ length: cantidad }, () =>
                crear("div", { clase: "hueso hueso--producto" })
            )
        );
    }


    function vacio({ titulo, texto, accion }) {
        return crear("div", { clase: "vacio-tienda" }, [
            icono("caja"),
            crear("h3", { texto: titulo }),
            texto && crear("p", { texto }),
            accion
        ]);
    }


    function error(mensaje) {
        return vacio({
            titulo: "No pudimos cargar esta sección",
            texto: mensaje
        });
    }


    EP.piezas = {
        tarjetaProducto,
        tarjetaCategoria,
        esqueletoProductos,
        vacio,
        error
    };

})();
