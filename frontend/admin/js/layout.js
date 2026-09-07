// =====================================================
// ESTRUCTURA COMUN DEL PANEL
//
// La barra lateral y el encabezado se arman acá, una sola
// vez, en vez de repetirse en cada archivo HTML. Cada
// pantalla declara qué sección es con data-seccion en el
// body y aporta solo su contenido.
//
// Uso al principio de cada pantalla:
//
//   const sesion = await EP.admin.iniciar();
//
// Devuelve { usuario, tienda, modulos } y recién ahí muestra
// el panel: así nadie ve la estructura antes de saber si su
// sesión sigue siendo válida.
// =====================================================

window.EP = window.EP || {};

(function () {

    const { crear, icono } = EP.dom;


    const SECCIONES = [
        {
            titulo: null,
            enlaces: [
                { id: "inicio", texto: "Inicio", icono: "inicio", url: "/admin/" }
            ]
        },
        {
            titulo: "Catálogo",
            enlaces: [
                { id: "productos", texto: "Productos", icono: "productos",
                  url: "/admin/productos.html", modulo: "catalogo" },
                { id: "categorias", texto: "Categorías", icono: "categorias",
                  url: "/admin/categorias.html", modulo: "catalogo" }
            ]
        },
        {
            titulo: "Ventas",
            enlaces: [
                { id: "pedidos", texto: "Pedidos", icono: "pedidos",
                  url: "/admin/pedidos.html", modulo: "pedidos" },
                { id: "clientes", texto: "Clientes", icono: "clientes",
                  url: "/admin/clientes.html" }
            ]
        },
        {
            titulo: "Mi tienda",
            enlaces: [
                { id: "apariencia", texto: "Apariencia", icono: "apariencia",
                  url: "/admin/apariencia.html" },
                { id: "contenido", texto: "Contenido", icono: "contenido",
                  url: "/admin/contenido.html" },
                { id: "configuracion", texto: "Configuración", icono: "configuracion",
                  url: "/admin/configuracion.html" }
            ]
        }
    ];


    const NOMBRE_ROL = {
        superadmin: "Plataforma",
        admin: "Administrador",
        empleado: "Empleado"
    };


    const inicial = (texto) => (texto || "?").trim().charAt(0).toUpperCase();


    // -------------------------------------------------
    // BARRA LATERAL
    // -------------------------------------------------

    function construirLateral(sesion, activa) {

        const grupos = SECCIONES.map(seccion => {

            // Si la tienda no tiene el módulo contratado, el enlace
            // ni siquiera aparece: no tiene sentido mostrar algo a
            // lo que la API va a responder 403.
            const visibles = seccion.enlaces.filter(
                enlace => !enlace.modulo || sesion.modulos?.[enlace.modulo] !== false
            );

            if (visibles.length === 0) return null;

            return crear("div", { clase: "lateral__grupo" }, [

                seccion.titulo &&
                    crear("p", { clase: "lateral__titulo", texto: seccion.titulo }),

                ...visibles.map(enlace => {

                    const esActiva = enlace.id === activa;

                    return crear("a", {
                        clase: "lateral__enlace" + (enlace.pronto ? " lateral__enlace--pronto" : ""),
                        href: enlace.pronto ? null : enlace.url,
                        "aria-current": esActiva ? "page" : null,
                        "aria-disabled": enlace.pronto ? "true" : null
                    }, [
                        icono(enlace.icono),
                        crear("span", { texto: enlace.texto }),
                        enlace.pronto &&
                            crear("span", { clase: "lateral__etiqueta", texto: "PRONTO" })
                    ]);
                })
            ]);
        });


        return crear("aside", { clase: "lateral", id: "lateral" }, [

            crear("div", { clase: "lateral__marca" }, [
                crear("span", {
                    clase: "lateral__inicial",
                    texto: inicial(sesion.tienda?.nombre || "Panel"),
                    "aria-hidden": "true"
                }),
                crear("span", {
                    clase: "lateral__nombre",
                    texto: sesion.tienda?.nombre || "Plataforma"
                })
            ]),

            crear("nav", { clase: "lateral__nav", "aria-label": "Secciones" }, grupos),

            crear("div", { clase: "lateral__pie" }, [
                crear("a", {
                    clase: "lateral__tienda",
                    href: "/",
                    target: "_blank",
                    rel: "noopener"
                }, ["Ver mi tienda ↗"])
            ])
        ]);
    }


    // -------------------------------------------------
    // ENCABEZADO
    // -------------------------------------------------

    function construirEncabezado(sesion, titulo, alAbrirLateral) {

        const desplegable = crear("div", {
            clase: "encabezado__desplegable",
            hidden: true
        }, [
            crear("a", {
                clase: "encabezado__opcion",
                href: "/",
                target: "_blank",
                rel: "noopener",
                texto: "Ver mi tienda"
            }),
            crear("button", {
                clase: "encabezado__opcion",
                type: "button",
                texto: "Cambiar mi contraseña",
                onClick: () => { desplegable.hidden = true; cambiarPassword(); }
            }),
            crear("button", {
                clase: "encabezado__opcion encabezado__opcion--peligro",
                type: "button",
                texto: "Cerrar sesión",
                onClick: async () => {
                    desplegable.hidden = true;
                    const confirmado = await EP.confirmar({
                        titulo: "¿Cerrar sesión?",
                        mensaje: "Vas a tener que ingresar de nuevo con tu email y contraseña.",
                        textoConfirmar: "Cerrar sesión"
                    });
                    if (confirmado) EP.sesion.cerrar();
                }
            })
        ]);


        const botonUsuario = crear("button", {
            clase: "encabezado__inicial",
            type: "button",
            "aria-haspopup": "true",
            "aria-label": "Mi cuenta",
            texto: inicial(sesion.usuario.nombre),
            onClick: (evento) => {
                evento.stopPropagation();
                desplegable.hidden = !desplegable.hidden;
            }
        });


        document.addEventListener("click", () => { desplegable.hidden = true; });

        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape") desplegable.hidden = true;
        });


        return crear("header", { clase: "encabezado" }, [

            crear("button", {
                clase: "hamburguesa",
                type: "button",
                "aria-label": "Abrir el menú",
                onClick: alAbrirLateral
            }, [icono("menu")]),

            crear("h1", { clase: "encabezado__titulo", id: "tituloPagina", texto: titulo }),

            crear("div", { clase: "encabezado__usuario" }, [

                crear("div", { clase: "encabezado__datos" }, [
                    crear("div", { clase: "encabezado__nombre", texto: sesion.usuario.nombre }),
                    crear("div", {
                        clase: "encabezado__rol",
                        texto: NOMBRE_ROL[sesion.usuario.rol] || sesion.usuario.rol
                    })
                ]),

                crear("div", { clase: "encabezado__menu" }, [botonUsuario, desplegable])
            ])
        ]);
    }


    // -------------------------------------------------
    // CAMBIO DE CONTRASEÑA
    // -------------------------------------------------

    function cambiarPassword() {

        const actual = crear("input", {
            clase: "control", type: "password", id: "passActual",
            autocomplete: "current-password"
        });

        const nueva = crear("input", {
            clase: "control", type: "password", id: "passNueva",
            autocomplete: "new-password", minlength: "8"
        });

        const cajon = EP.cajon({
            titulo: "Cambiar mi contraseña",
            contenido: [
                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "passActual",
                                     texto: "Contraseña actual" }),
                    actual
                ]),
                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "passNueva",
                                     texto: "Contraseña nueva" }),
                    crear("span", { clase: "campo__pista", texto: "Al menos 8 caracteres." }),
                    nueva
                ])
            ],
            textoGuardar: "Cambiar contraseña",
            async alGuardar() {
                const respuesta = await EP.api.post("/api/auth/cambiar-password", {
                    password_actual: actual.value,
                    password_nueva: nueva.value
                }, { redirigirEn401: false });

                EP.notificar.exito(respuesta.mensaje);
                cajon.cerrar();
            }
        });

        setTimeout(() => actual.focus(), 260);
    }


    // -------------------------------------------------
    // ABIERTO COMO ARCHIVO, NO COMO PAGINA
    //
    // Si alguien abre el .html con doble clic, o lo sirve
    // desde otro puerto (el "Live Server" de un editor), el
    // navegador no encuentra lo que el panel pide en /shared
    // ni la API. Sin este aviso, la pantalla se queda con el
    // circulito girando para siempre y no hay forma de que
    // una persona que no programa entienda por que.
    //
    // Se detecta por lo que falta, no por el protocolo: asi
    // cubre tambien el caso del servidor equivocado, donde la
    // direccion parece correcta pero /shared responde 404.
    //
    // Escrito sin EP.dom a proposito: es el aviso de que las
    // cosas no cargaron, no puede depender de que hayan
    // cargado.
    // -------------------------------------------------

    function servidoPorLaApp() {
        return Boolean(window.EP && EP.api && EP.sesion);
    }


    function explicarQueFalta() {

        const direccion = "http://localhost:3000/admin/" +
            (location.pathname.split("/").pop() || "");

        const caja = document.createElement("div");
        caja.setAttribute("style", [
            "max-width:560px", "margin:12vh auto", "padding:32px",
            "font-family:system-ui,-apple-system,'Segoe UI',sans-serif",
            "line-height:1.6", "color:#101828",
            "border:1px solid #E4E7EC", "border-radius:12px",
            "background:#fff"
        ].join(";"));

        const titulo = document.createElement("h1");
        titulo.textContent = "Esta página hay que abrirla desde el servidor";
        titulo.setAttribute("style", "margin:0 0 14px;font-size:1.3rem");

        const explicacion = document.createElement("p");
        explicacion.setAttribute("style", "margin:0 0 18px;color:#475467");
        explicacion.textContent =
            "El panel está abierto como un archivo suelto, así que no encuentra " +
            "ni sus estilos ni sus datos. Por eso queda cargando y no aparece nada.";

        const comoSeAbre = document.createElement("p");
        comoSeAbre.setAttribute("style", "margin:0 0 10px;color:#475467");
        comoSeAbre.textContent = "Con el servidor encendido, entrá por acá:";

        const enlace = document.createElement("a");
        enlace.href = direccion;
        enlace.textContent = direccion;
        enlace.setAttribute("style", [
            "display:block", "padding:12px 14px", "margin-bottom:18px",
            "border-radius:8px", "background:#EEF2FF", "color:#4338CA",
            "font-family:ui-monospace,Menlo,Consolas,monospace",
            "font-size:.9rem", "word-break:break-all"
        ].join(";"));

        const encender = document.createElement("p");
        encender.setAttribute("style", "margin:0;color:#667085;font-size:.9rem");
        encender.textContent =
            "Si no responde, el servidor no está encendido: en la carpeta " +
            "backend, ejecutá npm run dev.";

        caja.append(titulo, explicacion, comoSeAbre, enlace, encender);

        document.body.textContent = "";
        document.body.setAttribute("style", "background:#F6F7F9;margin:0");
        document.body.append(caja);
    }


    // -------------------------------------------------
    // ARRANQUE
    // -------------------------------------------------

    async function iniciar({ titulo } = {}) {

        // Antes que nada: si el panel no lo esta sirviendo la
        // aplicacion, nada de lo que sigue puede funcionar.
        if (!servidoPorLaApp()) {
            explicarQueFalta();
            return new Promise(() => {});
        }

        if (!EP.sesion.requerir()) return new Promise(() => {});

        const activa = document.body.dataset.seccion || "inicio";
        const textoTitulo = titulo || document.body.dataset.titulo || "Panel";

        let sesion;

        try {
            sesion = await EP.api.get("/api/auth/yo");

        } catch (error) {
            // Un 401 ya redirigió al login desde EP.api.
            if (error.estado !== 401) EP.notificar.error(error.message);
            return new Promise(() => {});
        }


        // El superadmin no administra tiendas: su lugar es la
        // consola de plataforma, que llega en otra etapa.
        if (sesion.usuario.rol === "superadmin") {
            document.body.innerHTML = "";
            document.body.append(
                crear("div", { estilo: "max-width:520px;margin:15vh auto;padding:24px;text-align:center" }, [
                    crear("h1", { texto: "Consola de plataforma" }),
                    crear("p", {
                        estilo: "color:#667085",
                        texto: "Tu usuario administra la plataforma, no una tienda en particular. " +
                               "La consola de plataforma se construye más adelante."
                    }),
                    crear("button", {
                        clase: "boton boton--suave",
                        type: "button",
                        texto: "Cerrar sesión",
                        onClick: () => EP.sesion.cerrar()
                    })
                ])
            );
            return new Promise(() => {});
        }


        // Módulos habilitados, para no mostrar secciones que la
        // tienda no tiene.
        try {
            const tienda = await EP.api.get("/api/public/tienda");
            sesion.modulos = tienda.modulos;
        } catch {
            sesion.modulos = {};
        }


        const contenido = document.querySelector("[data-contenido]");

        const lateral = construirLateral(sesion, activa);

        let velo = null;

        const cerrarLateral = () => {
            lateral.classList.remove("abierta");
            velo?.remove();
            velo = null;
        };

        const abrirLateral = () => {
            lateral.classList.add("abierta");
            velo = crear("div", { clase: "velo", onClick: cerrarLateral });
            document.body.append(velo);
        };

        const encabezado = construirEncabezado(sesion, textoTitulo, abrirLateral);

        const raiz = crear("div", { clase: "admin" }, [
            lateral,
            crear("div", { clase: "cuerpo" }, [encabezado, contenido])
        ]);

        document.body.append(raiz);
        document.title = `${textoTitulo} · ${sesion.tienda?.nombre || "Panel"}`;

        return sesion;
    }


    EP.admin = { iniciar };

})();
