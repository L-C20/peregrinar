// =====================================================
// TIENDA · CARRITO Y CONFIRMACION DEL PEDIDO
//
// Los totales que se muestran acá son informativos: los
// definitivos los calcula el servidor leyendo los precios de
// la base. Si algo cambió mientras el carrito estaba abierto
// —el producto se despublicó, se quedó sin stock— el
// servidor lo rechaza y acá se explica qué pasó y qué hacer.
// =====================================================

(function () {

    const { crear, reemplazar, icono, precio } = EP.tienda;

    const principal = document.querySelector("main");

    let config = null;


    // =================================================
    // LINEAS DEL CARRITO
    // =================================================

    function linea(item) {

        const cantidad = crear("input", {
            clase: "cantidad__valor",
            type: "number", min: "1", max: "999",
            value: String(item.cantidad),
            "aria-label": `Cantidad de ${item.nombre}`
        });

        cantidad.addEventListener("change", () => {
            EP.carrito.cambiar(item.producto_id, Number(cantidad.value) || 1);
            dibujar();
        });

        const paso = (delta) => crear("button", {
            clase: "cantidad__paso",
            type: "button",
            "aria-label": delta > 0 ? "Sumar uno" : "Restar uno",
            texto: delta > 0 ? "+" : "−",
            onClick: () => {
                EP.carrito.cambiar(item.producto_id, item.cantidad + delta);
                dibujar();
            }
        });


        return crear("div", { clase: "linea", "data-producto": item.producto_id }, [

            crear("a", { clase: "linea__imagen", href: `/producto/${item.slug}` }, [
                item.imagen_url
                    ? crear("img", { src: item.imagen_url, alt: "", loading: "lazy" })
                    : crear("div", { clase: "producto__sin-imagen" }, [icono("imagen")])
            ]),

            crear("div", { clase: "linea__datos" }, [
                crear("a", {
                    clase: "linea__nombre",
                    href: `/producto/${item.slug}`,
                    texto: item.nombre
                }),
                crear("span", { clase: "linea__unitario", texto: `${precio(item.precio)} c/u` })
            ]),

            crear("div", { clase: "cantidad" }, [paso(-1), cantidad, paso(1)]),

            crear("span", {
                clase: "linea__subtotal",
                texto: precio(item.precio * item.cantidad)
            }),

            crear("button", {
                clase: "linea__quitar",
                type: "button",
                "aria-label": `Quitar ${item.nombre}`,
                title: "Quitar",
                onClick: () => { EP.carrito.quitar(item.producto_id); dibujar(); }
            }, [icono("cerrar")])
        ]);
    }


    // =================================================
    // FORMULARIO
    // =================================================

    function campo(etiqueta, control, { obligatorio, pista } = {}) {
        return crear("div", { clase: "campo-tienda" }, [
            crear("label", { clase: "campo-tienda__etiqueta", for: control.id }, [
                etiqueta,
                obligatorio && crear("span", { clase: "campo__obligatorio", texto: " *" })
            ]),
            pista && crear("span", { clase: "campo-tienda__pista", texto: pista }),
            control
        ]);
    }


    const entrada = (id, extra = {}) =>
        crear("input", { clase: "campo-tienda__control", id, ...extra });


    function formulario() {

        const nombre = entrada("cNombre", { type: "text", autocomplete: "given-name" });
        const apellido = entrada("cApellido", { type: "text", autocomplete: "family-name" });
        const email = entrada("cEmail", { type: "email", autocomplete: "email" });
        const telefono = entrada("cTelefono", { type: "tel", autocomplete: "tel" });
        const direccion = entrada("cDireccion", { type: "text", autocomplete: "street-address" });
        const ciudad = entrada("cCiudad", { type: "text", autocomplete: "address-level2" });

        const observaciones = crear("textarea", {
            clase: "campo-tienda__control", id: "cObservaciones", rows: "3",
            placeholder: "¿Algo que tengamos que saber? (opcional)"
        });

        const medios = config.medios_pago || [];

        const pago = crear("div", { clase: "medios" }, medios.map((medio, indice) =>
            crear("label", { clase: "medio" }, [
                crear("input", {
                    type: "radio", name: "metodo_pago", value: medio.tipo,
                    checked: indice === 0
                }),
                crear("span", {}, [
                    crear("span", { clase: "medio__nombre", texto: medio.nombre }),
                    medio.instrucciones && crear("span", {
                        clase: "medio__detalle", texto: medio.instrucciones
                    })
                ])
            ])
        ));


        const aviso = crear("div", { clase: "aviso-error", hidden: true });

        const boton = crear("button", {
            clase: "ep-boton ep-boton--primario carrito__confirmar",
            type: "submit",
            texto: "Confirmar pedido"
        });


        const form = crear("form", { clase: "carrito__form", novalidate: true }, [

            crear("h2", { clase: "seccion__titulo", texto: "Tus datos" }),
            crear("p", {
                clase: "seccion__descripcion",
                estilo: "margin-bottom:20px",
                texto: "Con esto te contactamos para confirmar el pedido y " +
                       "coordinar el pago y la entrega."
            }),

            aviso,

            crear("div", { clase: "campos-dos" }, [
                campo("Nombre", nombre, { obligatorio: true }),
                campo("Apellido", apellido)
            ]),

            crear("div", { clase: "campos-dos" }, [
                campo("Email", email),
                campo("Teléfono o WhatsApp", telefono)
            ]),

            crear("p", {
                clase: "campo-tienda__pista",
                estilo: "margin:-8px 0 18px",
                texto: "Dejanos al menos uno de los dos para poder responderte."
            }),

            crear("div", { clase: "campos-dos" }, [
                campo("Dirección", direccion, { pista: "Si querés que te lo enviemos." }),
                campo("Ciudad", ciudad)
            ]),

            medios.length > 0 && crear("div", { clase: "campo-tienda" }, [
                crear("span", { clase: "campo-tienda__etiqueta", texto: "¿Cómo querés pagar?" }),
                pago
            ]),

            campo("Observaciones", observaciones),

            boton
        ]);


        form.addEventListener("submit", async (evento) => {

            evento.preventDefault();
            aviso.hidden = true;

            const elegido = form.querySelector('input[name="metodo_pago"]:checked');

            const cuerpo = {
                items: EP.carrito.paraEnviar(),
                metodo_pago: elegido ? elegido.value : null,
                observaciones: observaciones.value.trim(),
                contacto: {
                    nombre: nombre.value.trim(),
                    apellido: apellido.value.trim(),
                    email: email.value.trim(),
                    telefono: telefono.value.trim(),
                    direccion: direccion.value.trim(),
                    ciudad: ciudad.value.trim()
                }
            };

            boton.disabled = true;
            boton.textContent = "Enviando…";

            try {
                const respuesta = await EP.api.post("/api/public/pedidos", cuerpo,
                                                    { redirigirEn401: false });
                EP.carrito.vaciar();
                confirmacion(respuesta);

            } catch (error) {

                aviso.textContent = error.message;
                aviso.hidden = false;
                aviso.scrollIntoView({ behavior: "smooth", block: "center" });

                // El servidor puede señalar qué producto dio problema.
                const problema = error.detalles?.producto_id;

                if (problema) {
                    const fila = document.querySelector(`[data-producto="${problema}"]`);
                    fila?.classList.add("linea--problema");
                }

                boton.disabled = false;
                boton.textContent = "Confirmar pedido";
            }
        });

        return form;
    }


    // =================================================
    // CONFIRMACION
    // =================================================

    function confirmacion(respuesta) {

        const pedido = respuesta.pedido;

        EP.tienda.aplicarSeo(config, { titulo: `Pedido #${pedido.numero}` });

        reemplazar(principal, crear("div", { clase: "contenido-pagina" }, [

            crear("div", { clase: "confirmado" }, [

                crear("div", { clase: "confirmado__marca", texto: "✓" }),

                crear("h1", {
                    clase: "contenido-pagina__titulo",
                    texto: "¡Gracias por tu pedido!"
                }),

                crear("p", {
                    clase: "contenido-pagina__subtitulo",
                    texto: `Quedó registrado con el número #${pedido.numero}. ` +
                           "Te vamos a contactar para confirmarlo."
                }),

                crear("div", { clase: "resumen" }, [

                    ...pedido.items.map(item => crear("div", { clase: "resumen__linea" }, [
                        crear("span", { texto: `${item.cantidad} × ${item.nombre}` }),
                        crear("span", { texto: precio(item.subtotal) })
                    ])),

                    crear("div", { clase: "resumen__linea resumen__linea--total" }, [
                        crear("span", { texto: "Total" }),
                        crear("span", { texto: precio(pedido.total) })
                    ]),

                    pedido.metodo_pago && crear("div", { clase: "resumen__linea" }, [
                        crear("span", { texto: "Forma de pago" }),
                        crear("span", { texto: pedido.metodo_pago })
                    ])
                ]),

                crear("p", {
                    clase: "campo-tienda__pista",
                    estilo: "text-align:center;margin-top:20px",
                    texto: "Anotá el número por las dudas. Si no tenés noticias " +
                           "nuestras en 48 horas, escribinos."
                }),

                crear("div", {
                    estilo: "display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap"
                }, [
                    crear("a", {
                        clase: "ep-boton ep-boton--primario",
                        href: "/catalogo", texto: "Seguir mirando"
                    }),
                    crear("a", {
                        clase: "ep-boton ep-boton--secundario",
                        href: "/", texto: "Ir al inicio"
                    })
                ])
            ])
        ]));

        window.scrollTo({ top: 0 });
    }


    // =================================================
    // DIBUJO
    // =================================================

    function dibujar() {

        const items = EP.carrito.items();

        if (items.length === 0) {
            reemplazar(principal, crear("div", { clase: "contenedor" }, [
                EP.piezas.vacio({
                    titulo: "Tu carrito está vacío",
                    texto: "Todavía no agregaste nada. Mirá el catálogo y volvé cuando quieras.",
                    accion: crear("a", {
                        clase: "ep-boton ep-boton--primario",
                        href: "/catalogo", texto: "Ver el catálogo"
                    })
                })
            ]));
            return;
        }


        reemplazar(principal, crear("div", { clase: "contenedor carrito" }, [

            crear("h1", { clase: "contenido-pagina__titulo", texto: "Tu pedido" }),

            crear("div", { clase: "carrito__lineas" }, items.map(linea)),

            crear("div", { clase: "carrito__total" }, [
                crear("span", { texto: "Total" }),
                crear("strong", { texto: precio(EP.carrito.total()) })
            ]),

            crear("p", {
                clase: "campo-tienda__pista",
                texto: "El envío, si hace falta, lo coordinamos al confirmar el pedido."
            }),

            formulario(),

            crear("div", { estilo: "margin-top:28px;text-align:center" }, [
                crear("a", {
                    clase: "pie__enlace", href: "/catalogo", texto: "← Seguir comprando"
                })
            ])
        ]));
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        config = await EP.tienda.iniciar({ seccion: "carrito" });

        EP.tienda.aplicarSeo(config, { titulo: "Tu pedido" });

        if (!config.modulos.carrito) {
            reemplazar(principal, crear("div", { clase: "contenedor" }, [
                EP.piezas.vacio({
                    titulo: "Esta tienda no vende en línea",
                    texto: "Escribinos y coordinamos tu compra.",
                    accion: crear("a", {
                        clase: "ep-boton ep-boton--primario",
                        href: "/contacto", texto: "Contactanos"
                    })
                })
            ]));
            return;
        }

        dibujar();

    })();

})();
