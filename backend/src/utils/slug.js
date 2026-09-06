// =====================================================
// SLUGS
//
// El slug es lo que aparece en la URL de la tienda:
//   /producto/biblia-de-estudio-tapa-dura
//
// El cliente no tiene por que saber que existe. Escribe el
// nombre y el slug se arma solo; si ya hay otro igual EN ESA
// TIENDA, se le agrega un numero. Dos tiendas distintas
// pueden tener el mismo slug sin problema.
// =====================================================


// El CHECK de las migraciones exige exactamente esto.
const VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;


function generar(texto) {

    return String(texto || "")
        // NFD separa la tilde de la letra ("é" pasa a ser "e" + tilde)
        // y despues se quitan los acentos sueltos, que caen todos en
        // el rango U+0300–U+036F. Asi "Papelería" queda "papeleria"
        // y "Diseño" queda "diseno".
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
        .replace(/-+$/g, "");
}


function esValido(slug) {
    return typeof slug === "string" && VALIDO.test(slug);
}


// -----------------------------------------------------
// SLUG LIBRE
//
// "existe" es una funcion que consulta la base. Se le pasa
// desde el repositorio, que es quien sabe en que tabla y
// con que tenant hay que mirar.
// -----------------------------------------------------

async function unico(base, existe) {

    const raiz = generar(base) || "item";

    if (!(await existe(raiz))) return raiz;

    // biblia, biblia-2, biblia-3...
    for (let numero = 2; numero <= 200; numero++) {
        const candidato = `${raiz}-${numero}`;
        if (!(await existe(candidato))) return candidato;
    }

    // Salida de emergencia: no deberia llegar acá nunca.
    return `${raiz}-${Date.now()}`;
}


module.exports = { generar, esValido, unico };
