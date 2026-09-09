#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Copiar frontend si existe
const frontendSrc = path.join(__dirname, "../frontend");
const frontendDst = path.join(__dirname, "frontend");

if (fs.existsSync(frontendSrc) && !fs.existsSync(frontendDst)) {
    console.log("Copiando frontend...");
    fs.cpSync(frontendSrc, frontendDst, { recursive: true });
    console.log("Frontend copiado");
} else if (!fs.existsSync(frontendSrc)) {
    console.log("Advertencia: frontend no encontrado en", frontendSrc);
}
