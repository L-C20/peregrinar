// =====================================================
// CONTRASEÑAS
//
// Unico lugar que sabe con que se hashea. Si mañana hay que
// subir el costo de bcrypt o cambiar de algoritmo, se cambia
// aca y nada mas.
//
// Nunca se guarda ni se registra una contraseña en claro.
// =====================================================

const crypto = require("crypto");
const bcrypt = require("bcrypt");

const config = require("../config/env");


// Hash de una contraseña cualquiera, usado cuando el email no
// existe. Sirve para que un login fallido tarde lo mismo haya
// usuario o no: si no, midiendo el tiempo de respuesta se
// puede averiguar que emails estan registrados.
const HASH_SEÑUELO = bcrypt.hashSync(
    crypto.randomBytes(24).toString("hex"),
    config.seguridad.bcryptRounds
);


const MINIMO = 8;

// Sin caracteres que se confundan al leerlos en voz alta o
// copiarlos a mano: 0/O, 1/l/I.
const ALFABETO =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";


function generar(largo = 18) {
    return Array.from(
        crypto.randomBytes(largo),
        byte => ALFABETO[byte % ALFABETO.length]
    ).join("");
}


function hashear(password) {
    return bcrypt.hash(password, config.seguridad.bcryptRounds);
}


function verificar(password, hash) {
    return bcrypt.compare(password, hash);
}


// Se ejecuta igual aunque no haya usuario, para no delatar
// con el tiempo de respuesta si el email existe.
function verificarSeñuelo(password) {
    return bcrypt.compare(password || "", HASH_SEÑUELO);
}


// Validacion minima y honesta: largo. Reglas de mayusculas y
// simbolos empujan a la gente a "Password1!" y no aportan.
function validar(password) {

    if (typeof password !== "string" || password.length < MINIMO) {
        return `La contraseña debe tener al menos ${MINIMO} caracteres`;
    }

    if (password.length > 200) {
        return "La contraseña es demasiado larga";
    }

    return null;
}


module.exports = { generar, hashear, verificar, verificarSeñuelo, validar, MINIMO };
