// =====================================================
// CAJON LATERAL DE FORMULARIO
//
// Los formularios del panel se abren en un panel que entra
// desde la derecha, no en una pagina aparte: asi el cliente
// no pierde de vista la lista donde estaba y no tiene que
// volver atras despues de guardar.
//
//   const cajon = EP.cajon({
//       titulo: "Nuevo producto",
//       contenido: [ ...nodos... ],
//       async alGuardar() { ...; cajon.cerrar(); }
//   });
//
// Se cierra con Escape, con la X, o tocando afuera. Si hay
// cambios sin guardar, pregunta antes.
// =====================================================

window.EP = window.EP || {};

(function () {

    const { crear, icono } = EP.dom;


    function cajon({
        titulo,
        contenido = [],
        textoGuardar = "Guardar",
        textoCancelar = "Cancelar",
        alGuardar = null,
        alCerrar = null,
        avisarCambios = true
    } = {}) {

        let cerrado = false;
        let sucio = false;


        const fondo = crear("div", { clase: "cajon-fondo" });

        const cuerpo = crear("div", { clase: "cajon__cuerpo" }, contenido);

        const botonGuardar = crear("button", {
            clase: "boton boton--primario",
            type: "submit",
            texto: textoGuardar
        });

        const botonCancelar = crear("button", {
            clase: "boton boton--suave",
            type: "button",
            texto: textoCancelar,
            onClick: () => intentarCerrar()
        });

        const formulario = crear("form", { clase: "cajon__cuerpo-marco", novalidate: true }, []);


        const panel = crear("aside", {
            clase: "cajon",
            role: "dialog",
            "aria-modal": "true",
            "aria-label": titulo
        }, [
            crear("div", { clase: "cajon__encabezado" }, [
                crear("h2", { clase: "cajon__titulo", texto: titulo }),
                crear("button", {
                    clase: "cajon__cerrar",
                    type: "button",
                    "aria-label": "Cerrar",
                    onClick: () => intentarCerrar()
                }, [icono("cerrar")])
            ]),
            formulario
        ]);


        // El form envuelve cuerpo y pie para que Enter guarde.
        formulario.style.display = "flex";
        formulario.style.flexDirection = "column";
        formulario.style.flex = "1";
        formulario.style.minHeight = "0";

        formulario.append(
            cuerpo,
            crear("div", { clase: "cajon__pie" }, [botonCancelar, alGuardar && botonGuardar])
        );


        // -------------------------------------------------
        // CIERRE
        // -------------------------------------------------

        function cerrar() {
            if (cerrado) return;
            cerrado = true;

            document.removeEventListener("keydown", alTeclear);
            panel.classList.remove("abierto");
            fondo.classList.remove("abierto");

            setTimeout(() => { panel.remove(); fondo.remove(); }, 240);

            alCerrar?.();
        }


        async function intentarCerrar() {

            if (avisarCambios && sucio) {

                const salir = await EP.confirmar({
                    titulo: "¿Descartar los cambios?",
                    mensaje: "Lo que escribiste no se va a guardar.",
                    textoConfirmar: "Descartar",
                    textoCancelar: "Seguir editando",
                    peligro: true
                });

                if (!salir) return;
            }

            cerrar();
        }


        function alTeclear(evento) {
            if (evento.key === "Escape") intentarCerrar();
        }


        // -------------------------------------------------
        // GUARDADO
        // -------------------------------------------------

        formulario.addEventListener("submit", async (evento) => {

            evento.preventDefault();

            if (!alGuardar) return;

            await EP.util.ocupado(botonGuardar, async () => {
                try {
                    await alGuardar();
                    sucio = false;

                } catch (error) {
                    EP.notificar.error(error.message);

                    // El backend puede señalar el campo que falló.
                    const campo = error.detalles?.campo &&
                                  formulario.querySelector(`[name="${error.detalles.campo}"]`);
                    campo?.focus();
                }
            });
        });


        // Cualquier tecleo marca el formulario como sucio.
        formulario.addEventListener("input", () => { sucio = true; });
        formulario.addEventListener("change", () => { sucio = true; });

        fondo.addEventListener("click", () => intentarCerrar());
        document.addEventListener("keydown", alTeclear);


        document.body.append(fondo, panel);

        requestAnimationFrame(() => {
            fondo.classList.add("abierto");
            panel.classList.add("abierto");

            // Foco en el primer campo, salvo en móvil, donde abrir
            // el teclado de golpe tapa media pantalla.
            if (window.innerWidth > 700) {
                const primero = formulario.querySelector(
                    "input:not([type=hidden]):not([disabled]), select, textarea"
                );
                primero?.focus();
            }
        });


        return {
            cerrar,
            elemento: panel,
            formulario,
            cuerpo,
            marcarLimpio: () => { sucio = false; },
            botonGuardar
        };
    }


    EP.cajon = cajon;

})();
