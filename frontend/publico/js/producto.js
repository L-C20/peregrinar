// =====================================================
// TIENDA · DETALLE DE PRODUCTO
//
// El slug sale de la URL: /producto/biblia-de-estudio
//
// Todavía no hay carrito (llega en la Etapa 10). Mientras
// tanto el botón principal es consultar por WhatsApp con el
// producto ya escrito en el mensaje, que es como se compra
// hoy en la práctica. Cuando exista el carrito, este botón
// pasa a ser el secundario.
// =====================================================

(function () {

    const { crear, reemplazar, icono, precio } = EP.tienda;

    const principal = document.querySelector("main");


    function slugDeLaUrl() {
        const partes = location.pathname.split("/").filter(Boolean);
        return decodeURIComponent(partes[partes.length - 1] || "");
    }


    // -------------------------------------------------
    // GALERIA
    // -------------------------------------------------

    function galeria(producto) {

        const imagenes = producto.imagenes?.length
            ? producto.imagenes
            : (producto.imagen_url ? [{ id: "principal", url: producto.imagen_url }] : []);

        if (imagenes.length === 0) {
            return crear("div", { clase: "galeria" }, [
                crear("div", { clase: "galeria__principal" }, [
                    crear("div", { clase: "producto__sin-imagen" }, [icono("imagen")])
                ])
            ]);
        }

        const grande = crear("img", {
            src: imagenes[0].url,
            alt: producto.nombre
        });

        const tiras = imagenes.map((imagen, indice) =>
            crear("button", {
                clase: "galeria__tira",
                type: "button",
                "aria-current": indice === 0 ? "true" : "false",
                "aria-label": `Ver imagen ${indice + 1}`,
                onClick: (evento) => {
                    grande.src = imagen.url;
                    for (const otra of evento.currentTarget.parentElement.children) {
                        otra.setAttribute("aria-current", "false");
                    }
                    evento.currentTarget.setAttribute("aria-current", "true");
                }
            }, [crear("img", { src: imagen.url, alt: "", loading: "lazy" })])
        );

        return crear("div", { clase: "galeria" }, [
            crear("div", { clase: "galeria__principal" }, [grande]),
            imagenes.length > 1 && crear("div", { clase: "galeria__tiras" }, tiras)
        ]);
    }


    // -------------------------------------------------
    // CONSULTA POR WHATSAPP
    // -------------------------------------------------

    function botonWhatsapp(config, producto) {

        const numero = String(config.contacto?.whatsapp || "").replace(/\D/g, "");

        if (!numero) return null;

        const mensaje = `¡Hola! Me interesa "${producto.nombre}" ` +
                        `(${precio(producto.precio)}). ¿Está disponible?`;

        return crear("a", {
            clase: "ep-boton ep-boton--primario",
            href: `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`,
            target: "_blank",
            rel: "noopener noreferrer"
        }, [icono("whatsapp"), crear("span", { texto: "Consultar por WhatsApp" })]);
    }


    // -------------------------------------------------
    // ARRANQUE
    // -------------------------------------------------

    (async () => {

        const config = await EP.tienda.iniciar({ seccion: "catalogo" });

        reemplazar(principal, crear("div", { clase: "contenedor" }, [
            crear("div", { clase: "cargando-tienda" }, [
                crear("div", { clase: "hueso", estilo: "height:22px;max-width:280px;margin:0 auto" })
            ])
        ]));


        let datos;

        try {
            datos = await EP.api.get(
                `/api/public/productos/${encodeURIComponent(slugDeLaUrl())}`,
                { redirigirEn401: false }
            );

        } catch (error) {

            reemplazar(principal, crear("div", { clase: "contenedor" }, [
                EP.piezas.vacio({
                    titulo: error.estado === 404
                        ? "No encontramos ese producto"
                        : "No pudimos cargar el producto",
                    texto: error.estado === 404
                        ? "Puede que ya no esté a la venta."
                        : error.message,
                    accion: crear("a", {
                        clase: "ep-boton ep-boton--primario",
                        href: "/catalogo",
                        texto: "Ver el catálogo"
                    })
                })
            ]));
            return;
        }


        const producto = datos.producto;

        EP.tienda.aplicarSeo(config, {
            titulo: producto.nombre,
            descripcion: producto.descripcion
        });


        const ficha = [
            producto.categoria && ["Categoría", producto.categoria.nombre],
            producto.sku && ["Código", producto.sku],
            ["Disponibilidad", producto.hay_stock ? "En stock" : "Sin stock por ahora"]
        ].filter(Boolean);


        reemplazar(principal, crear("div", { clase: "contenedor" }, [

            crear("nav", { clase: "miga", "aria-label": "Dónde estás" }, [
                crear("a", { href: "/", texto: "Inicio" }),
                crear("span", { texto: "/" }),
                crear("a", { href: "/catalogo", texto: "Catálogo" }),
                producto.categoria && crear("span", { texto: "/" }),
                producto.categoria && crear("a", {
                    href: `/catalogo?categoria=${encodeURIComponent(producto.categoria.slug)}`,
                    texto: producto.categoria.nombre
                })
            ]),

            crear("div", { clase: "detalle" }, [

                galeria(producto),

                crear("div", {}, [

                    producto.categoria && crear("span", {
                        clase: "producto__categoria",
                        texto: producto.categoria.nombre
                    }),

                    crear("h1", { clase: "detalle__titulo", texto: producto.nombre }),

                    crear("div", { clase: "detalle__precios" }, [
                        crear("span", { clase: "detalle__precio", texto: precio(producto.precio) }),
                        producto.en_oferta && crear("span", {
                            clase: "detalle__precio-anterior",
                            texto: precio(producto.precio_anterior)
                        })
                    ]),

                    !producto.hay_stock && crear("p", {
                        clase: "cinta cinta--sin-stock",
                        estilo: "display:inline-block;margin-bottom:16px",
                        texto: "Sin stock por ahora"
                    }),

                    producto.descripcion && crear("div", {
                        clase: "detalle__descripcion",
                        texto: producto.descripcion
                    }),

                    crear("div", { clase: "detalle__acciones" }, [
                        botonWhatsapp(config, producto),
                        crear("a", {
                            clase: "ep-boton ep-boton--secundario",
                            href: "/contacto",
                            texto: "Otras formas de contacto"
                        })
                    ]),

                    crear("div", { clase: "ficha" },
                        ficha.map(([clave, valor]) => crear("div", { clase: "ficha__linea" }, [
                            crear("span", { clase: "ficha__clave", texto: clave }),
                            crear("span", { texto: valor })
                        ]))
                    )
                ])
            ])
        ]));


        // ---------- RELACIONADOS ----------

        if (datos.relacionados.length > 0) {
            principal.append(crear("section", { clase: "seccion seccion--tenue" }, [
                crear("div", { clase: "contenedor" }, [
                    crear("div", { clase: "seccion__cabecera" }, [
                        crear("h2", { clase: "seccion__titulo", texto: "También te puede interesar" })
                    ]),
                    crear("div", { clase: "grilla-productos" },
                        datos.relacionados.map(EP.piezas.tarjetaProducto))
                ])
            ]));
        }

    })();

})();
