// =====================================================
// LIMPIEZA DEL HTML QUE ESCRIBE EL CLIENTE
//
// Las paginas de contenido (Nosotros, Trabajos personalizados)
// se escriben en el panel con un editor de texto con formato,
// y la tienda las muestra con innerHTML. Sin esta limpieza,
// cualquiera que pueda editar contenido podria dejar un
// <script> en la pagina publica.
//
// Es contenido propio del duenio de la tienda, no de un
// visitante anonimo, asi que el riesgo es bajo. Pero un
// empleado con permiso de contenido no deberia poder ejecutar
// codigo en el navegador de todos los compradores, y un texto
// pegado desde Word trae basura que conviene sacar igual.
//
// COMO FUNCIONA: no se filtra "lo malo", se conserva "lo
// bueno". Cada etiqueta se vuelve a construir desde cero con
// su nombre y nada mas; el unico atributo que sobrevive es el
// href de un enlace, y solo si apunta a http, https o mailto.
// Todo lo demas (onclick, style, class, data-*) desaparece
// aunque sea inofensivo.
//
// Lo que se descarta es la ETIQUETA, no el texto: si alguien
// pega un <div>Hola</div>, queda "Hola".
// =====================================================


// Lo que el editor del panel puede generar.
const PERMITIDAS = new Set([
    "p", "br", "strong", "em", "u", "s",
    "ul", "ol", "li",
    "h2", "h3",
    "blockquote", "a"
]);


// El navegador genera <b> e <i>; se guardan como <strong> y
// <em>, que es lo que corresponde y lo que entiende el CSS.
const EQUIVALENTES = { b: "strong", i: "em", strike: "s", del: "s" };


// Etiquetas cuyo CONTENIDO tambien se borra: dejar el texto de
// un <script> seria dejar el codigo a la vista.
const CON_CONTENIDO = /<(script|style|iframe|object|embed|svg|math|noscript)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;


const PROTOCOLO_SEGURO = /^(https?:\/\/|mailto:|tel:|\/)/i;


function escapar(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


function hrefDe(atributos) {

    const encontrado = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(atributos || "");

    if (!encontrado) return null;

    const valor = (encontrado[2] ?? encontrado[3] ?? encontrado[4] ?? "").trim();

    // "javascript:alert(1)" y "data:text/html,..." quedan afuera.
    if (!PROTOCOLO_SEGURO.test(valor)) return null;

    return escapar(valor);
}


function limpiar(html, { max = 60000 } = {}) {

    if (html === null || html === undefined) return null;

    let texto = String(html);

    if (texto.trim() === "") return null;

    texto = texto.slice(0, max);

    texto = texto.replace(CON_CONTENIDO, "");
    texto = texto.replace(/<!--[\s\S]*?-->/g, "");


    // Una etiqueta de apertura (con sus atributos, que pueden
    // contener ">" dentro de comillas) o una de cierre.
    const ETIQUETA =
        /<([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>|<\/\s*([a-zA-Z][a-zA-Z0-9]*)\s*>/g;

    // Cuando se descarta un <a> (por ejemplo, uno que apuntaba
    // a javascript:), hay que descartar tambien su </a>, o queda
    // un cierre suelto. Los enlaces no se anidan, asi que alcanza
    // con contarlos.
    let anclasDescartadas = 0;

    return texto.replace(ETIQUETA, (_, apertura, atributos, cierre) => {

        const bruto = (apertura || cierre || "").toLowerCase();
        const nombre = EQUIVALENTES[bruto] || bruto;

        if (!PERMITIDAS.has(nombre)) return "";

        if (cierre) {
            if (nombre === "br") return "";
            if (nombre === "a" && anclasDescartadas > 0) {
                anclasDescartadas -= 1;
                return "";
            }
            return `</${nombre}>`;
        }

        if (nombre === "br") return "<br>";

        if (nombre === "a") {

            const href = hrefDe(atributos);

            // Un enlace sin destino valido pierde el enlace pero
            // conserva el texto.
            if (!href) {
                anclasDescartadas += 1;
                return "";
            }

            return `<a href="${href}" rel="noopener">`;
        }

        return `<${nombre}>`;

    }).trim() || null;
}


// Cuantas letras tiene el contenido, sin las etiquetas. Sirve
// para no guardar una pagina que parece llena pero es un <p>
// vacio que dejo el editor.
function estaVacio(html) {
    if (!html) return true;
    return String(html)
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim() === "";
}


module.exports = { limpiar, estaVacio, PERMITIDAS };
