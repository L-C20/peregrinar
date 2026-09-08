#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { query } = require("../src/database/connection");

async function main() {
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

        console.log("Actualizando suscripción...");
        const updateRes = await query(
            `UPDATE suscripciones 
             SET estado = 'activa', fecha_inicio = NOW()
             WHERE tenant_id = $1
             RETURNING id, estado`,
            [tenantId]
        );

        if (updateRes.rows.length === 0) {
            console.log("No hay suscripción. Creando una nueva...");
            const ahora = new Date();
            const proximo = new Date(ahora);
            proximo.setMonth(proximo.getMonth() + 1);

            const createRes = await query(
                `INSERT INTO suscripciones 
                 (tenant_id, estado, monto, ciclo_pago, dias_trial, 
                  trial_vence_en, proximo_cobro, fecha_inicio)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, estado`,
                [tenantId, 'activa', 30000, 1, 0, 
                 ahora.toISOString().split('T')[0],
                 proximo.toISOString().split('T')[0],
                 ahora.toISOString()]
            );
            console.log("✓ Suscripción creada:", createRes.rows[0].estado);
        } else {
            console.log("✓ Suscripción actualizada:", updateRes.rows[0].estado);
        }

        process.exit(0);
    } catch (err) {
        console.error("ERROR:", err.message);
        process.exit(1);
    }
}

main();
