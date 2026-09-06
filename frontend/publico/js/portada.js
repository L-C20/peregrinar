// =====================================================
// TIENDA · PORTADA
//
// Bienvenida con los textos que el cliente cargó en su
// apariencia, categorías, destacados y novedades.
//
// Cada bloque se dibuja solo si tiene contenido: una tienda
// recién creada no muestra secciones vacías.
// =====================================================

(function () {

    const { crear, reemplazar, icono } = EP.tienda;

    const principal = document.querySelector("main");


    function seccion({ titulo, descripcion, enlace, contenido, tenue }) {
        return crear("section", { clase: "seccion" + (tenue ? " seccion--tenue" : "") }, [
            crear("div", { clase: "contenedor" }, [
                crear("div", { clase: "seccion__cabecera" }, [
                    crear("div", {}, [
                        crear("h2", { clase: "seccion__titulo", texto: titulo }),
                        descripcion && crear("p", {
                            clase: "seccion__descripcion", texto: descripcion
                        })
                    ]),
                    enlace && crear("a", {
                        clase: "seccion__enlace",
                        href: enlace.url,
                        texto: enlace.texto
                    })
                ]),
                contenido
            ])
        ]);
    }


    (async () => {

        const config = await EP.tienda.iniciar({ seccion: "inicio" });

        const textos = config.apariencia?.textos || {};


        // ---------- BIENVENIDA ----------

        const portada = crear("section", { clase: "portada" }, [
            crear("div", { clase: "contenedor" }, [
                crear("div", { clase: "portada__texto" }, [

                    crear("h1", {
                        clase: "portada__titulo",
                        texto: textos.bienvenida || config.tienda.nombre
                    }),

                    (textos.subtitulo || config.tienda.descripcion) && crear("p", {
                        clase: "portada__subtitulo",
                        texto: textos.subtitulo || config.tienda.descripcion
                    }),

                    crear("div", { clase: "portada__acciones" }, [
                        config.modulos.catalogo && crear("a", {
                            clase: "ep-boton ep-boton--primario",
                            href: "/catalogo",
                            texto: textos.boton_principal || "Ver catálogo"
                        }),
                        crear("a", {
                            clase: "ep-boton ep-boton--secundario",
                            href: "/contacto",
                            texto: "Contactanos"
                        })
                    ])
                ])
            ])
        ]);

        reemplazar(principal, portada);


        if (!config.modulos.catalogo) return;


        // ---------- CATEGORIAS, DESTACADOS Y NOVEDADES ----------
        // Los tres pedidos salen juntos: son independientes y así
        // la portada termina de armarse en un solo viaje.

        const [categorias, destacados, novedades] = await Promise.all([
            EP.api.get("/api/public/categorias").catch(() => []),
            EP.api.get("/api/public/productos?destacados=true&por_pagina=8").catch(() => []),
            EP.api.get("/api/public/productos?novedades=true&por_pagina=4").catch(() => [])
        ]);


        // Sin categorías con productos no vale la pena la sección.
        const conProductos = categorias.filter(c => c.productos > 0);

        if (conProductos.length > 0) {
            principal.append(seccion({
                titulo: "Categorías",
                descripcion: "Encontrá lo que buscás",
                contenido: crear("div", { clase: "grilla-categorias" },
                    conProductos.map(EP.piezas.tarjetaCategoria))
            }));
        }


        if (destacados.length > 0) {
            principal.append(seccion({
                titulo: "Destacados",
                enlace: { url: "/catalogo?destacados=true", texto: "Ver todos →" },
                tenue: true,
                contenido: crear("div", { clase: "grilla-productos" },
                    destacados.map(EP.piezas.tarjetaProducto))
            }));
        }


        if (novedades.length > 0) {
            principal.append(seccion({
                titulo: "Novedades",
                descripcion: "Lo último que llegó",
                enlace: { url: "/catalogo?novedades=true", texto: "Ver todas →" },
                contenido: crear("div", { clase: "grilla-productos" },
                    novedades.map(EP.piezas.tarjetaProducto))
            }));
        }


        // Tienda sin nada cargado todavía.
        if (conProductos.length === 0 && destacados.length === 0 && novedades.length === 0) {
            principal.append(crear("div", { clase: "contenedor" }, [
                EP.piezas.vacio({
                    titulo: "Todavía no hay productos publicados",
                    texto: "Estamos preparando el catálogo. Volvé en unos días."
                })
            ]));
        }

    })();

})();
