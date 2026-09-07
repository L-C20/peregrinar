// =====================================================
// PANEL · CONFIGURACION
//
// Cinco pestañas de la misma pantalla:
//
//   Mi tienda        nombre, logo y los textos de la portada
//   Contacto         teléfono, WhatsApp, dirección, horarios
//   Redes            los enlaces a Instagram, Facebook, etc.
//   Formas de pago   cómo puede pagar el comprador
//   Buscadores       lo que se ve en Google y al compartir
//
// Todo se lee de una sola vez al entrar (GET /configuracion)
// y cada pestaña guarda solo lo suyo: así, tocar el teléfono
// no puede pisar el logo por accidente.
//
// Lo que NO está acá y a veces se busca:
//
//   - Colores y tipografías: son la pantalla de Apariencia.
//   - Qué secciones tiene la tienda (catálogo, pedidos): es
//     lo contratado, no una preferencia. Se cambia desde la
//     plataforma.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const pestanas = document.getElementById("pestanas");
    const panel = document.getElementById("panel");
    const ayuda = document.getElementById("ayuda");


    const SECCIONES = [
        { id: "tienda", nombre: "Mi tienda",
          ayuda: "El nombre, el logo y los textos que se ven al entrar." },

        { id: "contacto", nombre: "Contacto",
          ayuda: "Lo que aparece en la página de contacto y en el pie de la tienda." },

        { id: "redes", nombre: "Redes",
          ayuda: "Los enlaces a tus redes. Solo se muestran las que completes." },

        { id: "pagos", nombre: "Formas de pago",
          ayuda: "Cómo puede pagarte el comprador. Se muestran al hacer el pedido." },

        { id: "buscadores", nombre: "Buscadores",
          ayuda: "Lo que ve Google y lo que se muestra al compartir tu tienda." }
    ];


    const REDES = [
        { id: "instagram", nombre: "Instagram", ejemplo: "https://instagram.com/mitienda" },
        { id: "facebook", nombre: "Facebook", ejemplo: "https://facebook.com/mitienda" },
        { id: "whatsapp", nombre: "WhatsApp", ejemplo: "https://wa.me/5491122334455" },
        { id: "tiktok", nombre: "TikTok", ejemplo: "https://tiktok.com/@mitienda" },
        { id: "youtube", nombre: "YouTube", ejemplo: "https://youtube.com/@mitienda" },
        { id: "x", nombre: "X (Twitter)", ejemplo: "https://x.com/mitienda" },
        { id: "linkedin", nombre: "LinkedIn", ejemplo: "https://linkedin.com/company/mitienda" }
    ];


    const TIPOS_PAGO = [
        { id: "efectivo", nombre: "Efectivo" },
        { id: "transferencia", nombre: "Transferencia bancaria" },
        { id: "mercadopago", nombre: "Mercado Pago" },
        { id: "tarjeta", nombre: "Tarjeta" },
        { id: "otro", nombre: "Otro" }
    ];


    let actual = "tienda";
    let config = null;
    let medios = [];


    // =================================================
    // PIEZAS DE FORMULARIO
    // =================================================

    function campo(etiqueta, control, { pista, obligatorio = false, id } = {}) {
        return crear("div", { clase: "campo" }, [
            crear("label", { clase: "campo__etiqueta", for: id }, [
                etiqueta,
                obligatorio && crear("span", { clase: "campo__obligatorio", texto: " *" })
            ]),
            pista && crear("span", { clase: "campo__pista", texto: pista }),
            control
        ]);
    }


    function entrada(id, valor, extra = {}) {
        return crear("input", {
            clase: "control", id, name: id, type: "text",
            value: valor || "",
            ...extra
        });
    }


    function area(id, valor, filas = 3, extra = {}) {
        const nodo = crear("textarea", {
            clase: "control", id, name: id, rows: String(filas), ...extra
        });
        nodo.value = valor || "";
        return nodo;
    }


    function tarjeta(titulo, contenido, alGuardar) {

        const boton = crear("button", {
            clase: "boton boton--primario",
            type: "submit",
            texto: "Guardar cambios"
        });

        const formulario = crear("form", { novalidate: true }, [
            crear("div", { clase: "tarjeta" }, [
                crear("div", { clase: "tarjeta__encabezado" }, [
                    crear("h3", { clase: "tarjeta__titulo", texto: titulo })
                ]),
                crear("div", { clase: "tarjeta__cuerpo" }, contenido),
                crear("div", { clase: "tarjeta__pie" }, [boton])
            ])
        ]);

        formulario.addEventListener("submit", async (evento) => {

            evento.preventDefault();

            await EP.util.ocupado(boton, async () => {
                try {
                    await alGuardar();
                } catch (error) {
                    EP.notificar.error(error.message);
                }
            });
        });

        return formulario;
    }


    // Control de imagen con boton para quitarla. Se usa para el
    // logo, el favicon y la imagen para compartir.
    function selectorDeImagen(urlActual, { alQuitar = null, textoVacio = "Agregar" } = {}) {

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
                        }),
                        alQuitar && !elegida && crear("button", {
                            clase: "imagen__boton imagen__boton--peligro",
                            type: "button",
                            texto: "Quitar",
                            onClick: () => alQuitar()
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

        return { nodos: [vista, archivo], archivo: () => elegida };
    }


    // =================================================
    // MI TIENDA
    // =================================================

    function pantallaTienda() {

        const datos = config.identidad || {};

        const nombre = entrada("nombre_tienda", datos.nombre_tienda, { maxlength: "120" });
        const descripcion = area("descripcion_tienda", datos.descripcion_tienda, 2,
                                 { maxlength: "500" });

        const bienvenida = entrada("texto_bienvenida", datos.texto_bienvenida,
                                   { maxlength: "160" });
        const subtitulo = area("texto_subtitulo", datos.texto_subtitulo, 2,
                               { maxlength: "300" });
        const textoBoton = entrada("texto_boton_principal", datos.texto_boton_principal,
                                   { maxlength: "60" });
        const destacado = entrada("mensaje_destacado", datos.mensaje_destacado,
                                  { maxlength: "300" });

        const logo = selectorDeImagen(datos.logo_url, {
            textoVacio: "Subir logo",
            alQuitar: () => quitarImagen("logo")
        });

        const favicon = selectorDeImagen(datos.favicon_url, {
            textoVacio: "Subir ícono",
            alQuitar: () => quitarImagen("favicon")
        });


        return tarjeta("Mi tienda", [

            campo("Nombre de la tienda", nombre, {
                id: "nombre_tienda",
                obligatorio: true,
                pista: "Se ve arriba de todo y en la pestaña del navegador."
            }),

            campo("Descripción", descripcion, {
                id: "descripcion_tienda",
                pista: "Una línea sobre qué vendés. Se usa en el pie de la tienda."
            }),

            crear("div", { clase: "fila" }, [

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta", texto: "Logo" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Si no cargás ninguno, se muestra el nombre escrito. " +
                               "Conviene PNG con fondo transparente."
                    }),
                    ...logo.nodos
                ]),

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta", texto: "Ícono de la pestaña" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "La imagen chiquita que se ve en la pestaña del navegador. " +
                               "Cuadrada, 64 × 64."
                    }),
                    ...favicon.nodos
                ])
            ]),

            crear("div", { clase: "seccion" }, [
                crear("h4", { clase: "seccion__titulo", texto: "Textos de la portada" }),

                campo("Título grande", bienvenida, {
                    id: "texto_bienvenida",
                    pista: "Lo primero que se lee al entrar. Por ejemplo: " +
                           "«Libros y regalos para acompañar tu fe»."
                }),

                campo("Debajo del título", subtitulo, { id: "texto_subtitulo" }),

                campo("Texto del botón", textoBoton, {
                    id: "texto_boton_principal",
                    pista: "El botón lleva al catálogo. Si lo dejás vacío dice «Ver catálogo»."
                }),

                campo("Mensaje destacado", destacado, {
                    id: "mensaje_destacado",
                    pista: "Opcional. Una frase que se muestra más abajo en la portada."
                })
            ])

        ], async () => {

            const cuerpo = new FormData();
            cuerpo.append("nombre_tienda", nombre.value.trim());
            cuerpo.append("descripcion_tienda", descripcion.value.trim());
            cuerpo.append("texto_bienvenida", bienvenida.value.trim());
            cuerpo.append("texto_subtitulo", subtitulo.value.trim());
            cuerpo.append("texto_boton_principal", textoBoton.value.trim());
            cuerpo.append("mensaje_destacado", destacado.value.trim());

            const archivoLogo = logo.archivo();
            const archivoFavicon = favicon.archivo();

            if (archivoLogo) cuerpo.append("logo", archivoLogo);
            if (archivoFavicon) cuerpo.append("favicon", archivoFavicon);

            const respuesta = await EP.api.put(
                "/api/admin/configuracion/identidad", cuerpo
            );

            config.identidad = respuesta.identidad;
            EP.notificar.exito(respuesta.mensaje);
            dibujar();
        });
    }


    async function quitarImagen(cual) {

        const confirmado = await EP.confirmar({
            titulo: cual === "logo" ? "¿Quitar el logo?" : "¿Quitar el ícono?",
            mensaje: cual === "logo"
                ? "En tu tienda va a volver a aparecer el nombre escrito."
                : "La pestaña del navegador vuelve al ícono por defecto.",
            textoConfirmar: "Quitar",
            peligro: true
        });

        if (!confirmado) return;

        try {
            const respuesta = await EP.api.eliminar(
                `/api/admin/configuracion/identidad/${cual}`
            );

            config.identidad = respuesta.identidad;
            EP.notificar.exito(respuesta.mensaje);
            dibujar();

        } catch (error) {
            EP.notificar.error(error.message);
        }
    }


    // =================================================
    // CONTACTO
    // =================================================

    function pantallaContacto() {

        const datos = config.contacto || {};

        const telefono = entrada("telefono", datos.telefono, { maxlength: "40" });
        const whatsapp = entrada("whatsapp", datos.whatsapp, { maxlength: "40" });
        const email = entrada("email", datos.email, { maxlength: "160", type: "email" });
        const direccion = entrada("direccion", datos.direccion, { maxlength: "200" });
        const ciudad = entrada("ciudad", datos.ciudad, { maxlength: "120" });
        const provincia = entrada("provincia", datos.provincia, { maxlength: "120" });
        const codigoPostal = entrada("codigo_postal", datos.codigo_postal, { maxlength: "20" });
        const horarios = area("horarios", datos.horarios, 3, { maxlength: "300" });
        const mapa = entrada("mapa_url", datos.mapa_url, { maxlength: "500" });


        return tarjeta("Contacto", [

            crear("div", { clase: "fila" }, [
                campo("Teléfono", telefono, { id: "telefono" }),
                campo("WhatsApp", whatsapp, {
                    id: "whatsapp",
                    pista: "Con código de país y sin espacios: 5491122334455"
                })
            ]),

            campo("Email", email, {
                id: "email",
                pista: "Adonde te escriben los clientes."
            }),

            campo("Dirección", direccion, {
                id: "direccion",
                pista: "Calle y número. Dejalo vacío si no atendés al público."
            }),

            crear("div", { clase: "fila" }, [
                campo("Ciudad", ciudad, { id: "ciudad" }),
                campo("Provincia", provincia, { id: "provincia" })
            ]),

            campo("Código postal", codigoPostal, { id: "codigo_postal" }),

            campo("Horarios", horarios, {
                id: "horarios",
                pista: "Escribilos como querés que se lean. Por ejemplo: " +
                       "«Lunes a viernes de 9 a 18. Sábados de 9 a 13»."
            }),

            campo("Enlace del mapa", mapa, {
                id: "mapa_url",
                pista: "Opcional. En Google Maps: Compartir → Insertar un mapa → " +
                       "copiar la dirección que aparece entre comillas."
            })

        ], async () => {

            const respuesta = await EP.api.put("/api/admin/configuracion/contacto", {
                telefono: telefono.value.trim(),
                whatsapp: whatsapp.value.trim(),
                email: email.value.trim(),
                direccion: direccion.value.trim(),
                ciudad: ciudad.value.trim(),
                provincia: provincia.value.trim(),
                codigo_postal: codigoPostal.value.trim(),
                horarios: horarios.value.trim(),
                mapa_url: mapa.value.trim()
            });

            config.contacto = respuesta.contacto;
            EP.notificar.exito(respuesta.mensaje);
        });
    }


    // =================================================
    // REDES SOCIALES
    // =================================================

    function pantallaRedes() {

        const cargadas = new Map(
            (config.redes || []).map(red => [red.red, red.url])
        );

        const campos = REDES.map(red => ({
            id: red.id,
            control: entrada(`red_${red.id}`, cargadas.get(red.id), {
                maxlength: "500",
                placeholder: red.ejemplo
            }),
            nombre: red.nombre
        }));


        return tarjeta("Redes sociales", [

            crear("p", { clase: "campo__pista", estilo: "margin-bottom:18px" ,
                         texto: "Completá solo las que uses. Las que dejes vacías no " +
                                "se muestran en la tienda." }),

            ...campos.map(item =>
                campo(item.nombre, item.control, { id: `red_${item.id}` })
            )

        ], async () => {

            const redes = campos
                .map(item => ({ red: item.id, url: item.control.value.trim() }))
                .filter(item => item.url !== "");

            const respuesta = await EP.api.put("/api/admin/configuracion/redes", { redes });

            config.redes = respuesta.redes;
            EP.notificar.exito(respuesta.mensaje);
        });
    }


    // =================================================
    // FORMAS DE PAGO
    // =================================================

    function pantallaPagos() {

        const usados = new Set(medios.map(medio => medio.tipo));
        const disponibles = TIPOS_PAGO.filter(tipo => !usados.has(tipo.id));

        const cuerpo = medios.length === 0
            ? crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("pedidos")]),
                crear("h3", { clase: "vacio__titulo", texto: "No hay formas de pago" }),
                crear("p", {
                    clase: "vacio__texto",
                    texto: "Sin ninguna forma de pago, el comprador llega al final " +
                           "del pedido y no sabe cómo pagarte."
                })
            ])
            : crear("div", { clase: "tabla-scroll" }, [
                crear("table", { clase: "tabla" }, [
                    crear("thead", {}, [
                        crear("tr", {}, [
                            crear("th", { texto: "Forma de pago" }),
                            crear("th", { texto: "Estado" }),
                            crear("th", { estilo: "text-align:right", texto: "Acciones" })
                        ])
                    ]),
                    crear("tbody", {}, medios.map(medio => crear("tr", {}, [

                        crear("td", {}, [
                            crear("div", {}, [
                                crear("div", { clase: "celda-producto__nombre",
                                               texto: medio.nombre }),
                                crear("div", {
                                    clase: "celda-producto__meta",
                                    texto: medio.instrucciones || "Sin instrucciones"
                                })
                            ])
                        ]),

                        crear("td", {}, [
                            crear("span", {
                                clase: "etiqueta " + (medio.activo
                                    ? "etiqueta--activo" : "etiqueta--inactivo"),
                                texto: medio.activo ? "Se ofrece" : "Oculta"
                            })
                        ]),

                        crear("td", { clase: "tabla__acciones" }, [
                            crear("button", {
                                clase: "boton boton--fantasma",
                                type: "button",
                                title: "Editar",
                                "aria-label": `Editar ${medio.nombre}`,
                                onClick: () => formularioPago(medio)
                            }, [icono("lapiz")]),
                            crear("button", {
                                clase: "boton boton--fantasma es-peligro",
                                type: "button",
                                title: "Eliminar",
                                "aria-label": `Eliminar ${medio.nombre}`,
                                onClick: () => eliminarPago(medio)
                            }, [icono("basura")])
                        ])
                    ])))
                ])
            ]);


        return crear("div", {}, [

            crear("div", { clase: "tarjeta" }, [
                crear("div", { clase: "tarjeta__encabezado" }, [
                    crear("h3", { clase: "tarjeta__titulo", texto: "Formas de pago" }),
                    disponibles.length > 0 && crear("button", {
                        clase: "boton boton--primario boton--chico",
                        type: "button",
                        texto: "Agregar",
                        onClick: () => formularioPago(null)
                    })
                ]),
                cuerpo
            ]),

            disponibles.length === 0 && crear("p", {
                clase: "campo__pista",
                estilo: "margin-top:12px",
                texto: "Ya están cargadas todas las formas de pago disponibles."
            })
        ]);
    }


    function formularioPago(medio) {

        const usados = new Set(medios.map(item => item.tipo));
        const disponibles = TIPOS_PAGO.filter(tipo => !usados.has(tipo.id));

        const tipo = crear("select", {
            clase: "control", id: "mTipo", name: "tipo"
        }, disponibles.map(item => crear("option", {
            value: item.id, texto: item.nombre
        })));

        const nombre = crear("input", {
            clase: "control", id: "mNombre", name: "nombre", type: "text",
            maxlength: "80", value: medio?.nombre || ""
        });

        const instrucciones = crear("textarea", {
            clase: "control", id: "mInstrucciones", name: "instrucciones",
            maxlength: "1000", rows: "4"
        });
        instrucciones.value = medio?.instrucciones || "";

        const activo = crear("input", {
            type: "checkbox", id: "mActivo",
            checked: medio ? medio.activo : true
        });

        // Al elegir el tipo se propone su nombre, para no tener que
        // escribir "Transferencia bancaria" a mano.
        if (!medio) {
            const proponer = () => {
                const elegido = TIPOS_PAGO.find(item => item.id === tipo.value);
                if (elegido) nombre.value = elegido.nombre;
            };
            proponer();
            tipo.addEventListener("change", proponer);
        }


        const cajon = EP.cajon({

            titulo: medio ? `Editar ${medio.nombre}` : "Nueva forma de pago",
            textoGuardar: medio ? "Guardar cambios" : "Agregar",

            contenido: [

                medio
                    ? crear("div", { clase: "campo" }, [
                        crear("span", { clase: "campo__etiqueta", texto: "Tipo" }),
                        crear("span", {
                            clase: "campo__pista",
                            texto: "El tipo no se cambia: es lo que queda guardado en " +
                                   "los pedidos que ya se hicieron."
                        }),
                        crear("p", {
                            estilo: "margin:0;font-weight:600",
                            texto: TIPOS_PAGO.find(t => t.id === medio.tipo)?.nombre
                                   || medio.tipo
                        })
                    ])
                    : crear("div", { clase: "campo" }, [
                        crear("label", { clase: "campo__etiqueta", for: "mTipo",
                                         texto: "Tipo" }),
                        tipo
                    ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "mNombre" }, [
                        "Cómo se llama para el comprador",
                        crear("span", { clase: "campo__obligatorio", texto: " *" })
                    ]),
                    nombre
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "mInstrucciones",
                                     texto: "Instrucciones" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Lo que necesita saber para pagarte. Si es transferencia, " +
                               "acá van el CBU y el alias."
                    }),
                    instrucciones
                ]),

                crear("label", { clase: "interruptor" }, [
                    activo,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        "Ofrecer esta forma de pago",
                        crear("span", {
                            clase: "interruptor__nota",
                            texto: "Si la apagás, deja de aparecer al hacer el pedido " +
                                   "pero no se borra."
                        })
                    ])
                ])
            ],

            async alGuardar() {

                const cuerpo = {
                    nombre: nombre.value.trim(),
                    instrucciones: instrucciones.value.trim(),
                    activo: activo.checked
                };

                const respuesta = medio
                    ? await EP.api.put(
                        `/api/admin/configuracion/medios-pago/${medio.id}`, cuerpo)
                    : await EP.api.post(
                        "/api/admin/configuracion/medios-pago",
                        { ...cuerpo, tipo: tipo.value });

                EP.notificar.exito(respuesta.mensaje);
                cajon.cerrar();
                await cargarMedios();
                dibujar();
            }
        });
    }


    async function eliminarPago(medio) {

        try {
            const respuesta = await EP.api.eliminar(
                `/api/admin/configuracion/medios-pago/${medio.id}`
            );
            EP.notificar.exito(respuesta.mensaje);
            await cargarMedios();
            dibujar();
            return;

        } catch (error) {

            if (error.estado !== 409 || !error.detalles?.requiere_confirmacion) {
                EP.notificar.error(error.message);
                return;
            }

            const confirmado = await EP.confirmar({
                titulo: `¿Eliminar "${medio.nombre}"?`,
                mensaje: error.message +
                         " Si solo querés dejar de ofrecerla, es mejor apagarla al editarla.",
                textoConfirmar: "Sí, eliminar",
                peligro: true
            });

            if (!confirmado) return;

            try {
                const respuesta = await EP.api.eliminar(
                    `/api/admin/configuracion/medios-pago/${medio.id}?confirmar=true`
                );
                EP.notificar.exito(respuesta.mensaje);
                await cargarMedios();
                dibujar();

            } catch (falla) {
                EP.notificar.error(falla.message);
            }
        }
    }


    // =================================================
    // BUSCADORES
    // =================================================

    function pantallaBuscadores() {

        const datos = config.sitio || {};

        const metaTitulo = entrada("meta_titulo", datos.meta_titulo, { maxlength: "70" });
        const metaDescripcion = area("meta_descripcion", datos.meta_descripcion, 3,
                                     { maxlength: "180" });
        const metaPalabras = entrada("meta_palabras", datos.meta_palabras, { maxlength: "300" });

        const ogTitulo = entrada("og_titulo", datos.og_titulo, { maxlength: "120" });
        const ogDescripcion = area("og_descripcion", datos.og_descripcion, 2,
                                   { maxlength: "300" });

        const ogImagen = selectorDeImagen(datos.og_imagen_url, {
            textoVacio: "Subir imagen"
        });

        const aviso = entrada("aviso_superior", datos.aviso_superior, { maxlength: "200" });

        const avisoActivo = crear("input", {
            type: "checkbox", id: "aviso_activo",
            checked: Boolean(datos.aviso_activo)
        });


        return tarjeta("Buscadores y redes", [

            campo("Título para Google", metaTitulo, {
                id: "meta_titulo",
                pista: "El renglón azul del resultado de búsqueda. Hasta 70 letras."
            }),

            campo("Descripción para Google", metaDescripcion, {
                id: "meta_descripcion",
                pista: "El texto gris debajo del título. Hasta 180 letras."
            }),

            campo("Palabras clave", metaPalabras, {
                id: "meta_palabras",
                pista: "Separadas por comas. Hoy casi ningún buscador las usa: " +
                       "vale más la descripción de arriba."
            }),

            crear("div", { clase: "seccion" }, [
                crear("h4", { clase: "seccion__titulo",
                              texto: "Cuando comparten el enlace de tu tienda" }),

                campo("Título", ogTitulo, {
                    id: "og_titulo",
                    pista: "Si lo dejás vacío se usa el de Google."
                }),

                campo("Descripción", ogDescripcion, { id: "og_descripcion" }),

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta", texto: "Imagen" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "La que se ve en WhatsApp o Facebook al pegar tu " +
                               "dirección. Apaisada, 1200 × 630."
                    }),
                    ...ogImagen.nodos
                ])
            ]),

            crear("div", { clase: "seccion" }, [
                crear("h4", { clase: "seccion__titulo", texto: "Franja de aviso" }),

                campo("Aviso arriba de la tienda", aviso, {
                    id: "aviso_superior",
                    pista: "Por ejemplo: «Envíos a todo el país» o «Cerrado por " +
                           "vacaciones hasta el 15»."
                }),

                crear("label", { clase: "interruptor" }, [
                    avisoActivo,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        "Mostrar la franja",
                        crear("span", {
                            clase: "interruptor__nota",
                            texto: "Podés dejar el texto escrito y encenderlo cuando haga falta."
                        })
                    ])
                ])
            ])

        ], async () => {

            const cuerpo = new FormData();
            cuerpo.append("meta_titulo", metaTitulo.value.trim());
            cuerpo.append("meta_descripcion", metaDescripcion.value.trim());
            cuerpo.append("meta_palabras", metaPalabras.value.trim());
            cuerpo.append("og_titulo", ogTitulo.value.trim());
            cuerpo.append("og_descripcion", ogDescripcion.value.trim());
            cuerpo.append("aviso_superior", aviso.value.trim());
            cuerpo.append("aviso_activo", avisoActivo.checked);

            const imagen = ogImagen.archivo();
            if (imagen) cuerpo.append("og_imagen", imagen);

            const respuesta = await EP.api.put("/api/admin/configuracion/sitio", cuerpo);

            config.sitio = respuesta.sitio;
            EP.notificar.exito(respuesta.mensaje);
            dibujar();
        });
    }


    // =================================================
    // ARMADO
    // =================================================

    const PANTALLAS = {
        tienda: pantallaTienda,
        contacto: pantallaContacto,
        redes: pantallaRedes,
        pagos: pantallaPagos,
        buscadores: pantallaBuscadores
    };


    function dibujarPestanas() {

        reemplazar(pestanas, SECCIONES.map(item =>
            crear("button", {
                clase: "pestana" + (item.id === actual ? " pestana--activa" : ""),
                type: "button",
                onClick: () => {
                    if (item.id === actual) return;
                    actual = item.id;
                    dibujarPestanas();
                    dibujar();
                }
            }, [crear("span", { texto: item.nombre })])
        ));
    }


    function dibujar() {
        ayuda.textContent = SECCIONES.find(item => item.id === actual).ayuda;
        reemplazar(panel, PANTALLAS[actual]());
    }


    async function cargarMedios() {
        medios = await EP.api.get("/api/admin/configuracion/medios-pago");
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        dibujarPestanas();

        try {
            [config] = await Promise.all([
                EP.api.get("/api/admin/configuracion"),
                cargarMedios()
            ]);

        } catch (error) {
            reemplazar(panel, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo",
                              texto: "No pudimos cargar la configuración" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
            return;
        }

        dibujar();

    })();

})();
