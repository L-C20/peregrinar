#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { query } = require("../src/database/connection");
const password = require("../src/utils/password");

async function main() {
    const email = "admin@editorialperegrinar.com";
    const clave = "mafrcca1989";
    const nombre = "Administrador";

    try {
        console.log("Obteniendo tenant...");
        const tenantRes = await query(
            "SELECT id FROM tenants WHERE slug = $1",
            ["editorial-peregrinar"]
        );

        if (tenantRes.rows.length === 0) {
            console.error("ERROR: No se encontró la tienda editorial-peregrinar");
            process.exit(1);
        }

        const tenantId = tenantRes.rows[0].id;
        console.log("✓ Tenant encontrado:", tenantId);

        console.log("Hasheando contraseña...");
        const passwordHash = await password.hashear(clave);
        console.log("✓ Contraseña hasheada");

        console.log("Insertando usuario...");
        const usuarioRes = await query(
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol, activo)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, nombre`,
            [tenantId, nombre, email, passwordHash, "admin", true]
        );

        const usuario = usuarioRes.rows[0];
        console.log("✓ Usuario creado exitosamente:");
        console.log("  ID:", usuario.id);
        console.log("  Email:", usuario.email);
        console.log("  Nombre:", usuario.nombre);

        process.exit(0);
    } catch (err) {
        console.error("ERROR:", err.message);
        process.exit(1);
    }
}

main();
