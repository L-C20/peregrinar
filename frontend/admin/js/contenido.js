// =====================================================
// PANEL · CONTENIDO
//
// Tres listas en una sola pantalla, separadas por pestañas:
//
//   Banners     las imágenes grandes de la portada
//   Páginas     Nosotros, Trabajos personalizados, etc.
//   Preguntas   las preguntas frecuentes
//
// Están juntas porque son la misma tarea ("cambiar lo que
// dice mi tienda") y porque cada una sola no justifica una
// entrada propia en el menú.
//
// El orden se cambia con flechas y no arrastrando: funciona
// igual con el teclado, con lector de pantalla y en el
// teléfono, donde arrastrar es incómodo.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const pestanas = document.getElementById("pestanas");
    const lista = document.getElementById("lista");
    const ayuda = document.getElementById("ayuda");
    const botonNuevo = document.getElementById("botonNuevo");


    const UBICACIONES = [
        { valor: "inicio", nombre: "Portada" },
        { valor: "catalogo", nombre: "Catálogo" },
        { valor: "promociones", nombre: "Promociones" }
    ];


    const SECCIONES = {

        banners: {
            nombre: "Banners",
            singular: "banner",
            boton: "Nuevo banner",
            ruta: "/api/admin/contenido/banners",
            ordenable: true,
            ayuda: "Las imágenes grandes que se ven al entrar a tu tienda. " +
                   "El orden de esta lista es el orden en que se muestran.",
            vacio: {
                titulo: "Todavía no hay banners",
                texto: "Un banner es la imagen grande de la portada. Sirve para " +
                       "anunciar algo: una promoción, un producto nuevo, un horario especial."
            }
        },

        paginas: {
            nombre: "Páginas",
            singular: "página",
            boton: "Nueva página",
            ruta: "/api/admin/contenido/paginas",
            ordenable: false,
            ayuda: "Las páginas de texto de tu tienda: Nosotros, Trabajos " +
                   "personalizados, Envíos. Aparecen en el menú de arriba.",
            vacio: {
                titulo: "Todavía no hay páginas",
                texto: "Una página sirve para contar algo que no es un producto: " +
                       "quiénes son, cómo trabajan, cómo hacen los envíos."
            }
        },

        faq: {
            nombre: "Preguntas frecuentes",
            singular: "pregunta",
            boton: "Nueva pregunta",
            ruta: "/api/admin/contenido/faq",
            ordenable: true,
            ayuda: "Lo que más te consultan, respondido de una vez. Se muestran " +
                   "en la página de preguntas frecuentes, en el orden de esta lista.",
            vacio: {
                titulo: "Todavía no hay preguntas",
                texto: "Escribí acá lo que más te preguntan por WhatsApp: " +
                       "cómo se hacen los envíos, si se puede retirar, cómo se paga."
            }
        }
    };


    let actual = "banners";
    let datos = [];


    const seccion = () => SECCIONES[actual];


    // =================================================
    // PESTAÑAS
    // =================================================

    function dibujarPestanas() {

        reemplazar(pestanas, Object.entries(SECCIONES).map(([id, config]) =>
            crear("button", {
                clase: "pestana" + (id === actual ? " pestana--activa" : ""),
                type: "button",
                onClick: () => {
                    if (id === actual) return;
                    actual = id;
                    dibujarPestanas();
                    aplicarSeccion();
                    cargar();
                }
            }, [crear("span", { texto: config.nombre })])
        ));
    }


    function aplicarSeccion() {
        ayuda.textContent = seccion().ayuda;
        botonNuevo.textContent = seccion().boton;
    }


    // =================================================
    // IMAGEN
    // Mismo control en banners y en páginas.
    // =================================================

    function selectorDeImagen(urlActual, { textoVacio = "Agregar imagen" } = {}) {

        const archivo = crear("input", {
            type: "file",
            accept: "image/png,image/jpeg,image/webp,image/avif,image/gif",
            hidden: true
        });

        const vista = crear("div", { clase: "imagenes" });

        let elegida = null;

        function dibujar() {

            const url = elegida ? URL.createObjectURL(elegida) : urlActual;

            reemplazar(vista, [
                url && crear("div", { clase: "imagen" }, [
                    crear("img", { src: url, alt: "" }),
                    crear("div", { clase: "imagen__herramientas" }, [
                        crear("button", {
                            clase: "imagen__boton",
                            type: "button",
                            texto: "Cambiar",
                            onClick: () => archivo.click()
                        })
                    ])
                ]),
                !url && crear("button", {
                    clase: "soltar",
                    type: "button",
                    onClick: () => archivo.click()
                }, [icono("subir"), crear("span", { texto: textoVacio })])
            ]);
        }

        archivo.addEventListener("change", () => {
            if (archivo.files[0]) { elegida = archivo.files[0]; dibujar(); }
        });

        dibujar();

        return {
            nodos: [vista, archivo],
            archivo: () => elegida
        };
    }


    // =================================================
    // FILA COMUN
    //
    // Las tres listas se ven igual: algo que identifica al
    // elemento a la izquierda y los botones a la derecha.
    // =================================================

    function acciones(item, indice, { editar, eliminar }) {

        const botones = [];

        if (seccion().ordenable) {
            botones.push(
                crear("button", {
                    clase: "boton boton--fantasma",
                    type: "button",
                    title: "Subir",
                    "aria-label": "Subir",
                    disabled: indice === 0,
                    onClick: () => mover(indice, -1)
                }, ["↑"]),
                crear("button", {
                    clase: "boton boton--fantasma",
                    type: "button",
                    title: "Bajar",
                    "aria-label": "Bajar",
                    disabled: indice === datos.length - 1,
                    onClick: () => mover(indice, 1)
                }, ["↓"])
            );
        }

        botones.push(
            crear("button", {
                clase: "boton boton--fantasma",
                type: "button",
                title: "Editar",
                "aria-label": "Editar",
                onClick: () => editar(item)
            }, [icono("lapiz")]),

            crear("button", {
                clase: "boton boton--fantasma es-peligro",
                type: "button",
                title: "Eliminar",
                "aria-label": "Eliminar",
                onClick: () => eliminar(item)
            }, [icono("basura")])
        );

        return crear("td", { clase: "tabla__acciones" }, botones);
    }


    function estado(activo, { visible = "Visible", oculto = "Oculto" } = {}) {
        return crear("span", {
            clase: "etiqueta " + (activo ? "etiqueta--activo" : "etiqueta--inactivo"),
            texto: activo ? visible : oculto
        });
    }


    // =================================================
    // BANNERS
    // =================================================

    function filaBanner(banner, indice) {

        const ubicacion = UBICACIONES.find(u => u.valor === banner.ubicacion);

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", { clase: "celda-producto" }, [
                    banner.imagen_url
                        ? crear("img", { clase: "miniatura", src: banner.imagen_url,
                                         alt: "", loading: "lazy" })
                        : crear("div", { clase: "miniatura miniatura--vacia" },
                                [icono("imagen")]),
                    crear("div", {}, [
                        crear("div", {
                            clase: "celda-producto__nombre",
                            texto: banner.titulo || "Banner sin título"
                        }),
                        crear("div", {
                            clase: "celda-producto__meta",
                            texto: banner.descripcion || "—"
                        }),
                        crear("div", { clase: "celda-producto__movil" }, [
                            crear("span", { texto: ubicacion?.nombre || banner.ubicacion }),
                            estado(banner.activo)
                        ])
                    ])
                ])
            ]),

            crear("td", {}, [
                crear("span", { texto: ubicacion?.nombre || banner.ubicacion })
            ]),

            crear("td", {}, [estado(banner.activo)]),

            acciones(banner, indice, {
                editar: formularioBanner,
                eliminar: (item) => eliminar(item, item.titulo || "este banner")
            })
        ]);
    }


    function formularioBanner(banner) {

        const titulo = crear("input", {
            clase: "control", id: "bTitulo", name: "titulo", type: "text",
            maxlength: "160", value: banner?.titulo || ""
        });

        const descripcion = crear("textarea", {
            clase: "control", id: "bDescripcion", name: "descripcion",
            maxlength: "500", rows: "2"
        });
        descripcion.value = banner?.descripcion || "";

        const textoBoton = crear("input", {
            clase: "control", id: "bBoton", name: "texto_boton", type: "text",
            maxlength: "60", value: banner?.texto_boton || "",
            placeholder: "Ver la promoción"
        });

        const enlace = crear("input", {
            clase: "control", id: "bEnlace", name: "enlace", type: "text",
            maxlength: "500", value: banner?.enlace || "",
            placeholder: "/catalogo"
        });

        const ubicacion = crear("select", {
            clase: "control", id: "bUbicacion", name: "ubicacion"
        }, UBICACIONES.map(u => crear("option", {
            value: u.valor,
            selected: (banner?.ubicacion || "inicio") === u.valor,
            texto: u.nombre
        })));

        const activo = crear("input", {
            type: "checkbox", id: "bActivo",
            checked: banner ? banner.activo : true
        });

        const imagen = selectorDeImagen(banner?.imagen_url, {
            textoVacio: "Elegir la imagen"
        });


        const cajon = EP.cajon({

            titulo: banner ? "Editar banner" : "Nuevo banner",
            textoGuardar: banner ? "Guardar cambios" : "Crear banner",

            contenido: [

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta" }, [
                        "Imagen",
                        crear("span", { clase: "campo__obligatorio", texto: " *" })
                    ]),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Conviene una imagen ancha, tipo 1600 × 600. " +
                               "Si es muy alta se va a recortar."
                    }),
                    ...imagen.nodos
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "bTitulo",
                                     texto: "Título" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Opcional. Se escribe encima de la imagen."
                    }),
                    titulo
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "bDescripcion",
                                     texto: "Texto" }),
                    descripcion
                ]),

                crear("div", { clase: "fila" }, [
                    crear("div", { clase: "campo" }, [
                        crear("label", { clase: "campo__etiqueta", for: "bBoton",
                                         texto: "Texto del botón" }),
                        crear("span", {
                            clase: "campo__pista",
                            texto: "Si lo dejás vacío, no aparece el botón."
                        }),
                        textoBoton
                    ]),
                    crear("div", { clase: "campo" }, [
                        crear("label", { clase: "campo__etiqueta", for: "bEnlace",
                                         texto: "A dónde lleva" }),
                        crear("span", {
                            clase: "campo__pista",
                            texto: "Una página de tu tienda (/catalogo) o una dirección completa."
                        }),
                        enlace
                    ])
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "bUbicacion",
                                     texto: "Dónde se muestra" }),
                    ubicacion
                ]),

                crear("label", { clase: "interruptor" }, [
                    activo,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        "Mostrar en la tienda",
                        crear("span", {
                            clase: "interruptor__nota",
                            texto: "Podés dejarlo preparado y encenderlo cuando quieras."
                        })
                    ])
                ])
            ],

            async alGuardar() {

                const elegida = imagen.archivo();

                if (!banner && !elegida) {
                    throw new Error("Elegí la imagen del banner");
                }

                const cuerpo = new FormData();
                cuerpo.append("titulo", titulo.value.trim());
                cuerpo.append("descripcion", descripcion.value.trim());
                cuerpo.append("texto_boton", textoBoton.value.trim());
                cuerpo.append("enlace", enlace.value.trim());
                cuerpo.append("ubicacion", ubicacion.value);
                cuerpo.append("activo", activo.checked);
                if (elegida) cuerpo.append("imagen", elegida);

                await guardar(banner, cuerpo, cajon);
            }
        });
    }


    // =================================================
    // PAGINAS
    // =================================================

    function filaPagina(pagina, indice) {

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", { clase: "celda-producto" }, [
                    pagina.imagen_url
                        ? crear("img", { clase: "miniatura", src: pagina.imagen_url,
                                         alt: "", loading: "lazy" })
                        : crear("div", { clase: "miniatura miniatura--vacia" },
                                [icono("contenido")]),
                    crear("div", {}, [
                        crear("div", { clase: "celda-producto__nombre", texto: pagina.titulo }),
                        crear("div", { clase: "celda-producto__meta", texto: pagina.url }),
                        crear("div", { clase: "celda-producto__movil" }, [
                            estado(pagina.activo)
                        ])
                    ])
                ])
            ]),

            crear("td", {}, [
                crear("a", {
                    href: pagina.url,
                    target: "_blank",
                    rel: "noopener",
                    texto: "Ver en la tienda ↗"
                })
            ]),

            crear("td", {}, [estado(pagina.activo)]),

            acciones(pagina, indice, {
                editar: formularioPagina,
                eliminar: (item) => eliminar(item, `la página "${item.titulo}"`)
            })
        ]);
    }


    function formularioPagina(pagina) {

        const titulo = crear("input", {
            clase: "control", id: "pTitulo", name: "titulo", type: "text",
            maxlength: "160", value: pagina?.titulo || ""
        });

        const subtitulo = crear("input", {
            clase: "control", id: "pSubtitulo", name: "subtitulo", type: "text",
            maxlength: "300", value: pagina?.subtitulo || ""
        });

        const clave = crear("input", {
            clase: "control", id: "pClave", name: "clave", type: "text",
            maxlength: "80", value: pagina?.clave || ""
        });

        const activo = crear("input", {
            type: "checkbox", id: "pActivo",
            checked: pagina ? pagina.activo : true
        });

        const imagen = selectorDeImagen(pagina?.imagen_url);

        const editor = EP.editor({ valor: pagina?.contenido || "" });


        const cajon = EP.cajon({

            titulo: pagina ? "Editar página" : "Nueva página",
            textoGuardar: pagina ? "Guardar cambios" : "Crear página",

            contenido: [

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "pTitulo" }, [
                        "Título",
                        crear("span", { clase: "campo__obligatorio", texto: " *" })
                    ]),
                    crear("span", {
                        clase: "campo__pista",
                        texto: pagina
                            ? "Si lo cambiás, la dirección de la página no se modifica."
                            : "Por ejemplo: Nosotros, Trabajos personalizados, Envíos."
                    }),
                    titulo
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "pSubtitulo",
                                     texto: "Subtítulo" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Opcional. Una línea abajo del título."
                    }),
                    subtitulo
                ]),

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta", texto: "Imagen" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Opcional. Se muestra arriba de todo el texto."
                    }),
                    ...imagen.nodos
                ]),

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta", texto: "Texto de la página" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Escribí como en cualquier procesador de texto. " +
                               "Los botones de arriba dan formato a lo que tengas seleccionado."
                    }),
                    editor.elemento
                ]),

                // La direccion solo se muestra al editar: al crear se
                // arma sola con el titulo y no hay nada que decidir.
                pagina && crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "pClave",
                                     texto: "Dirección de la página" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: `Hoy es ${pagina.url}. Si la cambiás, los enlaces que ` +
                               "ya compartiste dejan de funcionar."
                    }),
                    clave
                ]),

                crear("label", { clase: "interruptor" }, [
                    activo,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        "Mostrar en la tienda",
                        crear("span", {
                            clase: "interruptor__nota",
                            texto: "Si la ocultás, desaparece del menú y deja de abrirse."
                        })
                    ])
                ])
            ],

            async alGuardar() {

                const cuerpo = new FormData();
                cuerpo.append("titulo", titulo.value.trim());
                cuerpo.append("subtitulo", subtitulo.value.trim());
                cuerpo.append("contenido", editor.valor());
                cuerpo.append("activo", activo.checked);
                if (pagina) cuerpo.append("clave", clave.value.trim());

                const elegida = imagen.archivo();
                if (elegida) cuerpo.append("imagen", elegida);

                await guardar(pagina, cuerpo, cajon);
            }
        });
    }


    // =================================================
    // PREGUNTAS FRECUENTES
    // =================================================

    function filaFaq(item, indice) {

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", {}, [
                    crear("div", { clase: "celda-producto__nombre", texto: item.pregunta }),
                    crear("div", {
                        clase: "celda-producto__meta",
                        texto: item.respuesta.length > 110
                            ? item.respuesta.slice(0, 110) + "…"
                            : item.respuesta
                    }),
                    crear("div", { clase: "celda-producto__movil" }, [estado(item.activo)])
                ])
            ]),

            crear("td", {}, []),

            crear("td", {}, [estado(item.activo)]),

            acciones(item, indice, {
                editar: formularioFaq,
                eliminar: (fila) => eliminar(fila, "esta pregunta")
            })
        ]);
    }


    function formularioFaq(item) {

        const pregunta = crear("input", {
            clase: "control", id: "fPregunta", name: "pregunta", type: "text",
            maxlength: "300", value: item?.pregunta || "",
            placeholder: "¿Hacen envíos a todo el país?"
        });

        const respuesta = crear("textarea", {
            clase: "control", id: "fRespuesta", name: "respuesta",
            maxlength: "3000", rows: "6"
        });
        respuesta.value = item?.respuesta || "";

        const activo = crear("input", {
            type: "checkbox", id: "fActivo",
            checked: item ? item.activo : true
        });


        const cajon = EP.cajon({

            titulo: item ? "Editar pregunta" : "Nueva pregunta",
            textoGuardar: item ? "Guardar cambios" : "Agregar pregunta",

            contenido: [

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "fPregunta" }, [
                        "Pregunta",
                        crear("span", { clase: "campo__obligatorio", texto: " *" })
                    ]),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Escribila tal como te la hacen."
                    }),
                    pregunta
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "fRespuesta" }, [
                        "Respuesta",
                        crear("span", { clase: "campo__obligatorio", texto: " *" })
                    ]),
                    respuesta
                ]),

                crear("label", { clase: "interruptor" }, [
                    activo,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        "Mostrar en la tienda",
                        crear("span", {
                            clase: "interruptor__nota",
                            texto: "Si la ocultás, se guarda pero no se muestra."
                        })
                    ])
                ])
            ],

            async alGuardar() {
                await guardar(item, {
                    pregunta: pregunta.value.trim(),
                    respuesta: respuesta.value.trim(),
                    activo: activo.checked
                }, cajon);
            }
        });
    }


    // =================================================
    // GUARDAR Y ELIMINAR
    // Iguales para las tres listas.
    // =================================================

    async function guardar(existente, cuerpo, cajon) {

        const respuesta = existente
            ? await EP.api.put(`${seccion().ruta}/${existente.id}`, cuerpo)
            : await EP.api.post(seccion().ruta, cuerpo);

        EP.notificar.exito(respuesta.mensaje);
        cajon.cerrar();
        cargar();
    }


    async function eliminar(item, comoSeLlama) {

        const confirmado = await EP.confirmar({
            titulo: "¿Eliminar?",
            mensaje: `Vas a eliminar ${comoSeLlama}. Esto no se puede deshacer.`,
            textoConfirmar: "Sí, eliminar",
            peligro: true
        });

        if (!confirmado) return;

        try {
            const respuesta = await EP.api.eliminar(`${seccion().ruta}/${item.id}`);
            EP.notificar.exito(respuesta.mensaje);
            cargar();

        } catch (error) {
            EP.notificar.error(error.message);
        }
    }


    // =================================================
    // ORDEN
    // =================================================

    async function mover(indice, direccion) {

        const destino = indice + direccion;

        if (destino < 0 || destino >= datos.length) return;

        // Se reordena en pantalla primero: la respuesta es inmediata
        // y, si el guardado falla, se vuelve a cargar del servidor.
        const copia = datos.slice();
        [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
        datos = copia;
        dibujar();

        try {
            await EP.api.patch(`${seccion().ruta}/orden`, {
                ids: datos.map(item => item.id)
            });

        } catch (error) {
            EP.notificar.error(error.message);
            cargar();
        }
    }


    // =================================================
    // LISTADO
    // =================================================

    const FILAS = { banners: filaBanner, paginas: filaPagina, faq: filaFaq };

    const COLUMNAS = {
        banners: ["Banner", "Dónde", "Estado"],
        paginas: ["Página", "Dirección", "Estado"],
        faq: ["Pregunta", "", "Estado"]
    };

    const FORMULARIOS = {
        banners: formularioBanner,
        paginas: formularioPagina,
        faq: formularioFaq
    };


    function dibujar() {

        if (datos.length === 0) {
            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("contenido")]),
                crear("h3", { clase: "vacio__titulo", texto: seccion().vacio.titulo }),
                crear("p", { clase: "vacio__texto", texto: seccion().vacio.texto }),
                crear("button", {
                    clase: "boton boton--primario",
                    type: "button",
                    texto: seccion().boton,
                    onClick: () => FORMULARIOS[actual](null)
                })
            ]));
            return;
        }

        const fila = FILAS[actual];

        reemplazar(lista, crear("div", { clase: "tabla-scroll" }, [
            crear("table", { clase: "tabla" }, [
                crear("thead", {}, [
                    crear("tr", {}, [
                        ...COLUMNAS[actual].map(texto => crear("th", { texto })),
                        crear("th", { estilo: "text-align:right", texto: "Acciones" })
                    ])
                ]),
                crear("tbody", {}, datos.map(fila))
            ])
        ]));
    }


    async function cargar() {

        const pedida = actual;

        reemplazar(lista, crear("div", { clase: "cargando" },
                                [crear("span", { clase: "giro" })]));

        try {
            const recibidos = await EP.api.get(seccion().ruta);

            // Si el cliente cambió de pestaña mientras cargaba, lo
            // que llegó ya no es lo que está mirando.
            if (pedida !== actual) return;

            datos = recibidos;
            dibujar();

        } catch (error) {

            if (pedida !== actual) return;

            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo", texto: "No pudimos cargar esta lista" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
        }
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        dibujarPestanas();
        aplicarSeccion();

        botonNuevo.addEventListener("click", () => FORMULARIOS[actual](null));

        await cargar();

    })();

})();
