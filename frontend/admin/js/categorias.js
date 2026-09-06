// =====================================================
// PANEL · CATEGORIAS
//
// El orden se cambia con flechas y no arrastrando: funciona
// igual con el teclado, con lector de pantalla y en el
// telefono, donde arrastrar es incomodo.
//
// Al eliminar una categoria que tiene productos, el backend
// responde 409 explicando cuantos son. Esa respuesta se
// convierte en la confirmacion que ve el cliente, y recien
// si acepta se repite la peticion pidiendo desasignarlos.
// =====================================================

(function () {

    const { crear, icono, reemplazar } = EP.dom;

    const lista = document.getElementById("lista");

    let categorias = [];


    // =================================================
    // LISTADO
    // =================================================

    function miniatura(categoria) {
        return categoria.imagen_url
            ? crear("img", { clase: "miniatura", src: categoria.imagen_url,
                             alt: "", loading: "lazy" })
            : crear("div", { clase: "miniatura miniatura--vacia" }, [icono("categorias")]);
    }


    function fila(categoria, indice) {

        return crear("tr", {}, [

            crear("td", {}, [
                crear("div", { clase: "celda-producto" }, [
                    miniatura(categoria),
                    crear("div", {}, [
                        crear("div", { clase: "celda-producto__nombre", texto: categoria.nombre }),
                        crear("div", { clase: "celda-producto__meta", texto: `/${categoria.slug}` })
                    ])
                ])
            ]),

            crear("td", {}, [
                crear("span", {
                    texto: categoria.productos === 1
                        ? "1 producto"
                        : `${EP.fmt.numero(categoria.productos)} productos`
                })
            ]),

            crear("td", {}, [
                crear("span", {
                    clase: "etiqueta " + (categoria.activo ? "etiqueta--activo" : "etiqueta--inactivo"),
                    texto: categoria.activo ? "Visible" : "Oculta"
                })
            ]),

            crear("td", { clase: "tabla__acciones" }, [

                crear("button", {
                    clase: "boton boton--fantasma",
                    type: "button",
                    title: "Subir",
                    "aria-label": `Subir ${categoria.nombre}`,
                    disabled: indice === 0,
                    onClick: () => mover(indice, -1)
                }, ["↑"]),

                crear("button", {
                    clase: "boton boton--fantasma",
                    type: "button",
                    title: "Bajar",
                    "aria-label": `Bajar ${categoria.nombre}`,
                    disabled: indice === categorias.length - 1,
                    onClick: () => mover(indice, 1)
                }, ["↓"]),

                crear("button", {
                    clase: "boton boton--fantasma",
                    type: "button",
                    title: "Editar",
                    "aria-label": `Editar ${categoria.nombre}`,
                    onClick: () => abrirFormulario(categoria)
                }, [icono("lapiz")]),

                crear("button", {
                    clase: "boton boton--fantasma es-peligro",
                    type: "button",
                    title: "Eliminar",
                    "aria-label": `Eliminar ${categoria.nombre}`,
                    onClick: () => eliminar(categoria)
                }, [icono("basura")])
            ])
        ]);
    }


    function dibujar() {

        if (categorias.length === 0) {
            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("categorias")]),
                crear("h3", { clase: "vacio__titulo", texto: "Todavía no hay categorías" }),
                crear("p", {
                    clase: "vacio__texto",
                    texto: "Con categorías, quien entre a tu tienda puede encontrar " +
                           "lo que busca sin recorrer todo el catálogo."
                }),
                crear("button", {
                    clase: "boton boton--primario",
                    type: "button",
                    texto: "Crear la primera",
                    onClick: () => abrirFormulario(null)
                })
            ]));
            return;
        }

        reemplazar(lista, crear("div", { clase: "tabla-scroll" }, [
            crear("table", { clase: "tabla" }, [
                crear("thead", {}, [
                    crear("tr", {}, [
                        crear("th", { texto: "Categoría" }),
                        crear("th", { texto: "Productos" }),
                        crear("th", { texto: "Estado" }),
                        crear("th", { estilo: "text-align:right", texto: "Acciones" })
                    ])
                ]),
                crear("tbody", {}, categorias.map(fila))
            ])
        ]));
    }


    async function cargar() {
        try {
            categorias = await EP.api.get("/api/admin/categorias");
            dibujar();

        } catch (error) {
            reemplazar(lista, crear("div", { clase: "vacio" }, [
                crear("div", { clase: "vacio__icono" }, [icono("alerta")]),
                crear("h3", { clase: "vacio__titulo", texto: "No pudimos cargar las categorías" }),
                crear("p", { clase: "vacio__texto", texto: error.message })
            ]));
        }
    }


    // =================================================
    // ORDEN
    // =================================================

    async function mover(indice, direccion) {

        const destino = indice + direccion;

        if (destino < 0 || destino >= categorias.length) return;

        // Se reordena en pantalla primero: la respuesta es inmediata
        // y, si el guardado falla, se vuelve a cargar del servidor.
        const copia = categorias.slice();
        [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
        categorias = copia;
        dibujar();

        try {
            await EP.api.patch("/api/admin/categorias/orden", {
                ids: categorias.map(c => c.id)
            });

        } catch (error) {
            EP.notificar.error(error.message);
            cargar();
        }
    }


    // =================================================
    // FORMULARIO
    // =================================================

    function abrirFormulario(categoria) {

        const nombre = crear("input", {
            clase: "control", id: "cNombre", name: "nombre", type: "text",
            maxlength: "120", value: categoria?.nombre || ""
        });

        const descripcion = crear("textarea", {
            clase: "control", id: "cDescripcion", name: "descripcion", maxlength: "2000"
        });
        descripcion.value = categoria?.descripcion || "";

        const activo = crear("input", {
            type: "checkbox", id: "cActivo",
            checked: categoria ? categoria.activo : true
        });

        const archivo = crear("input", {
            type: "file", id: "cImagen",
            accept: "image/png,image/jpeg,image/webp,image/avif,image/gif",
            hidden: true
        });

        const vista = crear("div", { clase: "imagenes" });

        let elegida = null;

        function dibujarImagen() {

            const url = elegida ? URL.createObjectURL(elegida) : categoria?.imagen_url;

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
                }, [icono("subir"), crear("span", { texto: "Agregar" })])
            ]);
        }

        archivo.addEventListener("change", () => {
            if (archivo.files[0]) { elegida = archivo.files[0]; dibujarImagen(); }
        });

        dibujarImagen();


        const cajon = EP.cajon({

            titulo: categoria ? "Editar categoría" : "Nueva categoría",
            textoGuardar: categoria ? "Guardar cambios" : "Crear categoría",

            contenido: [

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "cNombre" }, [
                        "Nombre",
                        crear("span", { clase: "campo__obligatorio", texto: " *" })
                    ]),
                    crear("span", {
                        clase: "campo__pista",
                        texto: categoria
                            ? "Si lo cambiás, el enlace de la categoría no se modifica."
                            : "Por ejemplo: Biblias, Papelería, Regalería."
                    }),
                    nombre
                ]),

                crear("div", { clase: "campo" }, [
                    crear("label", { clase: "campo__etiqueta", for: "cDescripcion",
                                     texto: "Descripción" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Opcional. Aparece arriba del listado de la categoría."
                    }),
                    descripcion
                ]),

                crear("div", { clase: "campo" }, [
                    crear("span", { clase: "campo__etiqueta", texto: "Imagen" }),
                    crear("span", {
                        clase: "campo__pista",
                        texto: "Opcional. Se usa en el menú y en la portada."
                    }),
                    vista,
                    archivo
                ]),

                crear("label", { clase: "interruptor" }, [
                    activo,
                    crear("span", { clase: "interruptor__pista" }),
                    crear("span", { clase: "interruptor__texto" }, [
                        "Mostrar en la tienda",
                        crear("span", {
                            clase: "interruptor__nota",
                            texto: "Si la ocultás, sus productos siguen a la venta " +
                                   "pero la categoría no aparece en el menú."
                        })
                    ])
                ])
            ],

            async alGuardar() {

                const datos = new FormData();
                datos.append("nombre", nombre.value.trim());
                datos.append("descripcion", descripcion.value.trim());
                datos.append("activo", activo.checked);
                if (elegida) datos.append("imagen", elegida);

                const respuesta = categoria
                    ? await EP.api.put(`/api/admin/categorias/${categoria.id}`, datos)
                    : await EP.api.post("/api/admin/categorias", datos);

                EP.notificar.exito(respuesta.mensaje);
                cajon.cerrar();
                cargar();
            }
        });
    }


    // =================================================
    // ELIMINAR
    // =================================================

    async function eliminar(categoria) {

        try {
            // Primer intento sin confirmar. Si tiene productos, el
            // backend contesta 409 diciendo cuántos son.
            const respuesta = await EP.api.eliminar(`/api/admin/categorias/${categoria.id}`);
            EP.notificar.exito(respuesta.mensaje);
            cargar();
            return;

        } catch (error) {

            if (error.estado !== 409 || !error.detalles?.requiere_confirmacion) {
                EP.notificar.error(error.message);
                return;
            }

            const confirmado = await EP.confirmar({
                titulo: `¿Eliminar "${categoria.nombre}"?`,
                mensaje: error.message + " Vas a poder volver a asignarlos después.",
                textoConfirmar: "Sí, eliminar",
                peligro: true
            });

            if (!confirmado) return;

            try {
                const respuesta = await EP.api.eliminar(
                    `/api/admin/categorias/${categoria.id}?desasignar=true`
                );
                EP.notificar.exito(respuesta.mensaje);
                cargar();

            } catch (falla) {
                EP.notificar.error(falla.message);
            }
        }
    }


    // =================================================
    // ARRANQUE
    // =================================================

    (async () => {

        await EP.admin.iniciar();

        document.getElementById("botonNueva")
            .addEventListener("click", () => abrirFormulario(null));

        await cargar();

    })();

})();
