// =====================================================
// VALIDACION DE LO QUE LLEGA EN UNA PETICION
//
// El navegador valida para que el formulario sea comodo.
// Esto valida porque no se puede confiar en el navegador:
// cualquiera puede mandar una peticion sin pasar por el.
//
// Los mensajes estan escritos para que los lea el cliente,
// no un programador: nombran el campo como se llama en el
// formulario y dicen que hacer.
// =====================================================

const { errores } = require("./errores");


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// Los mensajes se arman con el nombre del campo ("el precio"),
// asi que hay que poner en mayuscula la primera letra: el cliente
// lee "El precio no puede ser negativo", no "el precio...".
function frase(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}


function vacio(valor) {
    return valor === undefined || valor === null || valor === "";
}


// -----------------------------------------------------
// TEXTO
// -----------------------------------------------------

function texto(valor, {
    campo,
    requerido = false,
    min = 0,
    max = 5000,
    porDefecto = null
} = {}) {

    if (vacio(valor)) {
        if (requerido) {
            throw errores.solicitudInvalida(`Completá ${campo}`);
        }
        return porDefecto;
    }

    const limpio = String(valor).trim();

    if (limpio === "") {
        if (requerido) {
            throw errores.solicitudInvalida(`Completá ${campo}`);
        }
        return porDefecto;
    }

    if (limpio.length < min) {
        throw errores.solicitudInvalida(
            frase(`${campo} tiene que tener al menos ${min} caracteres`)
        );
    }

    if (limpio.length > max) {
        throw errores.solicitudInvalida(
            frase(`${campo} no puede superar los ${max} caracteres`)
        );
    }

    return limpio;
}


// -----------------------------------------------------
// NUMERO
// -----------------------------------------------------

function numero(valor, {
    campo,
    requerido = false,
    min = null,
    max = null,
    entero = false,
    porDefecto = null
} = {}) {

    if (vacio(valor)) {
        if (requerido) {
            throw errores.solicitudInvalida(`Completá ${campo}`);
        }
        return porDefecto;
    }

    // Los formularios mandan "1.500,50" o "1500.50" segun el teclado.
    const crudo = String(valor).trim().replace(",", ".");
    const convertido = Number(crudo);

    if (!Number.isFinite(convertido)) {
        throw errores.solicitudInvalida(frase(`${campo} tiene que ser un número`));
    }

    if (entero && !Number.isInteger(convertido)) {
        throw errores.solicitudInvalida(frase(`${campo} tiene que ser un número entero`));
    }

    if (min !== null && convertido < min) {
        throw errores.solicitudInvalida(
            min === 0
                ? frase(`${campo} no puede ser negativo`)
                : frase(`${campo} no puede ser menor que ${min}`)
        );
    }

    if (max !== null && convertido > max) {
        throw errores.solicitudInvalida(
            frase(`${campo} no puede ser mayor que ${max}`)
        );
    }

    return convertido;
}


// -----------------------------------------------------
// BOOLEANO
//
// En multipart todo llega como texto: "true", "on", "1".
// -----------------------------------------------------

function booleano(valor, porDefecto = false) {

    if (vacio(valor)) return porDefecto;

    if (typeof valor === "boolean") return valor;

    return ["true", "1", "on", "si", "sí"].includes(
        String(valor).trim().toLowerCase()
    );
}


// -----------------------------------------------------
// IDENTIFICADORES
// -----------------------------------------------------

function uuid(valor, { campo, requerido = true } = {}) {

    if (vacio(valor)) {
        if (requerido) {
            throw errores.solicitudInvalida(`Falta ${campo}`);
        }
        return null;
    }

    const limpio = String(valor).trim();

    if (!UUID.test(limpio)) {
        throw errores.solicitudInvalida(`No se reconoce ${campo}`);
    }

    return limpio;
}


// -----------------------------------------------------
// OPCION DE UNA LISTA
// -----------------------------------------------------

function opcion(valor, lista, { campo, porDefecto = null } = {}) {

    if (vacio(valor)) return porDefecto;

    const limpio = String(valor).trim();

    if (!lista.includes(limpio)) {
        throw errores.solicitudInvalida(
            frase(`${campo} tiene que ser uno de: ${lista.join(", ")}`)
        );
    }

    return limpio;
}


// -----------------------------------------------------
// PAGINACION
// -----------------------------------------------------

function paginacion(query, { porPagina = 24, maximo = 100 } = {}) {

    const pagina = Math.max(
        1,
        Math.trunc(Number(query.pagina)) || 1
    );

    const tamano = Math.min(
        maximo,
        Math.max(1, Math.trunc(Number(query.por_pagina)) || porPagina)
    );

    return { pagina, porPagina: tamano, desde: (pagina - 1) * tamano };
}


function metaPaginacion({ pagina, porPagina }, total) {
    return {
        pagina,
        por_pagina: porPagina,
        total,
        paginas: Math.max(1, Math.ceil(total / porPagina))
    };
}


module.exports = {
    texto,
    numero,
    booleano,
    uuid,
    opcion,
    paginacion,
    metaPaginacion,
    vacio
};
