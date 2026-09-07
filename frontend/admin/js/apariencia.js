// =====================================================
// PANEL · APARIENCIA
//
// Los colores y las tipografías de la tienda, con la tienda
// al lado. Cada cambio se ve al instante y recién se manda
// al servidor cuando el cliente aprieta Guardar: se puede
// probar sin miedo.
//
// La vista previa NO es un dibujo: es un recuadro con las
// mismas variables de tokens.css que usa la tienda, escritas
// por el mismo código (shared/js/apariencia.js). Si tradujera
// distinto, mostraría algo que después no pasa.
//
// Lo que se ve acá es lo que se va a ver allá.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const controles = document.getElementById("controles");
    const vista = document.getElementById("vista");
    const botonGuardar = document.getElementById("botonGuardar");
    const botonRestablecer = document.getElementById("botonRestablecer");


    // Valores actuales del formulario y los últimos guardados.
    // La diferencia entre los dos es lo que hay sin guardar.
    let valores = {};
    let guardados = {};

    // Los textos de la tienda, para que la vista previa muestre
    // los del cliente y no un ejemplo inventado.
    let identidad = {};

    let recuadro = null;


    // =================================================
    // QUÉ SE PUEDE ELEGIR
    // =================================================

    const GRUPOS_COLOR = [
        {
            titulo: "La base",
            colores: [
                { clave: "color_fondo", nombre: "Fondo de la tienda" },
                { clave: "color_texto", nombre: "Texto" }
            ]
        },
        {
            titulo: "Los acentos",
            colores: [
                { clave: "color_principal", nombre: "Color principal" },
                { clave: "color_secundario", nombre: "Cartel de oferta" }
            ]
        },
        {
            titulo: "Botones y enlaces",
            colores: [
                { clave: "color_boton", nombre: "Fondo del botón" },
                { clave: "color_boton_texto", nombre: "Texto del botón" },
                { clave: "color_enlace", nombre: "Enlaces" }
            ]
        }
    ];


    // Combinaciones armadas, para no tener que elegir siete
    // colores de cero. Cambian todo de una vez.
    const PALETAS = [
        {
            nombre: "Cálida",
            colores: {
                color_principal: "#6E3B34", color_secundario: "#C9A227",
                color_fondo: "#FDFBF7", color_texto: "#2C2724",
                color_boton: "#6E3B34", color_boton_texto: "#FFFFFF",
                color_enlace: "#6E3B34"
            }
        },
        {
            nombre: "Sobria",
            colores: {
                color_principal: "#1F2937", color_secundario: "#D97706",
                color_fondo: "#FFFFFF", color_texto: "#111827",
                color_boton: "#1F2937", color_boton_texto: "#FFFFFF",
                color_enlace: "#1F2937"
            }
        },
        {
            nombre: "Natural",
            colores: {
                color_principal: "#3F6212", color_secundario: "#CA8A04",
                color_fondo: "#FBFDF7", color_texto: "#1C2612",
                color_boton: "#3F6212", color_boton_texto: "#FFFFFF",
                color_enlace: "#3F6212"
            }
        },
        {
            nombre: "Clásica",
            colores: {
                color_principal: "#1E3A5F", color_secundario: "#B08D2F",
                color_fondo: "#FCFCFD", color_texto: "#1A2433",
                color_boton: "#1E3A5F", color_boton_texto: "#FFFFFF",
                color_enlace: "#1E3A5F"
            }
        },
        {
            nombre: "De la plataforma",
            colores: {
                color_principal: "#7C3AED", color_secundario: "#F59E0B",
                color_fondo: "#FFFFFF", color_texto: "#1F2937",
                color_boton: "#7C3AED", color_boton_texto: "#FFFFFF",
                color_enlace: "#7C3AED"
            }
        }
    ];


    const TAMANOS = [
        { valor: "chico", nombre: "Chicos" },
        { valor: "medio", nombre: "Medianos" },
        { valor: "grande", nombre: "Grandes" }
    ];

    const PESOS = [
        { valor: "400", nombre: "Normal" },
        { valor: "500", nombre: "Medio" },
        { valor: "600", nombre: "Semi negrita" },
        { valor: "700", nombre: "Negrita" },
        { valor: "800", nombre: "Extra negrita" }
    ];

    const BOTONES = [
        { valor: "recto", nombre: "Rectos" },
        { valor: "redondeado", nombre: "Redondeados" },
        { valor: "suave", nombre: "Bien redondos" }
    ];

    const TARJETAS = [
        { valor: "plana", nombre: "Sin nada" },
        { valor: "borde", nombre: "Con borde" },
        { valor: "sombra", nombre: "Con sombra" }
    ];


    // =================================================
    // LEGIBILIDAD
    //
    // El panel no impide elegir gris claro sobre blanco: es
    // la tienda del cliente y la decisión es suya. Pero se lo
    // avisa, porque es el error que nadie ve hasta que alguien
    // no puede leer los precios.
    //
    // La cuenta es la de WCAG: luminancia relativa de cada
    // color y la razón entre las dos. 4.5 es el mínimo para
    // texto normal.
    // =================================================

    function luminancia(hex) {

        const canales = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

        const [r, v, a] = canales.map(c =>
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );

        return 0.2126 * r + 0.7152 * v + 0.0722 * a;
    }


    function contraste(unColor, otroColor) {

        if (!/^#[0-9a-f]{6}$/i.test(unColor) || !/^#[0-9a-f]{6}$/i.test(otroColor)) {
            return 21;
        }

        const a = luminancia(unColor);
        const b = luminancia(otroColor);

        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }


    function problemasDeLectura() {

        const problemas = [];

        if (contraste(valores.color_texto, valores.color_fondo) < 4.5) {
            problemas.push("el texto sobre el fondo de la tienda");
        }

        if (contraste(valores.color_boton_texto, valores.color_boton) < 4.5) {
            problemas.push("el texto de los botones");
        }

        if (contraste(valores.color_enlace, valores.color_fondo) < 4.5) {
            problemas.push("los enlaces");
        }

        return problemas;
    }


    // =================================================
    // CONTROLES
    // =================================================

    // Se guardan las referencias para poder actualizarlos sin
    // volver a dibujar el formulario: redibujarlo en cada tecla
    // le sacaría el foco al campo que se está usando.
    const nodos = { colores: {}, opciones: [], paletas: [], aviso: null };


    function controlDeColor({ clave, nombre }) {

        const muestra = crear("input", {
            clase: "color__muestra",
            type: "color",
            id: clave,
            value: valores[clave],
            "aria-label": nombre
        });

        const codigo = crear("input", {
            clase: "color__codigo",
            type: "text",
            maxlength: "7",
            value: valores[clave],
            "aria-label": `Código del color: ${nombre}`
        });

        muestra.addEventListener("input", () => {
            codigo.value = muestra.value.toUpperCase();
            cambiar(clave, muestra.value);
        });

        // Escribir el código a mano sirve para pegar el color
        // exacto de una marca. Se aplica solo cuando ya es un
        // color completo, no en cada letra.
        codigo.addEventListener("input", () => {
            const escrito = codigo.value.trim();
            if (/^#[0-9a-f]{6}$/i.test(escrito)) {
                muestra.value = escrito;
                cambiar(clave, escrito);
            }
        });

        codigo.addEventListener("blur", () => {
            codigo.value = valores[clave];
        });

        nodos.colores[clave] = { muestra, codigo };

        return crear("div", { clase: "color" }, [
            muestra,
            crear("label", { clase: "color__nombre", for: clave, texto: nombre }),
            codigo
        ]);
    }


    function grupoDeOpciones({ clave, etiqueta, pista, opciones }) {

        const botones = opciones.map(opcion =>
            crear("button", {
                clase: "opcion",
                type: "button",
                "aria-pressed": String(valores[clave] === opcion.valor),
                texto: opcion.nombre,
                datos: { clave, valor: opcion.valor },
                onClick: () => cambiar(clave, opcion.valor)
            })
        );

        nodos.opciones.push(...botones);

        return crear("div", { clase: "campo" }, [
            crear("span", { clase: "campo__etiqueta", texto: etiqueta }),
            pista && crear("span", { clase: "campo__pista", texto: pista }),
            crear("div", { clase: "opciones" }, botones)
        ]);
    }


    function selectorDeFuente(clave, etiqueta, pista) {

        const select = crear("select", {
            clase: "control", id: clave, name: clave
        }, Object.keys(EP.apariencia.FUENTES).map(nombre =>
            crear("option", {
                value: nombre,
                selected: valores[clave] === nombre,
                texto: nombre,
                // Cada opción se muestra en su propia tipografía.
                estilo: `font-family:${EP.apariencia.pilaDeFuente(nombre)}`
            })
        ));

        select.addEventListener("change", () => cambiar(clave, select.value));

        return crear("div", { clase: "campo" }, [
            crear("label", { clase: "campo__etiqueta", for: clave, texto: etiqueta }),
            crear("span", { clase: "campo__pista", texto: pista }),
            select
        ]);
    }


    function paleta(item) {

        const boton = crear("button", {
            clase: "paleta",
            type: "button",
            "aria-label": `Usar la combinación ${item.nombre}`,
            onClick: () => aplicarPaleta(item)
        }, [
            crear("div", { clase: "paleta__muestras" },
                ["color_fondo", "color_principal", "color_secundario", "color_texto"]
                    .map(clave => crear("span", {
                        clase: "paleta__muestra",
                        estilo: `background:${item.colores[clave]}`
                    }))
            ),
            crear("span", { clase: "paleta__nombre", texto: item.nombre })
        ]);

        return boton;
    }


    function dibujarControles() {

        nodos.colores = {};
        nodos.opciones = [];

        nodos.aviso = crear("div", { hidden: true });

        reemplazar(controles, [

            crear("div", { clase: "tarjeta" }, [
                crear("div", { clase: "tarjeta__encabezado" }, [
                    crear("h3", { clase: "tarjeta__titulo", texto: "Colores" })
                ]),
                crear("div", { clase: "tarjeta__cuerpo" }, [

                    crear("div", { clase: "campo" }, [
                        crear("span", { clase: "campo__etiqueta",
                                        texto: "Combinaciones listas" }),
                        crear("span", {
                            clase: "campo__pista",
                            texto: "Cambian los siete colores de una vez. Después " +
                                   "podés retocar el que quieras."
                        }),
                        crear("div", { clase: "paletas" }, PALETAS.map(paleta))
                    ]),

                    ...GRUPOS_COLOR.map(grupo =>
                        crear("div", { clase: "seccion" }, [
                            crear("h4", { clase: "seccion__titulo", texto: grupo.titulo }),
                            ...grupo.colores.map(controlDeColor)
                        ])
                    ),

                    nodos.aviso
                ])
            ]),

            crear("div", { clase: "tarjeta", estilo: "margin-top:16px" }, [
                crear("div", { clase: "tarjeta__encabezado" }, [
                    crear("h3", { clase: "tarjeta__titulo", texto: "Tipografía" })
                ]),
                crear("div", { clase: "tarjeta__cuerpo" }, [

                    selectorDeFuente("fuente_principal", "Para el texto",
                        "La que se lee en las descripciones y en los precios."),

                    selectorDeFuente("fuente_titulos", "Para los títulos",
                        "Podés usar la misma que el texto: queda más tranquilo."),

                    grupoDeOpciones({
                        clave: "tamano_titulos",
                        etiqueta: "Tamaño de los títulos",
                        opciones: TAMANOS
                    }),

                    grupoDeOpciones({
                        clave: "peso_titulos",
                        etiqueta: "Grosor de los títulos",
                        opciones: PESOS
                    })
                ])
            ]),

            crear("div", { clase: "tarjeta", estilo: "margin-top:16px" }, [
                crear("div", { clase: "tarjeta__encabezado" }, [
                    crear("h3", { clase: "tarjeta__titulo", texto: "Estilo" })
                ]),
                crear("div", { clase: "tarjeta__cuerpo" }, [

                    grupoDeOpciones({
                        clave: "estilo_botones",
                        etiqueta: "Esquinas de los botones",
                        opciones: BOTONES
                    }),

                    grupoDeOpciones({
                        clave: "estilo_tarjetas",
                        etiqueta: "Tarjetas de producto",
                        pista: "Cómo se separa cada producto del fondo.",
                        opciones: TARJETAS
                    })
                ])
            ])
        ]);
    }


    // =================================================
    // VISTA PREVIA
    //
    // Una tienda en chiquito con los textos del cliente.
    // Se dibuja una sola vez: lo que cambia después son las
    // variables de CSS del recuadro.
    // =================================================

    function dibujarVista() {

        const nombre = identidad.nombre_tienda || "Mi tienda";

        const producto = (titulo, precio, antes) =>
            crear("div", { clase: "vp__tarjeta" }, [
                antes && crear("span", { clase: "vp__cinta", texto: "OFERTA" }),
                crear("div", { clase: "vp__foto" }),
                crear("div", { clase: "vp__datos" }, [
                    crear("div", { clase: "vp__nombre", texto: titulo }),
                    crear("div", { clase: "vp__precio" }, [
                        precio,
                        antes && crear("span", { clase: "vp__antes", texto: antes })
                    ])
                ])
            ]);

        recuadro = crear("div", { clase: "vp" }, [

            crear("div", { clase: "vp__barra" }, [
                crear("span", { clase: "vp__marca", texto: nombre }),
                crear("div", { clase: "vp__nav" }, [
                    crear("span", { texto: "Inicio" }),
                    crear("span", { texto: "Catálogo" }),
                    crear("span", { clase: "es-enlace", texto: "Contacto" })
                ])
            ]),

            crear("div", { clase: "vp__hero" }, [
                crear("h3", {
                    clase: "vp__titulo",
                    texto: identidad.texto_bienvenida || nombre
                }),
                crear("p", {
                    clase: "vp__bajada",
                    texto: identidad.texto_subtitulo ||
                           "Acá va la frase que escribiste en Configuración."
                }),
                crear("div", { clase: "vp__acciones" }, [
                    crear("button", {
                        clase: "vp__boton",
                        type: "button",
                        tabindex: "-1",
                        texto: identidad.texto_boton_principal || "Ver catálogo"
                    }),
                    crear("span", { clase: "vp__enlace", texto: "Contactanos" })
                ])
            ]),

            crear("div", { clase: "vp__seccion" }, [
                crear("h4", { clase: "vp__seccion-titulo", texto: "Destacados" }),
                crear("div", { clase: "vp__grilla" }, [
                    producto("Biblia de estudio", "$ 42.900"),
                    producto("Cuaderno de tapa dura", "$ 12.400", "$ 15.500"),
                    producto("Taza con versículo", "$ 9.800")
                ])
            ]),

            crear("div", { clase: "vp__pie", texto: `${nombre} · Envíos a todo el país` })
        ]);

        reemplazar(vista, [
            recuadro,
            crear("p", {
                clase: "vp__leyenda",
                texto: "Así se va a ver tu tienda. Los productos son de ejemplo."
            })
        ]);
    }


    // =================================================
    // CAMBIOS
    // =================================================

    function cambiar(clave, valor) {
        valores[clave] = clave.startsWith("color_") ? valor.toUpperCase() : valor;
        refrescar();
    }


    function aplicarPaleta(item) {
        Object.assign(valores, item.colores);

        // Los cuadritos de color no se enteran solos.
        for (const [clave, control] of Object.entries(nodos.colores)) {
            if (item.colores[clave]) {
                control.muestra.value = item.colores[clave];
                control.codigo.value = item.colores[clave];
            }
        }

        refrescar();
    }


    function refrescar() {

        EP.apariencia.aplicar(recuadro, EP.apariencia.desdeCampos(valores));

        for (const boton of nodos.opciones) {
            boton.setAttribute(
                "aria-pressed",
                String(valores[boton.dataset.clave] === boton.dataset.valor)
            );
        }

        const problemas = problemasDeLectura();

        if (problemas.length === 0) {
            nodos.aviso.hidden = true;
            reemplazar(nodos.aviso, []);

        } else {
            nodos.aviso.hidden = false;
            reemplazar(nodos.aviso, crear("div", { clase: "aviso-contraste" }, [
                icono("alerta"),
                crear("div", {}, [
                    crear("strong", { texto: "Puede costar leerlo. " }),
                    "Con estos colores cuesta distinguir " +
                    problemas.join(", ").replace(/, ([^,]*)$/, " y $1") +
                    ". Se puede guardar igual, pero conviene oscurecer el texto " +
                    "o aclarar el fondo."
                ])
            ]));
        }

        botonGuardar.disabled = !hayCambios();
    }


    function hayCambios() {
        return Object.keys(valores).some(clave => valores[clave] !== guardados[clave]);
    }


    // =================================================
    // GUARDAR Y RESTABLECER
    // =================================================

    async function guardar() {

        await EP.util.ocupado(botonGuardar, async () => {
            try {
                const respuesta = await EP.api.put(
                    "/api/admin/configuracion/apariencia", valores
                );

                valores = { ...respuesta.apariencia };
                guardados = { ...respuesta.apariencia };

                EP.notificar.exito(respuesta.mensaje);
                refrescar();

            } catch (error) {
                EP.notificar.error(error.message);
            }
        });
    }


    async function restablecer() {

        const confirmado = await EP.confirmar({
            titulo: "¿Volver a los colores originales?",
            mensaje: "Tu tienda vuelve a los colores y las tipografías con los que " +
                     "arrancó. El nombre, el logo y los textos no se tocan.",
            textoConfirmar: "Sí, volver",
            peligro: true
        });

        if (!confirmado) return;

        try {
            const respuesta = await EP.api.post(
                "/api/admin/configuracion/apariencia/restablecer"
            );

            valores = { ...respuesta.apariencia };
            guardados = { ...respuesta.apariencia };

            EP.notificar.exito(respuesta.mensaje);
            dibujarControles();
            refrescar();

        } catch (error) {
            EP.notificar.error(error.message);
        }
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        let configuracion;

        try {
            configuracion = await EP.api.get("/api/admin/configuracion");

        } catch (error) {
            reemplazar(controles, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo",
                              texto: "No pudimos cargar la apariencia" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
            return;
        }

        identidad = configuracion.identidad || {};
        valores = { ...configuracion.apariencia };
        guardados = { ...configuracion.apariencia };

        dibujarVista();
        dibujarControles();
        refrescar();

        botonGuardar.addEventListener("click", guardar);
        botonRestablecer.addEventListener("click", restablecer);

        // Cerrar la pestaña con cambios sin guardar es perder el
        // trabajo sin aviso.
        window.addEventListener("beforeunload", (evento) => {
            if (hayCambios()) evento.preventDefault();
        });

    })();

})();
