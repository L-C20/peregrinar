// =====================================================
// PANEL · CLIENTES
//
// No se crean acá: aparecen solos con cada pedido. Lo que
// se puede hacer es consultarlos, ver qué compraron y
// dejarles una nota interna que el cliente no ve.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const lista = document.getElementById("lista");
    const resultado = document.getElementById("resultado");
    const buscar = document.getElementById("buscar");

    document.getElementById("iconoBuscar").append(icono("buscar"));

    const CLASE_ESTADO = {
        pendiente: "etiqueta--aviso",
        confirmado: "etiqueta--info",
        preparando: "etiqueta--info",
        enviado: "etiqueta--info",
        entregado: "etiqueta--activo",
        cancelado: "etiqueta--inactivo"
    };


    // =================================================
    // LISTADO
    // =================================================

    function fila(cliente) {

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", {
                    clase: "celda-producto__nombre",
                    texto: cliente.nombre_completo || "Sin nombre"
                }),
                crear("div", {
                    clase: "celda-producto__meta",
                    texto: cliente.email || cliente.telefono || "Sin contacto"
                }),
                crear("div", { clase: "celda-producto__movil" }, [
                    crear("span", {
                        texto: cliente.pedidos === 1
                            ? "1 pedido" : `${cliente.pedidos} pedidos`
                    }),
                    crear("span", {
                        clase: "precio",
                        texto: EP.fmt.precio(cliente.total_comprado)
                    })
                ])
            ]),

            crear("td", {}, [
                crear("div", { texto: cliente.telefono || "—" }),
                crear("div", {
                    clase: "celda-producto__meta",
                    texto: [cliente.ciudad, cliente.provincia].filter(Boolean).join(", ")
                })
            ]),

            crear("td", {}, [
                crear("span", {
                    texto: cliente.pedidos === 1
                        ? "1 pedido" : `${cliente.pedidos} pedidos`
                })
            ]),

            crear("td", {}, [
                crear("span", { clase: "precio", texto: EP.fmt.precio(cliente.total_comprado) })
            ]),

            crear("td", {}, [
                crear("span", {
                    clase: "celda-producto__meta",
                    texto: cliente.ultimo_pedido ? EP.fmt.relativa(cliente.ultimo_pedido) : "—"
                })
            ]),

            crear("td", { clase: "tabla__acciones" }, [
                crear("button", {
                    clase: "boton boton--suave boton--chico",
                    type: "button",
                    texto: "Ver",
                    onClick: () => abrirFicha(cliente.id)
                })
            ])
        ]);
    }


    async function cargar() {

        reemplazar(lista, crear("div", { clase: "cargando" }, [crear("span", { clase: "giro" })]));

        try {

            const query = EP.util.parametros({ buscar: buscar.value.trim() });
            const clientes = await EP.api.get(`/api/admin/clientes${query}`);

            resultado.textContent = clientes.length === 1
                ? "1 cliente" : `${EP.fmt.numero(clientes.length)} clientes`;

            if (clientes.length === 0) {
                reemplazar(lista, crear("div", { clase: "vacio" }, [
                    crear("div", { clase: "vacio__icono" }, [icono("clientes")]),
                    crear("h3", {
                        clase: "vacio__titulo",
                        texto: buscar.value.trim()
                            ? "No encontramos a nadie"
                            : "Todavía no tenés clientes"
                    }),
                    crear("p", {
                        clase: "vacio__texto",
                        texto: buscar.value.trim()
                            ? "Probá con otro nombre, email o teléfono."
                            : "Se van a ir creando solos a medida que recibas pedidos."
                    })
                ]));
                return;
            }

            reemplazar(lista, crear("div", { clase: "tabla-scroll" }, [
                crear("table", { clase: "tabla" }, [
                    crear("thead", {}, [
                        crear("tr", {}, [
                            crear("th", { texto: "Cliente" }),
                            crear("th", { texto: "Teléfono" }),
                            crear("th", { texto: "Pedidos" }),
                            crear("th", { texto: "Compró por" }),
                            crear("th", { texto: "Último" }),
                            crear("th", { estilo: "text-align:right", texto: "" })
                        ])
                    ]),
                    crear("tbody", {}, clientes.map(fila))
                ])
            ]));

        } catch (error) {
            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo", texto: "No pudimos cargar los clientes" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
        }
    }


    // =================================================
    // FICHA
    // =================================================

    async function abrirFicha(id) {

        let cliente;

        try {
            cliente = await EP.api.get(`/api/admin/clientes/${id}`);
        } catch (error) {
            EP.notificar.error(error.message);
            return;
        }


        const dato = (clave, valor) => valor
            ? crear("div", { clase: "ficha-linea" }, [
                crear("span", { clase: "ficha-linea__clave", texto: clave }),
                crear("span", { texto: valor })
              ])
            : null;


        const notas = crear("textarea", {
            clase: "control", id: "notasCliente", rows: "3",
            placeholder: "Por ejemplo: prefiere retirar por el local."
        });
        notas.value = cliente.notas || "";


        const cajon = EP.cajon({

            titulo: cliente.nombre_completo || "Cliente",
            textoGuardar: "Guardar la nota",

            contenido: [

                crear("div", { clase: "seccion" }, [
                    dato("Email", cliente.email),
                    dato("Teléfono", cliente.telefono),
                    dato("Dirección", [cliente.direccion, cliente.ciudad, cliente.provincia]
                        .filter(Boolean).join(", ")),
                    dato("Cliente desde", EP.fmt.fecha(cliente.created_at))
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Nota interna" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Solo la ves vos. El cliente no la ve en ningún lado."
                    }),
                    notas
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", {
                        clase: "seccion__titulo",
                        texto: cliente.pedidos.length === 1
                            ? "Su pedido" : `Sus ${cliente.pedidos.length} pedidos`
                    }),

                    cliente.pedidos.length === 0
                        ? crear("p", { clase: "campo__pista", texto: "Todavía no compró nada." })
                        : crear("div", { clase: "tabla-scroll" }, [
                            crear("table", { clase: "tabla" }, [
                                crear("tbody", {}, cliente.pedidos.map(pedido =>
                                    crear("tr", {}, [
                                        crear("td", {}, [
                                            crear("div", {
                                                clase: "celda-producto__nombre",
                                                texto: `#${pedido.numero}`
                                            }),
                                            crear("div", {
                                                clase: "celda-producto__meta",
                                                texto: EP.fmt.fecha(pedido.created_at)
                                            })
                                        ]),
                                        crear("td", {}, [
                                            crear("span", {
                                                clase: "etiqueta " + CLASE_ESTADO[pedido.estado],
                                                texto: pedido.estado_nombre
                                            })
                                        ]),
                                        crear("td", { clase: "tabla__acciones" }, [
                                            crear("span", {
                                                clase: "precio",
                                                texto: EP.fmt.precio(pedido.total)
                                            }),
                                            crear("a", {
                                                clase: "boton boton--fantasma boton--chico",
                                                href: `pedidos.html?ver=${pedido.id}`,
                                                texto: "Ver"
                                            })
                                        ])
                                    ])
                                ))
                            ])
                        ])
                ])
            ],

            async alGuardar() {
                const respuesta = await EP.api.put(
                    `/api/admin/clientes/${cliente.id}/notas`,
                    { notas: notas.value.trim() }
                );
                EP.notificar.exito(respuesta.mensaje);
                cajon.cerrar();
            }
        });
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        buscar.addEventListener("input", EP.util.esperar(cargar));

        await cargar();

        const ver = new URLSearchParams(location.search).get("ver");
        if (ver) abrirFicha(ver);

    })();

})();
