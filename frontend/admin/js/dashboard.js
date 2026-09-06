// =====================================================
// PANEL · INICIO
//
// Numeros de la tienda y dos listas cortas que sirven para
// hacer algo, no solo para mirar: lo ultimo que se cargo y
// lo que esta publicado sin unidades.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const panel = document.getElementById("panel");
    const saludo = document.getElementById("saludo");


    function metrica(etiqueta, valor, nota, esAviso = false) {
        return crear("div", { clase: "metrica" }, [
            crear("span", { clase: "metrica__etiqueta", texto: etiqueta }),
            crear("div", { clase: "metrica__valor", texto: valor }),
            nota && crear("div", {
                clase: "metrica__nota" + (esAviso ? " metrica__nota--aviso" : ""),
                texto: nota
            })
        ]);
    }


    // -------------------------------------------------
    // MINIATURA
    // -------------------------------------------------

    function miniatura(producto) {
        return producto.imagen_url
            ? crear("img", {
                clase: "miniatura",
                src: producto.imagen_url,
                alt: "",
                loading: "lazy"
              })
            : crear("div", { clase: "miniatura miniatura--vacia" }, [icono("imagen")]);
    }


    function listaProductos(productos, columnaExtra) {

        return crear("div", { clase: "tabla-scroll" }, [
            crear("table", { clase: "tabla" }, [
                crear("tbody", {}, productos.map(producto =>
                    crear("tr", {}, [
                        crear("td", {}, [
                            crear("div", { clase: "celda-producto" }, [
                                miniatura(producto),
                                crear("div", {}, [
                                    crear("div", {
                                        clase: "celda-producto__nombre",
                                        texto: producto.nombre
                                    }),
                                    crear("div", {
                                        clase: "celda-producto__meta",
                                        texto: producto.categoria
                                            ? producto.categoria.nombre
                                            : "Sin categoría"
                                    })
                                ])
                            ])
                        ]),
                        crear("td", { clase: "tabla__acciones" }, [columnaExtra(producto)])
                    ])
                ))
            ])
        ]);
    }


    function tarjeta(titulo, cuerpo, accion) {
        return crear("section", { clase: "tarjeta" }, [
            crear("div", { clase: "tarjeta__encabezado" }, [
                crear("h3", { clase: "tarjeta__titulo", texto: titulo }),
                accion && crear("div", { estilo: "margin-left:auto" }, [accion])
            ]),
            cuerpo
        ]);
    }


    function vacio(mensaje) {
        return crear("div", { clase: "vacio" }, [
            crear("p", { clase: "vacio__texto", texto: mensaje })
        ]);
    }


    // -------------------------------------------------
    // ARRANQUE
    // -------------------------------------------------

    (async () => {

        const sesion = await EP.admin.iniciar();

        saludo.textContent = `Hola, ${sesion.usuario.nombre.split(" ")[0]}`;

        let datos;

        try {
            datos = await EP.api.get("/api/admin/resumen");

        } catch (error) {
            reemplazar(panel, crear("div", { clase: "tarjeta" }, [
                crear("div", { clase: "vacio" }, [
                    crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                    crear("h3", { clase: "vacio__titulo", texto: "No pudimos cargar el resumen" }),
                    crear("p", { clase: "vacio__texto", texto: error.message })
                ])
            ]));
            return;
        }

        const c = datos.contadores;

        const bloques = [];


        // ---------- METRICAS ----------

        bloques.push(crear("div", { clase: "metricas" }, [

            metrica("Productos", EP.fmt.numero(c.productos),
                c.productos === 0
                    ? "Todavía no cargaste ninguno"
                    : `${EP.fmt.numero(c.productos_publicados)} a la venta`),

            metrica("Categorías", EP.fmt.numero(c.categorias),
                c.categorias === 0 ? "Sin categorías" : null),

            metrica("Pedidos", EP.fmt.numero(c.pedidos),
                c.pedidos_pendientes > 0
                    ? `${c.pedidos_pendientes} sin confirmar`
                    : "Ninguno pendiente",
                c.pedidos_pendientes > 0),

            metrica("Ventas del mes", EP.fmt.precio(c.ventas_mes), "Últimos 30 días"),

            metrica("Clientes", EP.fmt.numero(c.clientes),
                c.clientes === 0 ? "Todavía nadie compró" : null)
        ]));


        // ---------- SIN STOCK ----------
        // Primero, porque es lo unico que pide una accion hoy.

        if (datos.sin_stock.length > 0) {
            bloques.push(crear("div", { estilo: "margin-bottom:22px" }, [
                tarjeta(
                    `${c.sin_stock} ${c.sin_stock === 1 ? "producto publicado sin stock" : "productos publicados sin stock"}`,
                    listaProductos(datos.sin_stock, producto =>
                        crear("a", {
                            clase: "boton boton--suave boton--chico",
                            href: `productos.html?editar=${producto.id}`,
                            texto: "Cargar stock"
                        })
                    ),
                    crear("span", {
                        clase: "etiqueta etiqueta--aviso etiqueta--sin-punto",
                        texto: "Se muestran en la tienda"
                    })
                )
            ]));
        }


        // ---------- ULTIMOS PRODUCTOS ----------

        bloques.push(tarjeta(
            "Últimos productos cargados",
            datos.productos_recientes.length === 0
                ? crear("div", { clase: "vacio" }, [
                    crear("div", { clase: "vacio__icono" }, [icono("productos")]),
                    crear("h3", { clase: "vacio__titulo", texto: "Tu catálogo está vacío" }),
                    crear("p", {
                        clase: "vacio__texto",
                        texto: "Cargá tu primer producto y va a aparecer en la tienda enseguida."
                    }),
                    crear("a", {
                        clase: "boton boton--primario",
                        href: "productos.html?nuevo=1",
                        texto: "Cargar un producto"
                    })
                  ])
                : listaProductos(datos.productos_recientes, producto =>
                    crear("div", { estilo: "display:flex;gap:8px;align-items:center;justify-content:flex-end" }, [
                        crear("span", {
                            clase: "etiqueta " + (producto.disponible ? "etiqueta--activo" : "etiqueta--inactivo"),
                            texto: producto.disponible ? "A la venta" : "Oculto"
                        }),
                        crear("span", { clase: "precio", texto: EP.fmt.precio(producto.precio) }),
                        crear("a", {
                            clase: "boton boton--fantasma",
                            href: `productos.html?editar=${producto.id}`,
                            "aria-label": `Editar ${producto.nombre}`
                        }, [icono("lapiz")])
                    ])
                  ),
            datos.productos_recientes.length > 0 &&
                crear("a", {
                    clase: "boton boton--suave boton--chico",
                    href: "productos.html",
                    texto: "Ver todos"
                })
        ));


        reemplazar(panel, bloques);

    })();

})();
