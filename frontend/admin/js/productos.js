// =====================================================
// PANEL · PRODUCTOS
//
// Listado con búsqueda, filtros y paginación, y el
// formulario en un cajón lateral.
//
// Las imágenes se manejan distinto según el caso, a
// propósito:
//
//   - creando: se eligen y viajan junto con el producto;
//   - editando: cada acción (agregar, borrar, elegir la
//     principal) se aplica en el momento, porque el
//     producto ya existe y así el cliente ve el resultado
//     enseguida en vez de tener que acordarse de guardar.
// =====================================================

(function () {

    const { crear, icono, reemplazar, vaciar } = EP.dom;

    const lista = document.getElementById("lista");
    const resultado = document.getElementById("resultado");
    const buscar = document.getElementById("buscar");
    const filtroCategoria = document.getElementById("filtroCategoria");
    const filtroEstado = document.getElementById("filtroEstado");

    document.getElementById("iconoBuscar").append(icono("buscar"));

    const MAX_IMAGENES = 6;

    let categorias = [];

    const estado = { pagina: 1, buscar: "", categoria_id: "", disponible: "" };


    // =================================================
    // LISTADO
    // =================================================

    function miniatura(producto) {
        return producto.imagen_url
            ? crear("img", { clase: "miniatura", src: producto.imagen_url,
                             alt: "", loading: "lazy" })
            : crear("div", { clase: "miniatura miniatura--vacia" }, [icono("imagen")]);
    }


    function celdaStock(producto) {

        if (producto.stock > 0) {
            return crear("span", { texto: EP.fmt.numero(producto.stock) });
        }

        return crear("span", {
            clase: "etiqueta " + (producto.disponible ? "etiqueta--aviso" : "etiqueta--inactivo"),
            texto: "Sin stock"
        });
    }


    function interruptorDisponible(producto) {

        const entrada = crear("input", {
            type: "checkbox",
            checked: producto.disponible,
            "aria-label": `Mostrar ${producto.nombre} en la tienda`
        });

        entrada.addEventListener("change", async () => {

            entrada.disabled = true;

            try {
                const respuesta = await EP.api.patch(
                    `/api/admin/productos/${producto.id}/disponible`,
                    { disponible: entrada.checked }
                );

                producto.disponible = entrada.checked;
                EP.notificar.exito(respuesta.mensaje);

            } catch (error) {
                entrada.checked = !entrada.checked;   // se deshace solo
                EP.notificar.error(error.message);

            } finally {
                entrada.disabled = false;
            }
        });

        return crear("label", { clase: "interruptor" }, [
            entrada,
            crear("span", { clase: "interruptor__pista" })
        ]);
    }


    function fila(producto) {

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", { clase: "celda-producto" }, [
                    miniatura(producto),
                    crear("div", {}, [
                        crear("div", { clase: "celda-producto__nombre", texto: producto.nombre }),
                        crear("div", {
                            clase: "celda-producto__meta",
                            texto: producto.categoria
                                ? producto.categoria.nombre
                                : "Sin categoría"
                        })
                    ])
                ])
            ]),

            crear("td", {}, [
                crear("div", { clase: "precio" }, [
                    EP.fmt.precio(producto.precio),
                    producto.en_oferta &&
                        crear("span", {
                            clase: "precio__anterior",
                            texto: EP.fmt.precio(producto.precio_anterior)
                        })
                ])
            ]),

            crear("td", {}, [celdaStock(producto)]),

            crear("td", {}, [interruptorDisponible(producto)]),

            crear("td", { clase: "tabla__acciones" }, [

                crear("button", {
                    clase: "boton boton--fantasma",
                    type: "button",
                    "aria-label": `Editar ${producto.nombre}`,
                    title: "Editar",
                    onClick: () => abrirFormulario(producto.id)
                }, [icono("lapiz")]),

                crear("button", {
                    clase: "boton boton--fantasma es-peligro",
                    type: "button",
                    "aria-label": `Eliminar ${producto.nombre}`,
                    title: "Eliminar",
                    onClick: () => eliminar(producto)
                }, [icono("basura")])
            ])
        ]);
    }


    function sinResultados() {

        const filtrando = estado.buscar || estado.categoria_id || estado.disponible !== "";

        return crear("div", { clase: "vacio" }, [
            crear("div", { clase: "vacio__icono" }, [icono(filtrando ? "buscar" : "productos")]),
            crear("h3", {
                clase: "vacio__titulo",
                texto: filtrando ? "No encontramos nada" : "Todavía no cargaste productos"
            }),
            crear("p", {
                clase: "vacio__texto",
                texto: filtrando
                    ? "Probá con otras palabras o quitá los filtros."
                    : "Cargá tu primer producto y va a aparecer en tu tienda enseguida."
            }),
            filtrando
                ? crear("button", {
                    clase: "boton boton--suave",
                    type: "button",
                    texto: "Quitar los filtros",
                    onClick: () => {
                        buscar.value = "";
                        filtroCategoria.value = "";
                        filtroEstado.value = "";
                        Object.assign(estado, { pagina: 1, buscar: "", categoria_id: "", disponible: "" });
                        cargar();
                    }
                  })
                : crear("button", {
                    clase: "boton boton--primario",
                    type: "button",
                    texto: "Cargar un producto",
                    onClick: () => abrirFormulario(null)
                  })
        ]);
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
                    clase: "boton boton--suave boton--chico",
                    type: "button",
                    texto: "Anterior",
                    disabled: meta.pagina <= 1,
                    onClick: () => ir(meta.pagina - 1)
                }),
                crear("button", {
                    clase: "boton boton--suave boton--chico",
                    type: "button",
                    texto: "Siguiente",
                    disabled: meta.pagina >= meta.paginas,
                    onClick: () => ir(meta.pagina + 1)
                })
            ])
        ]);
    }


    async function cargar() {

        reemplazar(lista, crear("div", { clase: "cargando" }, [crear("span", { clase: "giro" })]));

        try {

            const query = EP.util.parametros({
                pagina: estado.pagina,
                buscar: estado.buscar,
                categoria_id: estado.categoria_id,
                disponible: estado.disponible
            });

            const productos = await EP.api.get(`/api/admin/productos${query}`);
            const meta = productos.meta;

            resultado.textContent = meta.total === 1
                ? "1 producto"
                : `${EP.fmt.numero(meta.total)} productos`;

            if (productos.length === 0) {
                reemplazar(lista, sinResultados());
                return;
            }

            reemplazar(lista, [
                crear("div", { clase: "tabla-scroll" }, [
                    crear("table", { clase: "tabla" }, [
                        crear("thead", {}, [
                            crear("tr", {}, [
                                crear("th", { texto: "Producto" }),
                                crear("th", { texto: "Precio" }),
                                crear("th", { texto: "Stock" }),
                                crear("th", { texto: "En la tienda" }),
                                crear("th", { estilo: "text-align:right", texto: "Acciones" })
                            ])
                        ]),
                        crear("tbody", {}, productos.map(fila))
                    ])
                ]),
                paginacion(meta)
            ]);

        } catch (error) {
            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo", texto: "No pudimos cargar los productos" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
        }
    }


    // =================================================
    // IMAGENES
    // =================================================

    function gestorImagenes(producto, contenedor) {

        const esNuevo = !producto;

        // Solo se usa al crear: los archivos elegidos esperan a que
        // el producto exista.
        let pendientes = [];

        const entrada = crear("input", {
            type: "file",
            accept: "image/png,image/jpeg,image/webp,image/avif,image/gif",
            multiple: true,
            hidden: true
        });

        const grilla = crear("div", { clase: "imagenes" });

        function dibujar() {

            const guardadas = producto?.imagenes || [];
            const total = guardadas.length + pendientes.length;

            const tarjetas = [];

            for (const imagen of guardadas) {
                tarjetas.push(crear("div", {
                    clase: "imagen" + (imagen.principal ? " imagen--principal" : "")
                }, [
                    crear("img", { src: imagen.url, alt: "", loading: "lazy" }),
                    imagen.principal && crear("span", { clase: "imagen__cinta", texto: "PRINCIPAL" }),
                    crear("div", { clase: "imagen__herramientas" }, [
                        !imagen.principal && crear("button", {
                            clase: "imagen__boton",
                            type: "button",
                            texto: "Principal",
                            onClick: () => marcarPrincipal(imagen)
                        }),
                        crear("button", {
                            clase: "imagen__boton imagen__boton--peligro",
                            type: "button",
                            texto: "Quitar",
                            onClick: () => quitar(imagen)
                        })
                    ])
                ]));
            }

            pendientes.forEach((archivo, indice) => {
                tarjetas.push(crear("div", { clase: "imagen" }, [
                    crear("img", { src: URL.createObjectURL(archivo), alt: "" }),
                    crear("div", { clase: "imagen__herramientas" }, [
                        crear("button", {
                            clase: "imagen__boton imagen__boton--peligro",
                            type: "button",
                            texto: "Quitar",
                            onClick: () => {
                                pendientes.splice(indice, 1);
                                dibujar();
                            }
                        })
                    ])
                ]));
            });

            if (total < MAX_IMAGENES) {
                tarjetas.push(crear("button", {
                    clase: "soltar",
                    type: "button",
                    onClick: () => entrada.click(),
                    onDragover: (e) => { e.preventDefault(); e.currentTarget.classList.add("encima"); },
                    onDragleave: (e) => e.currentTarget.classList.remove("encima"),
                    onDrop: (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("encima");
                        recibir([...e.dataTransfer.files]);
                    }
                }, [icono("subir"), crear("span", { texto: "Agregar" })]));
            }

            reemplazar(grilla, tarjetas);
        }


        function recibir(archivos) {

            const imagenes = archivos.filter(a => a.type.startsWith("image/"));

            if (imagenes.length !== archivos.length) {
                EP.notificar.aviso("Solo se pueden subir imágenes");
            }

            const usadas = (producto?.imagenes?.length || 0) + pendientes.length;
            const lugar = MAX_IMAGENES - usadas;

            if (lugar <= 0) {
                EP.notificar.aviso(`Un producto puede tener hasta ${MAX_IMAGENES} imágenes`);
                return;
            }

            const aceptadas = imagenes.slice(0, lugar);

            if (imagenes.length > lugar) {
                EP.notificar.aviso(
                    `Se agregaron ${lugar} de ${imagenes.length}: el máximo es ${MAX_IMAGENES}`
                );
            }

            if (esNuevo) {
                pendientes = pendientes.concat(aceptadas);
                dibujar();
            } else {
                subir(aceptadas);
            }
        }


        async function subir(archivos) {

            const datos = new FormData();
            archivos.forEach(archivo => datos.append("imagenes", archivo));

            try {
                const respuesta = await EP.api.post(
                    `/api/admin/productos/${producto.id}/imagenes`, datos
                );
                producto.imagenes = respuesta.imagenes;
                dibujar();
                EP.notificar.exito(respuesta.mensaje);

            } catch (error) {
                EP.notificar.error(error.message);
            }
        }


        async function quitar(imagen) {

            const confirmado = await EP.confirmar({
                titulo: "¿Quitar esta imagen?",
                mensaje: "Se borra del producto y del servidor. No se puede deshacer.",
                textoConfirmar: "Quitar",
                peligro: true
            });

            if (!confirmado) return;

            try {
                const respuesta = await EP.api.eliminar(
                    `/api/admin/productos/${producto.id}/imagenes/${imagen.id}`
                );
                producto.imagenes = respuesta.imagenes;
                dibujar();
                EP.notificar.exito(respuesta.mensaje);

            } catch (error) {
                EP.notificar.error(error.message);
            }
        }


        async function marcarPrincipal(imagen) {
            try {
                const respuesta = await EP.api.patch(
                    `/api/admin/productos/${producto.id}/imagenes/${imagen.id}/principal`
                );
                producto.imagenes = respuesta.imagenes;
                dibujar();
                EP.notificar.exito(respuesta.mensaje);

            } catch (error) {
                EP.notificar.error(error.message);
            }
        }


        entrada.addEventListener("change", () => {
            recibir([...entrada.files]);
            entrada.value = "";
        });

        contenedor.append(
            crear("span", {
                clase: "campo__pista",
                texto: esNuevo
                    ? `Hasta ${MAX_IMAGENES} imágenes. La primera será la principal.`
                    : `Hasta ${MAX_IMAGENES} imágenes. Los cambios se guardan al instante.`
            }),
            grilla,
            entrada
        );

        dibujar();

        return { pendientes: () => pendientes };
    }


    // =================================================
    // FORMULARIO
    // =================================================

    function campo(etiqueta, control, { pista, obligatorio } = {}) {
        return crear("div", { clase: "campo" }, [
            crear("label", { clase: "campo__etiqueta", for: control.id }, [
                etiqueta,
                obligatorio && crear("span", { clase: "campo__obligatorio", texto: " *" })
            ]),
            pista && crear("span", { clase: "campo__pista", texto: pista }),
            control
        ]);
    }


    async function abrirFormulario(id) {

        let producto = null;

        if (id) {
            try {
                producto = await EP.api.get(`/api/admin/productos/${id}`);
            } catch (error) {
                EP.notificar.error(error.message);
                return;
            }
        }

        const v = (clave, porDefecto = "") =>
            producto && producto[clave] !== null && producto[clave] !== undefined
                ? producto[clave] : porDefecto;


        const nombre = crear("input", {
            clase: "control", id: "pNombre", name: "nombre",
            type: "text", maxlength: "200", value: v("nombre")
        });

        const categoria = crear("select", { clase: "control", id: "pCategoria" }, [
            crear("option", { value: "", texto: "Sin categoría" }),
            ...categorias.map(c => crear("option", {
                value: c.id,
                texto: c.nombre + (c.activo ? "" : " (oculta)"),
                selected: producto?.categoria_id === c.id
            }))
        ]);

        const precio = crear("input", {
            clase: "control", id: "pPrecio", name: "precio",
            type: "text", inputmode: "decimal", value: producto ? producto.precio : ""
        });

        const precioAnterior = crear("input", {
            clase: "control", id: "pPrecioAnterior", name: "precio_anterior",
            type: "text", inputmode: "decimal",
            value: producto?.precio_anterior ?? ""
        });

        const stock = crear("input", {
            clase: "control", id: "pStock", name: "stock",
            type: "number", min: "0", step: "1", value: v("stock", "0")
        });

        const sku = crear("input", {
            clase: "control", id: "pSku", name: "sku", type: "text",
            maxlength: "60", value: v("sku")
        });

        const descripcion = crear("textarea", {
            clase: "control", id: "pDescripcion", name: "descripcion",
            maxlength: "5000"
        });
        descripcion.value = v("descripcion");

        const interruptor = (id, texto, nota, marcado) => {
            const entrada = crear("input", { type: "checkbox", id, checked: marcado });
            return {
                entrada,
                nodo: crear("label", { clase: "interruptor", estilo: "margin-bottom:14px" }, [
                    entrada,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        texto,
                        nota && crear("span", { clase: "interruptor__nota", texto: nota })
                    ])
                ])
            };
        };

        const disponible = interruptor("pDisponible", "Mostrar en la tienda",
            "Si lo apagás, el producto queda guardado pero nadie lo ve.",
            producto ? producto.disponible : true);

        const destacado = interruptor("pDestacado", "Destacado",
            "Aparece primero en la portada.", producto ? producto.destacado : false);

        const novedad = interruptor("pNovedad", "Novedad",
            "Se marca como recién llegado.", producto ? producto.novedad : false);


        const cajaImagenes = crear("div", {});
        const imagenes = gestorImagenes(producto, cajaImagenes);


        const cajon = EP.cajon({

            titulo: producto ? "Editar producto" : "Nuevo producto",
            textoGuardar: producto ? "Guardar cambios" : "Crear producto",

            contenido: [

                crear("div", { clase: "seccion" }, [
                    campo("Nombre", nombre, { obligatorio: true }),
                    campo("Categoría", categoria),
                    campo("Descripción", descripcion, {
                        pista: "Lo que va a leer quien entre al producto."
                    })
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Precio y stock" }),
                    crear("div", { clase: "fila" }, [
                        campo("Precio", precio, { obligatorio: true }),
                        campo("Precio anterior", precioAnterior, {
                            pista: "Opcional. Se muestra tachado."
                        })
                    ]),
                    crear("div", { clase: "fila" }, [
                        campo("Stock", stock),
                        campo("Código (SKU)", sku, { pista: "Opcional, para uso interno." })
                    ])
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Imágenes" }),
                    cajaImagenes
                ]),

                crear("div", { clase: "seccion" }, [
                    crear("p", { clase: "seccion__titulo", texto: "Visibilidad" }),
                    disponible.nodo,
                    destacado.nodo,
                    novedad.nodo
                ])
            ],

            async alGuardar() {

                const datos = new FormData();
                datos.append("nombre", nombre.value.trim());
                datos.append("categoria_id", categoria.value);
                datos.append("descripcion", descripcion.value.trim());
                datos.append("precio", precio.value.trim());
                datos.append("precio_anterior", precioAnterior.value.trim());
                datos.append("stock", stock.value);
                datos.append("sku", sku.value.trim());
                datos.append("disponible", disponible.entrada.checked);
                datos.append("destacado", destacado.entrada.checked);
                datos.append("novedad", novedad.entrada.checked);

                if (!producto) {
                    for (const archivo of imagenes.pendientes()) {
                        datos.append("imagenes", archivo);
                    }
                }

                const respuesta = producto
                    ? await EP.api.put(`/api/admin/productos/${producto.id}`, datos)
                    : await EP.api.post("/api/admin/productos", datos);

                EP.notificar.exito(respuesta.mensaje);
                cajon.cerrar();
                cargar();
            }
        });
    }


    // =================================================
    // ELIMINAR
    // =================================================

    async function eliminar(producto) {

        const confirmado = await EP.confirmar({
            titulo: `¿Eliminar "${producto.nombre}"?`,
            mensaje: "Se borra el producto y sus imágenes. No se puede deshacer. " +
                     "Si solo querés sacarlo de la tienda, apagá el interruptor.",
            textoConfirmar: "Sí, eliminar",
            peligro: true
        });

        if (!confirmado) return;

        try {
            const respuesta = await EP.api.eliminar(`/api/admin/productos/${producto.id}`);
            EP.notificar.exito(respuesta.mensaje);
            cargar();

        } catch (error) {
            EP.notificar.error(error.message);
        }
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        try {
            categorias = await EP.api.get("/api/admin/categorias");
            for (const c of categorias) {
                filtroCategoria.append(crear("option", { value: c.id, texto: c.nombre }));
            }
        } catch {
            // Sin categorías el listado igual funciona.
        }

        buscar.addEventListener("input", EP.util.esperar(() => {
            estado.buscar = buscar.value.trim();
            estado.pagina = 1;
            cargar();
        }));

        filtroCategoria.addEventListener("change", () => {
            estado.categoria_id = filtroCategoria.value;
            estado.pagina = 1;
            cargar();
        });

        filtroEstado.addEventListener("change", () => {
            estado.disponible = filtroEstado.value;
            estado.pagina = 1;
            cargar();
        });

        document.getElementById("botonNuevo")
            .addEventListener("click", () => abrirFormulario(null));

        await cargar();

        // Enlaces directos desde el inicio: ?nuevo=1 y ?editar=<id>
        const parametros = new URLSearchParams(location.search);

        if (parametros.get("nuevo")) abrirFormulario(null);
        else if (parametros.get("editar")) abrirFormulario(parametros.get("editar"));

    })();

})();
