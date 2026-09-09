#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const frontendSrc = path.join(__dirname, "../frontend");
const frontendDst = path.join(__dirname, "frontend");

console.log("[BUILD] __dirname:", __dirname);
console.log("[BUILD] Buscando frontend en:", frontendSrc);
console.log("[BUILD] ¿Existe frontend src?", fs.existsSync(frontendSrc));
console.log("[BUILD] ¿Existe frontend dst?", fs.existsSync(frontendDst));

if (fs.existsSync(frontendSrc)) {
    if (!fs.existsSync(frontendDst)) {
        console.log("[BUILD] Copiando frontend...");
        fs.cpSync(frontendSrc, frontendDst, { recursive: true });
        console.log("[BUILD] Frontend copiado correctamente");
    } else {
        console.log("[BUILD] Frontend ya existe en destino");
    }
} else {
    console.log("[BUILD] ⚠ ADVERTENCIA: frontend no encontrado en:", frontendSrc);
}
