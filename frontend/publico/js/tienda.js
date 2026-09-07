// =====================================================
// TIENDA · ARRANQUE COMUN
//
// Cada página empieza con:
//
//   const tienda = await EP.tienda.iniciar({ seccion: "catalogo" });
//
// Eso hace tres cosas:
//
//   1. pide /api/public/tienda (una sola vez por carga);
//   2. aplica la apariencia guardada por el cliente pisando
//      las variables de tokens.css;
//   3. arma el encabezado y el pie.
//
// El backend ya sabe de qué tienda se trata por el dominio,
// así que acá no hay ningún identificador de tienda.
// =====================================================

window.EP = window.EP || {};

(function () {

    // -------------------------------------------------
    // AYUDAS DE DOM
    // Se arma con createElement y textContent: los textos
    // los escribe el cliente y pueden traer < o &.
    // -------------------------------------------------

    function crear(etiqueta, props = {}, hijos = []) {

        const nodo = document.createElement(etiqueta);

        for (const [clave, valor] of Object.entries(props)) {
            if (valor === null || valor === undefined || valor === false) continue;
            if (clave === "clase") nodo.className = valor;
            else if (clave === "texto") nodo.textContent = valor;
            else if (clave === "html") nodo.innerHTML = valor;
            else if (clave.startsWith("on")) nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
            else if (valor === true) nodo.setAttribute(clave, "");
            else nodo.setAttribute(clave, valor);
        }

        for (const hijo of [].concat(hijos)) {
            if (hijo === null || hijo === undefined || hijo === false) continue;
            nodo.append(typeof hijo === "string" ? document.createTextNode(hijo) : hijo);
        }

        return nodo;
    }

    const vaciar = (n) => { while (n.firstChild) n.removeChild(n.firstChild); return n; };
    const reemplazar = (n, ...c) => { vaciar(n); n.append(...c.flat().filter(Boolean)); return n; };


    // -------------------------------------------------
    // ICONOS
    // -------------------------------------------------

    const trazo = 'fill="none" stroke="currentColor" stroke-width="1.7" ' +
                  'stroke-linecap="round" stroke-linejoin="round"';

    const svg = (d) => `<svg viewBox="0 0 24 24" ${trazo} aria-hidden="true">${d}</svg>`;

    const ICONOS = {
        buscar: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
        menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
        cerrar: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
        imagen: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-2 4 4"/>'),
        telefono: svg('<path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
        correo: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
        lugar: svg('<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
        reloj: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
        whatsapp: svg('<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.5 3.2z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>'),
        instagram: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/>'),
        facebook: svg('<path d="M14.5 8.5H17V5h-2.5A3.5 3.5 0 0 0 11 8.5V11H8.5v3.5H11V21h3.5v-6.5H17L17.5 11h-3V9a.5.5 0 0 1 .5-.5z"/>'),
        tiktok: svg('<path d="M15 4v9.5a3.5 3.5 0 1 1-3-3.46"/><path d="M15 4a4.5 4.5 0 0 0 4.5 4.5"/>'),
        youtube: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10.5 9.5 5 2.5-5 2.5z"/>'),
        x: svg('<path d="m4 4 16 16M20 4 4 20"/>'),
        linkedin: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.5v.01M12 17v-3.8a2.2 2.2 0 0 1 4.4 0V17"/>'),
        otra: svg('<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>'),
        carrito: svg('<path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="10" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>'),
        caja: svg('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>')
    };

    function icono(nombre) {
        const caja = document.createElement("span");
        caja.innerHTML = ICONOS[nombre] || ICONOS.otra;
        return caja.firstElementChild;
    }


    // -------------------------------------------------
    // APARIENCIA
    //
    // La traduccion de lo guardado a las variables de
    // tokens.css vive en shared/js/apariencia.js, porque el
    // editor del panel tiene que aplicar exactamente lo mismo
    // sobre su vista previa. Si tradujera distinto, la vista
    // previa mentiria.
    //
    // Ninguna hoja de estilo tiene colores literales, asi que
    // con esas variables cambia la tienda entera.
    // -------------------------------------------------

    function aplicarApariencia(apariencia) {

        if (!apariencia) return;

        EP.apariencia.aplicar(document.documentElement, apariencia);

        if (apariencia.favicon_url) {
            document.head.append(
                crear("link", { rel: "icon", href: apariencia.favicon_url })
            );
        }
    }



    // -------------------------------------------------
    // MENU
    // -------------------------------------------------

    function armarEnlaces(config, seccion) {

        const enlaces = [{ id: "inicio", texto: "Inicio", url: "/" }];

        if (config.modulos.catalogo) {
            enlaces.push({ id: "catalogo", texto: "Catálogo", url: "/catalogo" });
        }

        // Las páginas salen de la base: si el cliente crea una nueva
        // desde el panel, aparece sola en el menú.
        for (const pagina of config.paginas) {
            enlaces.push({
                id: `pagina:${pagina.clave}`,
                texto: pagina.titulo,
                url: `/p/${pagina.clave}`
            });
        }

        enlaces.push({
            id: "faq", texto: "Preguntas frecuentes", url: "/preguntas-frecuentes"
        });

        enlaces.push({ id: "contacto", texto: "Contacto", url: "/contacto" });

        return enlaces.map(enlace => crear("a", {
            clase: "navegacion__enlace",
            href: enlace.url,
            "aria-current": enlace.id === seccion ? "page" : null,
            texto: enlace.texto
        }));
    }


    // El número sobre el carrito se actualiza solo: EP.carrito
    // avisa cada vez que cambia, también desde otra pestaña.
    function construirBotonCarrito() {

        const cuenta = crear("span", { clase: "carrito-cuenta", hidden: true });

        const boton = crear("a", {
            clase: "icono-boton icono-boton--carrito",
            href: "/carrito",
            "aria-label": "Ver el carrito"
        }, [icono("carrito"), cuenta]);

        EP.carrito?.alCambiar(() => {
            const cantidad = EP.carrito.cantidad();
            cuenta.textContent = cantidad > 99 ? "99+" : String(cantidad);
            cuenta.hidden = cantidad === 0;
            boton.setAttribute("aria-label",
                cantidad === 0
                    ? "Ver el carrito, está vacío"
                    : `Ver el carrito, ${cantidad} ${cantidad === 1 ? "producto" : "productos"}`);
        });

        return boton;
    }


    function construirCabecera(config, seccion) {

        const nombre = config.tienda.nombre;
        const logo = config.apariencia?.logo_url;

        const navegacion = crear("nav", {
            clase: "navegacion",
            id: "navegacion",
            "aria-label": "Secciones de la tienda"
        }, [
            crear("button", {
                clase: "icono-boton cerrar-menu",
                type: "button",
                "aria-label": "Cerrar el menú",
                onClick: () => cerrarMenu()
            }, [icono("cerrar")]),
            ...armarEnlaces(config, seccion)
        ]);

        let velo = null;

        function cerrarMenu() {
            navegacion.classList.remove("abierta");
            velo?.remove();
            velo = null;
        }

        function abrirMenu() {
            navegacion.classList.add("abierta");
            velo = crear("div", { clase: "velo-tienda", onClick: cerrarMenu });
            document.body.append(velo);
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") cerrarMenu();
        });


        // La franja del aviso va fuera del encabezado: si estuviera
        // adentro, quedaría pegada arriba junto con el menú y se
        // comería lugar en toda la navegación. La inserta iniciar().
        const franja = config.aviso
            ? crear("div", { clase: "aviso-superior", texto: config.aviso })
            : null;

        const cabecera = crear("header", { clase: "cabecera" }, [

            crear("div", { clase: "contenedor" }, [
                crear("div", { clase: "cabecera__barra" }, [

                    crear("a", { clase: "marca", href: "/", "aria-label": nombre }, [
                        logo && crear("img", { clase: "marca__logo", src: logo, alt: "" }),
                        !logo && crear("span", { clase: "marca__nombre", texto: nombre })
                    ]),

                    navegacion,

                    crear("div", { clase: "cabecera__acciones" }, [

                        config.modulos.catalogo && crear("a", {
                            clase: "icono-boton",
                            href: "/catalogo",
                            "aria-label": "Buscar productos"
                        }, [icono("buscar")]),

                        config.modulos.carrito && construirBotonCarrito(),

                        crear("button", {
                            clase: "icono-boton abrir-menu",
                            type: "button",
                            "aria-label": "Abrir el menú",
                            onClick: abrirMenu
                        }, [icono("menu")])
                    ])
                ])
            ])
        ]);

        return { cabecera, franja };
    }


    // -------------------------------------------------
    // PIE
    // -------------------------------------------------

    const NOMBRE_RED = {
        instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp",
        tiktok: "TikTok", youtube: "YouTube", x: "X", linkedin: "LinkedIn",
        otra: "Sitio"
    };


    function construirPie(config) {

        const c = config.contacto || {};

        const datos = [
            c.telefono && ["telefono", "Teléfono", c.telefono, `tel:${c.telefono}`],
            // Igual que en la página de contacto: el número se guarda
            // en dígitos para wa.me, así que se muestra la acción.
            c.whatsapp && ["whatsapp", "WhatsApp", "Escribinos por WhatsApp",
                           `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}`],
            c.email && ["correo", "Email", c.email, `mailto:${c.email}`],
            c.direccion && ["lugar", "Dirección",
                            [c.direccion, c.ciudad].filter(Boolean).join(", "), null],
            c.horarios && ["reloj", "Horarios", c.horarios, null]
        ].filter(Boolean);


        return crear("footer", { clase: "pie" }, [
            crear("div", { clase: "contenedor" }, [

                crear("div", { clase: "pie__columnas" }, [

                    crear("div", {}, [
                        crear("p", { clase: "pie__titulo", texto: config.tienda.nombre }),
                        config.tienda.descripcion &&
                            crear("p", { clase: "pie__descripcion", texto: config.tienda.descripcion }),
                        config.redes.length > 0 && crear("div", { clase: "redes" },
                            config.redes.map(red => crear("a", {
                                clase: "red",
                                href: red.url,
                                target: "_blank",
                                rel: "noopener noreferrer",
                                "aria-label": red.etiqueta || NOMBRE_RED[red.red] || red.red
                            }, [icono(red.red)]))
                        )
                    ]),

                    config.modulos.catalogo && crear("div", {}, [
                        crear("p", { clase: "pie__titulo", texto: "Comprar" }),
                        crear("ul", { clase: "pie__lista" }, [
                            crear("li", {}, [crear("a", {
                                clase: "pie__enlace", href: "/catalogo", texto: "Ver el catálogo"
                            })]),
                            crear("li", {}, [crear("a", {
                                clase: "pie__enlace", href: "/catalogo?destacados=true",
                                texto: "Destacados"
                            })]),
                            crear("li", {}, [crear("a", {
                                clase: "pie__enlace", href: "/catalogo?novedades=true",
                                texto: "Novedades"
                            })])
                        ])
                    ]),

                    crear("div", {}, [
                        crear("p", { clase: "pie__titulo", texto: "La tienda" }),
                        crear("ul", { clase: "pie__lista" }, [
                            ...config.paginas.map(p => crear("li", {}, [
                                crear("a", {
                                    clase: "pie__enlace",
                                    href: `/p/${p.clave}`,
                                    texto: p.titulo
                                })
                            ])),
                            crear("li", {}, [crear("a", {
                                clase: "pie__enlace", href: "/preguntas-frecuentes",
                                texto: "Preguntas frecuentes"
                            })]),
                            crear("li", {}, [crear("a", {
                                clase: "pie__enlace", href: "/contacto", texto: "Contacto"
                            })])
                        ])
                    ]),

                    datos.length > 0 && crear("div", {}, [
                        crear("p", { clase: "pie__titulo", texto: "Contacto" }),
                        crear("ul", { clase: "pie__lista" },
                            datos.map(([, clave, valor, enlace]) => crear("li", {}, [
                                enlace
                                    ? crear("a", {
                                        clase: "pie__enlace", href: enlace,
                                        target: enlace.startsWith("http") ? "_blank" : null,
                                        rel: enlace.startsWith("http") ? "noopener" : null,
                                        texto: valor
                                      })
                                    : crear("span", { clase: "pie__enlace", texto: valor })
                            ]))
                        )
                    ])
                ]),

                crear("div", { clase: "pie__legal" }, [
                    crear("span", {
                        texto: `© ${new Date().getFullYear()} ${config.tienda.nombre}`
                    }),
                    config.medios_pago.length > 0 && crear("div", { clase: "pagos" },
                        config.medios_pago.map(medio =>
                            crear("span", { clase: "pago", texto: medio.nombre })
                        )
                    )
                ])
            ])
        ]);
    }


    // -------------------------------------------------
    // SEO
    // -------------------------------------------------

    function aplicarSeo(config, { titulo, descripcion } = {}) {

        const nombre = config.tienda.nombre;

        document.title = titulo
            ? `${titulo} · ${nombre}`
            : (config.seo?.titulo || nombre);

        const texto = descripcion || config.seo?.descripcion || config.tienda.descripcion;

        if (texto) {
            let meta = document.querySelector('meta[name="description"]');
            if (!meta) {
                meta = crear("meta", { name: "description" });
                document.head.append(meta);
            }
            meta.setAttribute("content", texto);
        }
    }


    // -------------------------------------------------
    // ARRANQUE
    // -------------------------------------------------

    let configuracion = null;

    async function iniciar({ seccion } = {}) {

        const principal = document.querySelector("main");

        try {
            configuracion = await EP.api.get("/api/public/tienda",
                                             { redirigirEn401: false });

        } catch (error) {
            document.body.prepend(crear("div", {
                clase: "vacio-tienda",
                estilo: "padding:18vh 20px"
            }, [
                crear("h3", { texto: "La tienda no está disponible" }),
                crear("p", { texto: error.message })
            ]));
            throw error;
        }

        aplicarApariencia(configuracion.apariencia);
        aplicarSeo(configuracion);

        // El carrito se separa por tienda: dos tiendas distintas en
        // el mismo navegador no se mezclan.
        EP.carrito?.preparar(configuracion.tienda.slug);

        const { cabecera, franja } = construirCabecera(configuracion, seccion);

        // Primero el encabezado y después la franja: cada prepend
        // inserta al principio, así el aviso termina arriba de todo.
        document.body.prepend(cabecera);
        if (franja) document.body.prepend(franja);

        principal.after(construirPie(configuracion));

        return configuracion;
    }


    // Formato de precios con la moneda de la tienda.
    function precio(valor) {
        const moneda = configuracion?.moneda?.codigo || "ARS";
        try {
            return new Intl.NumberFormat("es-AR", {
                style: "currency", currency: moneda, minimumFractionDigits: 2
            }).format(Number(valor) || 0);
        } catch {
            return `${configuracion?.moneda?.simbolo || "$"} ${Number(valor).toFixed(2)}`;
        }
    }


    EP.tienda = {
        iniciar,
        aplicarApariencia,
        aplicarSeo,
        precio,
        crear,
        vaciar,
        reemplazar,
        icono,
        config: () => configuracion
    };

})();
