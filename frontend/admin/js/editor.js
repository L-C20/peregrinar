// =====================================================
// EDITOR DE TEXTO CON FORMATO
//
// Para las paginas de contenido (Nosotros, Trabajos
// personalizados). El cliente escribe como en un procesador
// de texto: negrita, cursiva, subtitulos, listas y enlaces.
// No ve una sola etiqueta HTML.
//
//   const editor = EP.editor({ valor: pagina.contenido });
//   editor.elemento   -> el nodo para meter en el formulario
//   editor.valor()    -> el HTML que se manda al servidor
//
// Usa document.execCommand, que esta marcado como obsoleto
// pero es lo unico que funciona igual en todos los navegadores
// sin traer una libreria de 200 KB. El dia que deje de andar,
// este archivo es lo unico que hay que cambiar.
//
// Lo que salga de acá NO se guarda tal cual: el servidor lo
// vuelve a limpiar contra su propia lista de etiquetas
// permitidas (backend/src/utils/htmlSeguro.js). Esto es
// comodidad; la seguridad esta del otro lado.
// =====================================================

window.EP = window.EP || {};

(function () {

    const { crear } = EP.dom;


    const HERRAMIENTAS = [
        { comando: "bold",   texto: "N", titulo: "Negrita",
          estilo: "font-weight:800" },

        { comando: "italic", texto: "C", titulo: "Cursiva",
          estilo: "font-style:italic;font-family:Georgia,serif" },

        { comando: "formatBlock", valor: "h3", texto: "Subtítulo",
          titulo: "Convertir la línea en un subtítulo" },

        { comando: "formatBlock", valor: "p", texto: "Párrafo",
          titulo: "Volver a texto normal" },

        { comando: "insertUnorderedList", texto: "• Lista",
          titulo: "Lista con viñetas" },

        { comando: "enlace", texto: "Enlace",
          titulo: "Convertir el texto seleccionado en un enlace" },

        { comando: "unlink", texto: "Quitar enlace", titulo: "Quitar el enlace" }
    ];


    function editor({ valor = "", alto = 260 } = {}) {

        const area = crear("div", {
            clase: "editor__area",
            contenteditable: "true",
            role: "textbox",
            "aria-multiline": "true",
            "aria-label": "Contenido de la página",
            estilo: `min-height:${alto}px`
        });

        // El contenido viene del servidor, ya limpio.
        area.innerHTML = valor || "";


        function aplicar(herramienta) {

            area.focus();

            if (herramienta.comando === "enlace") {

                const direccion = window.prompt(
                    "¿A qué dirección tiene que llevar el enlace?\n\n" +
                    "Ejemplos:\n" +
                    "https://www.instagram.com/mitienda\n" +
                    "/catalogo   (una página de tu propia tienda)",
                    "https://"
                );

                if (!direccion || direccion.trim() === "https://") return;

                document.execCommand("createLink", false, direccion.trim());
                return;
            }

            document.execCommand(
                herramienta.comando, false, herramienta.valor || null
            );
        }


        const barra = crear("div", { clase: "editor__barra" },
            HERRAMIENTAS.map(herramienta =>
                crear("button", {
                    clase: "editor__boton",
                    type: "button",
                    title: herramienta.titulo,
                    "aria-label": herramienta.titulo,
                    texto: herramienta.texto,
                    estilo: herramienta.estilo || null,

                    // mousedown en vez de click: si se espera al click,
                    // el navegador ya perdio la seleccion del texto.
                    onMousedown: (evento) => {
                        evento.preventDefault();
                        aplicar(herramienta);
                    }
                })
            )
        );


        // Pegar desde Word o desde una pagina trae colores, fuentes
        // y tablas. Se pega solo el texto.
        area.addEventListener("paste", (evento) => {
            evento.preventDefault();
            const texto = (evento.clipboardData || window.clipboardData)
                .getData("text/plain");
            document.execCommand("insertText", false, texto);
        });


        const elemento = crear("div", { clase: "editor" }, [barra, area]);


        return {

            elemento,

            valor: () => {
                const html = area.innerHTML.trim();
                // Un editor vacio deja "<br>" o "<p></p>".
                return area.textContent.trim() === "" ? "" : html;
            },

            enfocar: () => area.focus()
        };
    }


    EP.editor = editor;

})();
