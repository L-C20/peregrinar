// =====================================================
// SERVICIO · SUSCRIPCIONES
// Crear y gestionar suscripciones de tenants.
// =====================================================

const { errores } = require("../utils/errores");
const suscripcionesRepo = require("../repositories/suscripciones");
const tenantsRepo = require("../repositories/tenants");
const { crearUsuario } = require("./usuarios");
const mercadopago = require("./mercadopago");

const SLUG = /^[a-z0-9-]+$/;


async function crearSuscripcion({
    email,
    password,
    nombre_tienda,
    nombre_dueño,
    telefono
}) {

    // Validaciones
    if (!email || !email.includes("@")) {
        throw errores.solicitudInvalida("Email inválido");
    }

    if (!password || password.length < 8) {
        throw errores.solicitudInvalida("Contraseña debe tener al menos 8 caracteres");
    }

    if (!nombre_tienda || !String(nombre_tienda).trim()) {
        throw errores.solicitudInvalida("Nombre de tienda requerido");
    }

    if (!nombre_dueño || !String(nombre_dueño).trim()) {
        throw errores.solicitudInvalida("Nombre del dueño requerido");
    }

    if (!telefono || !String(telefono).trim()) {
        throw errores.solicitudInvalida("Teléfono requerido");
    }


    // Generar slug automático
    const slugBase = String(nombre_tienda)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    if (!SLUG.test(slugBase)) {
        throw errores.solicitudInvalida(
            "El nombre de la tienda solo puede contener letras, números y guiones"
        );
    }

    // Verificar slug único
    let slug = slugBase;
    let contador = 1;
    while (await tenantsRepo.porSlug(slug)) {
        slug = `${slugBase}-${contador}`;
        contador++;
    }


    // Crear tenant
    const tenant = await tenantsRepo.crear({
        slug,
        nombre: String(nombre_tienda).trim()
    });

    if (!tenant) {
        throw errores.error("No se pudo crear la tienda");
    }


    // Crear usuario admin
    const { usuario, password: claveGenerada } = await crearUsuario({
        tenantId: tenant.id,
        nombre: String(nombre_dueño).trim(),
        email: String(email).trim(),
        rol: "admin",
        password
    });

    if (!usuario) {
        throw errores.error("No se pudo crear el usuario");
    }


    // Crear suscripción con 7 días de trial
    const ahora = new Date();
    const trialVence = new Date(ahora);
    trialVence.setDate(trialVence.getDate() + 7);

    const proximo_cobro = new Date(trialVence);
    proximo_cobro.setDate(proximo_cobro.getDate() + 1);

    const suscripcion = await suscripcionesRepo.crear({
        tenant_id: tenant.id,
        estado: "pendiente",
        monto: 30000,
        ciclo_pago: 1,
        dias_trial: 7,
        trial_vence_en: trialVence.toISOString().split("T")[0],
        proximo_cobro: proximo_cobro.toISOString().split("T")[0],
        fecha_inicio: ahora.toISOString()
    });

    if (!suscripcion) {
        throw errores.error("No se pudo crear la suscripción");
    }


    return {
        tenant,
        usuario,
        suscripcion,
        email,
        nombre_tienda: tenant.nombre,
        slug: tenant.slug,
        trial_vence_en: trialVence
    };
}


async function confirmarPago(tenant_id, datos_pago) {
    // Llamado cuando MercadoPago confirma el pago

    const suscripcion = await suscripcionesRepo.obtenerPorTenant(tenant_id);

    if (!suscripcion) {
        throw errores.error("Suscripción no encontrada");
    }

    // Actualizar con datos de MP
    const actualizada = await suscripcionesRepo.actualizar(suscripcion.id, {
        mp_subscription_id: datos_pago.subscription_id || datos_pago.id,
        mp_customer_id: datos_pago.customer_id,
        estado: "activa",
        fecha_inicio: new Date().toISOString()
    });

    return actualizada;
}


async function verificarAcceso(tenant_id) {
    // Verificar si un tenant tiene acceso al panel

    const suscripcion = await suscripcionesRepo.obtenerPorTenant(tenant_id);

    if (!suscripcion) {
        return { acceso: false, motivo: "sin_suscripcion" };
    }

    if (suscripcion.estado === "cancelada") {
        return { acceso: false, motivo: "suscripcion_cancelada" };
    }

    // Verificar trial
    if (suscripcion.estado === "pendiente" && suscripcion.trial_vence_en) {
        const hoy = new Date().toISOString().split("T")[0];
        if (hoy > suscripcion.trial_vence_en) {
            // Trial vencido y aún no pagó
            return { acceso: false, motivo: "trial_vencido" };
        }
        // En trial, OK
        return { acceso: true, en_trial: true };
    }

    if (suscripcion.estado === "activa") {
        return { acceso: true, en_trial: false };
    }

    if (suscripcion.estado === "pago_fallido") {
        return { acceso: false, motivo: "pago_fallido" };
    }

    return { acceso: false, motivo: "estado_desconocido" };
}


module.exports = {
    crearSuscripcion,
    confirmarPago,
    verificarAcceso
};
