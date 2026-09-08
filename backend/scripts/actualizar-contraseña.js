#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { query } = require("../src/database/connection");
const password = require("../src/utils/password");

async function main() {
    const email = "admin@editorialperegrinar.com";
    const clave = "mafrcca1989";

    try {
        console.log("Buscando usuario...");
        const usuarioRes = await query(
            "SELECT id, email FROM usuarios WHERE lower(email) = lower($1)",
            [email]
        );

        if (usuarioRes.rows.length === 0) {
            console.error("ERROR: Usuario no encontrado");
            process.exit(1);
        }

        const usuario = usuarioRes.rows[0];
        console.log("✓ Usuario encontrado:", usuario.email);

        console.log("Hasheando contraseña...");
        const passwordHash = await password.hashear(clave);
        console.log("✓ Contraseña hasheada");

        console.log("Actualizando contraseña...");
        const updateRes = await query(
            "UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING id, email",
            [passwordHash, usuario.id]
        );

        console.log("✓ Contraseña actualizada exitosamente para:", updateRes.rows[0].email);

        process.exit(0);
    } catch (err) {
        console.error("ERROR:", err.message);
        process.exit(1);
    }
}

main();
