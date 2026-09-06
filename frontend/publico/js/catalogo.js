// =====================================================
// TIENDA · CATALOGO
//
// Los filtros viven en la URL, no en una variable: así el
// cliente puede compartir "las biblias en oferta" por
// WhatsApp, el botón atrás funciona, y recargar no pierde
// lo que estaba mirando.
// =====================================================

(function () {

    const { crear, reemplazar, icono } = EP.tienda;

    const principal = document.querySelector("main");

    let categorias = [];
    let config = null;


    // -------------------------------------------------
    // ESTADO EN LA URL
    // -------------------------------------------------

    function leerFiltros() {
        const q = new URLSearchParams(location.search);
        return {
            categoria: q.get("categoria") || "",
            buscar: q.get("buscar") || "",
            destacados: q.get("destacados") === "true",
            novedades: q.get("novedades") === "true",
            pagina: Math.max(1, Number(q.get("pagina")) || 1)
        };
    }


    function escribirFiltros(cambios, { reemplazarHistorial = false } = {}) {

        const filtros = { ...leerFiltros(), ...cambios };

        // Cambiar cualquier filtro vuelve a la primera página.
        if (!("pagina" in cambios)) filtros.pagina = 1;

        const q = new URLSearchParams();
        if (filtros.categoria) q.set("categoria", filtros.categoria);
        if (filtros.buscar) q.set("buscar", filtros.buscar);
        if (filtros.destacados) q.set("destacados", "true");
        if (filtros.novedades) q.set("novedades", "true");
        if (filtros.pagina > 1) q.set("pagina", filtros.pagina);

        const url = q.toString() ? `/catalogo?${q}` : "/catalogo";

        if (reemplazarHistorial) history.replaceState(null, "", url);
        else history.pushState(null, "", url);

        dibujar();
    }


    // -------------------------------------------------
    // FILTROS
    // -------------------------------------------------

    function panelFiltros(filtros) {

        const opcion = (texto, cantidad, activo, alElegir) =>
            crear("button", {
                clase: "filtro-enlace",
                type: "button",
                "aria-current": activo ? "true" : null,
                onClick: alElegir
            }, [
                crear("span", { texto }),
                cantidad !== null && crear("span", {
                    clase: "filtro-enlace__cantidad",
                    texto: String(cantidad)
                })
            ]);


        const conProductos = categorias.filter(c => c.productos > 0);

        return crear("aside", { clase: "filtros-tienda", id: "filtros" }, [

            conProductos.length > 0 && crear("div", { clase: "filtros-tienda__grupo" }, [
                crear("p", { clase: "filtros-tienda__titulo", texto: "Categorías" }),
                opcion("Todas", null, !filtros.categoria,
                    () => escribirFiltros({ categoria: "" })),
                ...conProductos.map(categoria =>
                    opcion(categoria.nombre, categoria.productos,
                        filtros.categoria === categoria.slug,
                        () => escribirFiltros({ categoria: categoria.slug }))
                )
            ]),

            crear("div", { clase: "filtros-tienda__grupo" }, [
                crear("p", { clase: "filtros-tienda__titulo", texto: "Mostrar" }),
                opcion("Todo", null, !filtros.destacados && !filtros.novedades,
                    () => escribirFiltros({ destacados: false, novedades: false })),
                opcion("Destacados", null, filtros.destacados,
                    () => escribirFiltros({ destacados: true, novedades: false })),
                opcion("Novedades", null, filtros.novedades,
                    () => escribirFiltros({ destacados: false, novedades: true }))
            ])
        ]);
    }


    // -------------------------------------------------
    // RESULTADOS
    // -------------------------------------------------

    function paginacion(meta) {

        if (meta.paginas <= 1) return null;

        const ir = (pagina) => {
            escribirFiltros({ pagina });
            window.scrollTo({ top: 0, behavior: "smooth" });
        };

        return crear("div", { clase: "paginas-tienda" }, [
            crear("button", {
                clase: "ep-boton ep-boton--secundario",
                type: "button",
                texto: "Anterior",
                disabled: meta.pagina <= 1,
                onClick: () => ir(meta.pagina - 1)
            }),
            crear("span", {
                clase: "paginas-tienda__info",
                texto: `${meta.pagina} de ${meta.paginas}`
            }),
            crear("button", {
                clase: "ep-boton ep-boton--secundario",
                type: "button",
                texto: "Siguiente",
                disabled: meta.pagina >= meta.paginas,
                onClick: () => ir(meta.pagina + 1)
            })
        ]);
    }


    async function cargarResultados(filtros, contenedor, cuenta) {

        reemplazar(contenedor, EP.piezas.esqueletoProductos());

        const q = new URLSearchParams({ pagina: filtros.pagina, por_pagina: 24 });
        if (filtros.categoria) q.set("categoria", filtros.categoria);
        if (filtros.buscar) q.set("buscar", filtros.buscar);
        if (filtros.destacados) q.set("destacados", "true");
        if (filtros.novedades) q.set("novedades", "true");

        try {

            const productos = await EP.api.get(`/api/public/productos?${q}`,
                                               { redirigirEn401: false });
            const meta = productos.meta;

            cuenta.textContent = meta.total === 1
                ? "1 producto"
                : `${meta.total} productos`;

            if (productos.length === 0) {
                reemplazar(contenedor, EP.piezas.vacio({
                    titulo: filtros.buscar
                        ? `No encontramos nada para "${filtros.buscar}"`
                        : "No hay productos en esta selección",
                    texto: "Probá con otras palabras o mirá todo el catálogo.",
                    accion: crear("button", {
                        clase: "ep-boton ep-boton--primario",
                        type: "button",
                        texto: "Ver todo el catálogo",
                        onClick: () => escribirFiltros({
                            categoria: "", buscar: "", destacados: false, novedades: false
                        })
                    })
                }));
                return;
            }

            reemplazar(contenedor, [
                crear("div", { clase: "grilla-productos" },
                    productos.map(EP.piezas.tarjetaProducto)),
                paginacion(meta)
            ]);

        } catch (error) {
            cuenta.textContent = "";
            reemplazar(contenedor, EP.piezas.error(error.message));
        }
    }


    // -------------------------------------------------
    // DIBUJO
    // -------------------------------------------------

    function dibujar() {

        const filtros = leerFiltros();

        const cuenta = crear("span", { clase: "catalogo__cuenta" });
        const resultados = crear("div", {});

        const buscador = crear("input", {
            type: "search",
            value: filtros.buscar,
            placeholder: "Buscar en el catálogo…",
            "aria-label": "Buscar productos"
        });

        // Se espera a que deje de escribir para no consultar en
        // cada tecla ni llenar el historial de entradas.
        let temporizador;
        buscador.addEventListener("input", () => {
            clearTimeout(temporizador);
            temporizador = setTimeout(() => {
                escribirFiltros({ buscar: buscador.value.trim() },
                                { reemplazarHistorial: true });
            }, 400);
        });


        const panel = panelFiltros(filtros);


        reemplazar(principal, crear("div", { clase: "contenedor" }, [

            crear("div", { clase: "catalogo" }, [

                panel,

                crear("div", {}, [

                    crear("div", { clase: "catalogo__barra" }, [
                        crear("div", { clase: "buscador-tienda" }, [
                            icono("buscar"),
                            buscador
                        ]),
                        crear("button", {
                            clase: "ep-boton ep-boton--secundario abrir-filtros",
                            type: "button",
                            texto: "Filtros",
                            onClick: () => panel.scrollIntoView({ behavior: "smooth" })
                        }),
                        cuenta
                    ]),

                    resultados
                ])
            ])
        ]));

        // El cursor vuelve al buscador si venía escribiendo.
        if (filtros.buscar) {
            buscador.focus();
            buscador.setSelectionRange(buscador.value.length, buscador.value.length);
        }

        cargarResultados(filtros, resultados, cuenta);

        const categoria = categorias.find(c => c.slug === filtros.categoria);

        EP.tienda.aplicarSeo(config, {
            titulo: categoria ? categoria.nombre : "Catálogo"
        });
    }


    // -------------------------------------------------
    // ARRANQUE
    // -------------------------------------------------

    (async () => {

        config = await EP.tienda.iniciar({ seccion: "catalogo" });

        if (!config.modulos.catalogo) {
            reemplazar(principal, crear("div", { clase: "contenedor" }, [
                EP.piezas.vacio({
                    titulo: "El catálogo no está disponible",
                    texto: "Esta tienda todavía no tiene su catálogo publicado."
                })
            ]));
            return;
        }

        categorias = await EP.api.get("/api/public/categorias",
                                      { redirigirEn401: false }).catch(() => []);

        dibujar();

        // El botón atrás del navegador tiene que funcionar.
        window.addEventListener("popstate", dibujar);

    })();

})();
