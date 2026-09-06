// =====================================================
// PANEL · PEDIDOS
//
// Los pedidos no se crean ni se borran acá: entran desde la
// tienda. Lo que se hace es seguirlos y cambiarles el
// estado, y cada cambio queda registrado con quién lo hizo.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const lista = document.getElementById("lista");
    const pestanas = document.getElementById("pestanas");
    const resultado = document.getElementById("resultado");
    const buscar = document.getElementById("buscar");

    document.getElementById("iconoBuscar").append(icono("buscar"));


    const ESTADOS = [
        { id: "pendiente", nombre: "Pendientes", clase: "etiqueta--aviso" },
        { id: "confirmado", nombre: "Confirmados", clase: "etiqueta--info" },
        { id: "preparando", nombre: "Preparando", clase: "etiqueta--info" },
        { id: "enviado", nombre: "Enviados", clase: "etiqueta--info" },
        { id: "entregado", nombre: "Entregados", clase: "etiqueta--activo" },
        { id: "cancelado", nombre: "Cancelados", clase: "etiqueta--inactivo" }
    ];

    const CLASE = Object.fromEntries(ESTADOS.map(e => [e.id, e.clase]));

    // El camino habitual de un pedido. Se ofrece el siguiente paso
    // como acción destacada para no tener que pensar cuál sigue.
    const SIGUIENTE = {
        pendiente: "confirmado",
        confirmado: "preparando",
        preparando: "enviado",
        enviado: "entregado"
    };


    const estado = { estado: "", buscar: "", pagina: 1 };


    // =================================================
    // PESTAÑAS
    // =================================================

    function dibujarPestanas(conteo) {

        const boton = (id, nombre, cantidad) => crear("button", {
            clase: "pestana" + (estado.estado === id ? " pestana--activa" : ""),
            type: "button",
            onClick: () => { estado.estado = id; estado.pagina = 1; cargar(); }
        }, [
            crear("span", { texto: nombre }),
            cantidad > 0 && crear("span", { clase: "pestana__cuenta", texto: String(cantidad) })
        ]);

        reemplazar(pestanas, [
            boton("", "Todos", conteo.total || 0),
            ...ESTADOS.map(e => boton(e.id, e.nombre, conteo[e.id] || 0))
        ]);
    }


    // =================================================
    // LISTADO
    // =================================================

    function fila(pedido) {

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", { clase: "celda-producto__nombre", texto: `#${pedido.numero}` }),
                crear("div", {
                    clase: "celda-producto__meta",
                    texto: EP.fmt.relativa(pedido.created_at)
                }),
                crear("div", { clase: "celda-producto__movil" }, [
                    crear("span", { clase: "precio", texto: EP.fmt.precio(pedido.total) }),
                    crear("span", {
                        clase: "etiqueta " + CLASE[pedido.estado],
                        texto: pedido.estado_nombre
                    })
                ])
            ]),

            crear("td", {}, [
                crear("div", { texto: pedido.cliente.nombre || "Sin nombre" }),
                crear("div", {
                    clase: "celda-producto__meta",
                    texto: pedido.cliente.email || pedido.cliente.telefono || ""
                })
            ]),

            crear("td", {}, [
                crear("span", {
                    texto: pedido.cantidad_items === 1
                        ? "1 producto" : `${pedido.cantidad_items} productos`
                })
            ]),

            crear("td", {}, [
                crear("span", { clase: "precio", texto: EP.fmt.precio(pedido.total) })
            ]),

            crear("td", {}, [
                crear("span", {
                    clase: "etiqueta " + CLASE[pedido.estado],
                    texto: pedido.estado_nombre
                })
            ]),

            crear("td", { clase: "tabla__acciones" }, [
                crear("button", {
                    clase: "boton boton--suave boton--chico",
                    type: "button",
                    texto: "Ver",
                    onClick: () => abrirDetalle(pedido.id)
                })
            ])
        ]);
    }


    async function cargar() {

        reemplazar(lista, crear("div", { clase: "cargando" }, [crear("span", { clase: "giro" })]));

        try {

            const query = EP.util.parametros({
                pagina: estado.pagina,
                estado: estado.estado,
                buscar: estado.buscar
            });

            const pedidos = await EP.api.get(`/api/admin/pedidos${query}`);
            const meta = pedidos.meta;

            dibujarPestanas(meta.conteo);

            resultado.textContent = meta.total === 1
                ? "1 pedido" : `${EP.fmt.numero(meta.total)} pedidos`;

            if (pedidos.length === 0) {
                reemplazar(lista, crear("div", { clase: "vacio" }, [
                    crear("div", { clase: "vacio__icono" }, [icono("pedidos")]),
                    crear("h3", {
                        clase: "vacio__titulo",
                        texto: estado.buscar || estado.estado
                            ? "No hay pedidos con ese filtro"
                            : "Todavía no recibiste pedidos"
                    }),
                    crear("p", {
                        clase: "vacio__texto",
                        texto: estado.buscar || estado.estado
                            ? "Probá con otro estado o quitá la búsqueda."
                            : "Cuando alguien compre en tu tienda, el pedido va a aparecer acá."
                    })
                ]));
                return;
            }

            reemplazar(lista, [
                crear("div", { clase: "tabla-scroll" }, [
                    crear("table", { clase: "tabla" }, [
                        crear("thead", {}, [
                            crear("tr", {}, [
                                crear("th", { texto: "Pedido" }),
                                crear("th", { texto: "Cliente" }),
                                crear("th", { texto: "Productos" }),
                                crear("th", { texto: "Total" }),
                                crear("th", { texto: "Estado" }),
                                crear("th", { estilo: "text-align:right", texto: "" })
                            ])
                        ]),
                        crear("tbody", {}, pedidos.map(fila))
                    ])
                ]),
                paginacion(meta)
            ]);

        } catch (error) {
            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo", texto: "No pudimos cargar los pedidos" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
        }
    }


    function paginacion(meta) {

        if (meta.paginas <= 1) return null;

        const ir = (pagina) => { estado.pagina = pagina; cargar(); };

        return crear("div", { clase: "paginacion" }, [
            crear("span", {
                clase: "paginacion__info",
                texto: `Página ${meta.pagina} de ${meta.paginas}`
            }),
            crear("div", { clase: "paginacion__botones" }, [
                crear("button", {
                    clase: "boton boton--suave boton--chico", type: "button",
                    texto: "Anterior", disabled: meta.pagina <= 1,
                    onClick: () => ir(meta.pagina - 1)
                }),
                crear("button", {
                    clase: "boton boton--suave boton--chico", type: "button",
                    texto: "Siguiente", disabled: meta.pagina >= meta.paginas,
                    onClick: () => ir(meta.pagina + 1)
                })
            ])
        ]);
    }


    // =================================================
    // DETALLE
    // =================================================

    async function abrirDetalle(id) {

        let pedido;

        try {
            pedido = await EP.api.get(`/api/admin/pedidos/${id}`);
        } catch (error) {
            EP.notificar.error(error.message);
            return;
        }


        const contacto = pedido.datos_contacto || {};

        const dato = (clave, valor) => valor
            ? crear("div", { clase: "ficha-linea" }, [
                crear("span", { clase: "ficha-linea__clave", texto: clave }),
                crear("span", { texto: valor })
              ])
            : null;


        const items = crear("div", { clase: "tabla-scroll" }, [
            crear("table", { clase: "tabla" }, [
                crear("tbody", {}, [
                    ...pedido.items.map(item => crear("tr", {}, [
                        crear("td", {}, [
                            crear("div", { clase: "celda-producto" }, [
                                item.imagen_url
                                    ? crear("img", { clase: "miniatura", src: item.imagen_url, alt: "" })
                                    : crear("div", { clase: "miniatura miniatura--vacia" }, [icono("imagen")]),
                                crear("div", {}, [
                                    crear("div", { clase: "celda-producto__nombre", texto: item.nombre }),
                                    crear("div", {
                                        clase: "celda-producto__meta",
                                        texto: `${item.cantidad} × ${EP.fmt.precio(item.precio_unitario)}` +
                                               (item.existe ? "" : " · ya no está en el catálogo")
                                    })
                                ])
                            ])
                        ]),
                        crear("td", { clase: "tabla__acciones" }, [
                            crear("span", { clase: "precio", texto: EP.fmt.precio(item.subtotal) })
                        ])
                    ])),
                    crear("tr", {}, [
                        crear("td", {}, [crear("strong", { texto: "Total" })]),
                        crear("td", { clase: "tabla__acciones" }, [
                            crear("strong", { clase: "precio", texto: EP.fmt.precio(pedido.total) })
                        ])
                    ])
                ])
            ])
        ]);


        const selector = crear("select", { clase: "control", id: "nuevoEstado" },
            ESTADOS.map(e => crear("option", {
                value: e.id,
                texto: e.nombre.replace(/s$/, ""),
                selected: e.id === pedido.estado
            }))
        );

        const nota = crear("input", {
            clase: "control", id: "notaEstado", type: "text",
            placeholder: "Nota para el historial (opcional)"
        });


        async function cambiarA(nuevo) {

            if (nuevo === "cancelado") {
                const seguro = await EP.confirmar({
                    titulo: `¿Cancelar el pedido #${pedido.numero}?`,
                    mensaje: "Queda registrado como cancelado. No se puede deshacer " +
                             "salvo volviéndolo a otro estado a mano.",
                    textoConfirmar: "Sí, cancelar",
                    peligro: true
                });
                if (!seguro) return;
            }

            try {
                const respuesta = await EP.api.patch(
                    `/api/admin/pedidos/${pedido.id}/estado`,
                    { estado: nuevo, nota: nota.value.trim() }
                );
                EP.notificar.exito(respuesta.mensaje);
                cajon.cerrar();
                cargar();

            } catch (error) {
                EP.notificar.error(error.message);
            }
        }


        const siguiente = SIGUIENTE[pedido.estado];


        const cajon = EP.cajon({

            titulo: `Pedido #${pedido.numero}`,
            avisarCambios: false,
            textoCancelar: "Cerrar",

            contenido: [

                crear("div", { clase: "seccion" }, [
                    crear("div", { estilo: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px" }, [
                        crear("span", {
                            clase: "etiqueta " + CLASE[pedido.estado],
                            texto: pedido.estado_nombre
                        }),
                        crear("span", {
                            clase: "celda-producto__meta",
                            texto: EP.fmt.fecha(pedido.created_at)
                        })
                    ]),
                    items
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Quién compró" }),
                    dato("Nombre", [contacto.nombre, contacto.apellido].filter(Boolean).join(" ")),
                    dato("Email", contacto.email),
                    dato("Teléfono", contacto.telefono),
                    dato("Dirección", [contacto.direccion, contacto.ciudad, contacto.provincia]
                        .filter(Boolean).join(", ")),
                    dato("Forma de pago", pedido.metodo_pago),
                    pedido.observaciones && crear("div", { clase: "ficha-linea" }, [
                        crear("span", { clase: "ficha-linea__clave", texto: "Observaciones" }),
                        crear("span", { texto: pedido.observaciones })
                    ]),
                    pedido.cliente.id && crear("a", {
                        clase: "boton boton--suave boton--chico",
                        estilo: "margin-top:10px",
                        href: `clientes.html?ver=${pedido.cliente.id}`,
                        texto: "Ver ficha del cliente"
                    })
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Cambiar el estado" }),

                    siguiente && crear("button", {
                        clase: "boton boton--primario",
                        estilo: "margin-bottom:14px",
                        type: "button",
                        texto: `Marcar como ${ESTADOS.find(e => e.id === siguiente).nombre
                                    .replace(/s$/, "").toLowerCase()}`,
                        onClick: () => cambiarA(siguiente)
                    }),

                    crear("div", { clase: "campo" }, [
                        crear("label", { clase: "campo__etiqueta", for: "notaEstado",
                                         texto: "Nota" }),
                        nota
                    ]),

                    crear("div", { estilo: "display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap" }, [
                        crear("div", { clase: "campo", estilo: "flex:1;min-width:160px;margin:0" }, [
                            crear("label", { clase: "campo__etiqueta", for: "nuevoEstado",
                                             texto: "Otro estado" }),
                            selector
                        ]),
                        crear("button", {
                            clase: "boton boton--suave",
                            type: "button",
                            texto: "Aplicar",
                            onClick: () => cambiarA(selector.value)
                        })
                    ])
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Historial" }),
                    crear("ol", { clase: "historial" }, pedido.historial.map(h =>
                        crear("li", { clase: "historial__paso" }, [
                            crear("span", {
                                clase: "etiqueta " + CLASE[h.estado],
                                texto: h.estado_nombre
                            }),
                            crear("div", {}, [
                                crear("div", {
                                    clase: "celda-producto__meta",
                                    texto: EP.fmt.fecha(h.created_at) +
                                           (h.usuario ? ` · ${h.usuario}` : "")
                                }),
                                h.nota && crear("div", { texto: h.nota })
                            ])
                        ])
                    ))
                ])
            ]
        });
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        buscar.addEventListener("input", EP.util.esperar(() => {
            estado.buscar = buscar.value.trim();
            estado.pagina = 1;
            cargar();
        }));

        await cargar();

        const ver = new URLSearchParams(location.search).get("ver");
        if (ver) abrirDetalle(ver);

    })();

})();
