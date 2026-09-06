// =====================================================
// TIENDA · PAGINAS DE CONTENIDO
//
// Un solo archivo para las tres pantallas que solo muestran
// lo que el cliente cargó desde el panel: las páginas de
// texto, las preguntas frecuentes y el contacto.
//
// Cuál dibujar se decide con data-pagina en el <body>.
// =====================================================

(function () {

    const { crear, reemplazar, icono } = EP.tienda;

    const principal = document.querySelector("main");


    function marco(titulo, subtitulo, cuerpo) {
        return crear("div", { clase: "contenido-pagina" }, [
            crear("h1", { clase: "contenido-pagina__titulo", texto: titulo }),
            subtitulo && crear("p", { clase: "contenido-pagina__subtitulo", texto: subtitulo }),
            cuerpo
        ]);
    }


    // =================================================
    // PAGINA DE TEXTO  ·  /p/:clave
    // =================================================

    async function paginaDeTexto(config) {

        const clave = decodeURIComponent(
            location.pathname.split("/").filter(Boolean).pop() || ""
        );

        let pagina;

        try {
            pagina = await EP.api.get(`/api/public/paginas/${encodeURIComponent(clave)}`,
                                      { redirigirEn401: false });

        } catch (error) {
            reemplazar(principal, crear("div", { clase: "contenedor" }, [
                EP.piezas.vacio({
                    titulo: error.estado === 404 ? "Esta página no existe" : "No pudimos cargarla",
                    texto: error.estado === 404
                        ? "Puede que el enlace esté mal escrito."
                        : error.message,
                    accion: crear("a", {
                        clase: "ep-boton ep-boton--primario", href: "/", texto: "Ir al inicio"
                    })
                })
            ]));
            return;
        }

        EP.tienda.aplicarSeo(config, { titulo: pagina.titulo });

        // El contenido es HTML simple escrito desde el panel por el
        // dueño de la tienda: es contenido propio, no de terceros.
        const cuerpo = crear("div", { clase: "texto-rico" });
        cuerpo.innerHTML = pagina.contenido || "";

        reemplazar(principal, marco(pagina.titulo, pagina.subtitulo, crear("div", {}, [
            pagina.imagen_url && crear("img", {
                src: pagina.imagen_url,
                alt: "",
                estilo: "width:100%;border-radius:var(--radio-tarjeta);margin-bottom:32px"
            }),
            cuerpo
        ])));
    }


    // =================================================
    // PREGUNTAS FRECUENTES
    // =================================================

    async function preguntas(config) {

        EP.tienda.aplicarSeo(config, { titulo: "Preguntas frecuentes" });

        let lista;

        try {
            lista = await EP.api.get("/api/public/faq", { redirigirEn401: false });
        } catch (error) {
            reemplazar(principal, EP.piezas.error(error.message));
            return;
        }

        if (lista.length === 0) {
            reemplazar(principal, marco(
                "Preguntas frecuentes", null,
                EP.piezas.vacio({
                    titulo: "Todavía no cargamos preguntas",
                    texto: "Si tenés una duda, escribinos y te respondemos.",
                    accion: crear("a", {
                        clase: "ep-boton ep-boton--primario",
                        href: "/contacto", texto: "Contactanos"
                    })
                })
            ));
            return;
        }

        reemplazar(principal, marco(
            "Preguntas frecuentes",
            "Lo que más nos consultan.",
            crear("div", {}, lista.map((item, indice) =>
                crear("details", { clase: "pregunta", open: indice === 0 }, [
                    crear("summary", { texto: item.pregunta }),
                    crear("div", { clase: "pregunta__respuesta", texto: item.respuesta })
                ])
            ))
        ));
    }


    // =================================================
    // CONTACTO
    // =================================================

    function contacto(config) {

        EP.tienda.aplicarSeo(config, { titulo: "Contacto" });

        const c = config.contacto || {};

        const whatsapp = String(c.whatsapp || "").replace(/\D/g, "");

        const datos = [
            c.telefono && ["telefono", "Teléfono", c.telefono, `tel:${c.telefono}`],
            // El número se guarda en dígitos porque así lo pide wa.me.
            // Mostrarlo crudo queda feo y no hay un formato que sirva
            // para todos los países, así que se muestra la acción.
            whatsapp && ["whatsapp", "WhatsApp", "Escribinos por WhatsApp",
                         `https://wa.me/${whatsapp}`],
            c.email && ["correo", "Email", c.email, `mailto:${c.email}`],
            c.direccion && ["lugar", "Dónde estamos",
                [c.direccion, c.ciudad, c.provincia].filter(Boolean).join(", "), null],
            c.horarios && ["reloj", "Horarios", c.horarios, null]
        ].filter(Boolean);


        const columnaDatos = datos.length > 0
            ? crear("div", {}, datos.map(([nombreIcono, clave, valor, enlace]) =>
                crear("div", { clase: "dato-contacto" }, [
                    icono(nombreIcono),
                    crear("div", {}, [
                        crear("div", { clase: "dato-contacto__clave", texto: clave }),
                        crear("div", { clase: "dato-contacto__valor" }, [
                            enlace
                                ? crear("a", {
                                    href: enlace,
                                    target: enlace.startsWith("http") ? "_blank" : null,
                                    rel: enlace.startsWith("http") ? "noopener noreferrer" : null,
                                    texto: valor
                                  })
                                : valor
                        ])
                    ])
                ])
              ))
            : EP.piezas.vacio({
                titulo: "Todavía no cargamos los datos de contacto",
                texto: "Muy pronto vas a poder encontrarnos por acá."
              });


        const columnaExtra = crear("div", {}, [

            c.mapa_url && crear("iframe", {
                clase: "mapa",
                src: c.mapa_url,
                loading: "lazy",
                title: "Dónde estamos",
                referrerpolicy: "no-referrer-when-downgrade"
            }),

            config.redes.length > 0 && crear("div", {
                estilo: c.mapa_url ? "margin-top:28px" : null
            }, [
                crear("p", { clase: "pie__titulo", texto: "Seguinos" }),
                crear("div", { clase: "redes" }, config.redes.map(red =>
                    crear("a", {
                        clase: "red",
                        href: red.url,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        "aria-label": red.etiqueta || red.red
                    }, [icono(red.red)])
                ))
            ]),

            config.medios_pago.length > 0 && crear("div", { estilo: "margin-top:28px" }, [
                crear("p", { clase: "pie__titulo", texto: "Formas de pago" }),
                crear("div", { clase: "pagos" }, config.medios_pago.map(medio =>
                    crear("span", { clase: "pago", texto: medio.nombre })
                ))
            ])
        ]);


        reemplazar(principal, crear("div", { clase: "contenido-pagina" }, [
            crear("h1", { clase: "contenido-pagina__titulo", texto: "Contacto" }),
            crear("p", {
                clase: "contenido-pagina__subtitulo",
                texto: "Escribinos y te respondemos a la brevedad."
            }),
            crear("div", { clase: "contacto" }, [columnaDatos, columnaExtra])
        ]));
    }


    // =================================================
    // ARRANQUE
    // =================================================

    const PANTALLAS = {
        pagina: { seccion: null, dibujar: paginaDeTexto },
        faq: { seccion: "faq", dibujar: preguntas },
        contacto: { seccion: "contacto", dibujar: contacto }
    };


    (async () => {

        const cual = document.body.dataset.pagina;
        const pantalla = PANTALLAS[cual];

        if (!pantalla) return;

        // En las páginas de texto la sección activa del menú es la
        // propia clave, para que quede marcada en el menú.
        const seccion = pantalla.seccion ??
            `pagina:${decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "")}`;

        const config = await EP.tienda.iniciar({ seccion });

        await pantalla.dibujar(config);

    })();

})();
