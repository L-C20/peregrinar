// =====================================================
// FORMULARIO DE REGISTRO
// =====================================================

let datosRegistro = {
    nombre_tienda: "",
    nombre_dueño: "",
    telefono: "",
    email: "",
    password: ""
};


function irAlPaso2() {
    datosRegistro.nombre_tienda = document.getElementById("nombre-tienda").value.trim();
    datosRegistro.nombre_dueño = document.getElementById("nombre-dueño").value.trim();
    datosRegistro.telefono = document.getElementById("telefono").value.trim();
    datosRegistro.email = document.getElementById("email").value.trim();
    datosRegistro.password = document.getElementById("password").value;

    const error = document.getElementById("error-1");
    error.innerHTML = "";
    error.classList.remove("activo");

    // Validaciones
    if (!datosRegistro.nombre_tienda) {
        mostrarError(error, "Ingresá el nombre de tu tienda");
        return;
    }
    if (!datosRegistro.nombre_dueño) {
        mostrarError(error, "Ingresá tu nombre");
        return;
    }
    if (!datosRegistro.telefono) {
        mostrarError(error, "Ingresá tu teléfono");
        return;
    }
    if (!datosRegistro.email.includes("@")) {
        mostrarError(error, "Email inválido");
        return;
    }
    if (datosRegistro.password.length < 8) {
        mostrarError(error, "La contraseña debe tener al menos 8 caracteres");
        return;
    }

    // Mostrar resumen en paso 2
    document.getElementById("resumen-tienda").textContent = datosRegistro.nombre_tienda;
    document.getElementById("resumen-email").textContent = datosRegistro.email;

    // Cambiar de paso
    document.getElementById("paso-1").classList.remove("activo");
    document.getElementById("paso-2").classList.add("activo");

    document.querySelector(".paso-1").classList.remove("activa");
    document.querySelector(".paso-1").classList.add("completa");
    document.querySelector(".paso-2").classList.add("activa");
}


function volverAlPaso1() {
    document.getElementById("paso-1").classList.add("activo");
    document.getElementById("paso-2").classList.remove("activo");

    document.querySelector(".paso-1").classList.remove("completa");
    document.querySelector(".paso-1").classList.add("activa");
    document.querySelector(".paso-2").classList.remove("activa");
}


function actualizarPreviewSlug() {
    const slug = document.getElementById("nombre-tienda").value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    document.getElementById("preview-slug").textContent =
        slug ? `Tu tienda: ${slug}.luces-digital.com` : "mitienda.luces-digital.com";

    document.getElementById("url-preview").textContent = slug || "mitienda";
}


async function procesarRegistro() {
    const boton = document.getElementById("boton-pagar");
    const cargando = document.getElementById("cargando-pago");
    const error = document.getElementById("error-2");

    boton.disabled = true;
    cargando.style.display = "block";
    error.classList.remove("activo");

    try {
        const response = await fetch("/api/auth/registro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosRegistro)
        });

        const resultado = await response.json();

        if (!response.ok) {
            throw new Error(resultado.error || "Error en el registro");
        }

        const datos = resultado.data;

        // Guardar datos para después
        sessionStorage.setItem("preference_id", datos.pago.preference_id);
        sessionStorage.setItem("tenant_slug", datos.tenant.slug);

        // Redirigir a checkout de MercadoPago
        if (datos.pago.init_point) {
            window.location.href = datos.pago.init_point;
        } else if (datos.pago.sandbox_init_point) {
            window.location.href = datos.pago.sandbox_init_point;
        } else {
            throw new Error("No se pudo obtener el enlace de pago");
        }

    } catch (err) {
        mostrarError(error, err.message);
        boton.disabled = false;
        cargando.style.display = "none";
    }
}


function mostrarError(elemento, mensaje) {
    elemento.innerHTML = mensaje;
    elemento.classList.add("activo");
    elemento.scrollIntoView({ behavior: "smooth", block: "nearest" });
}


// Event listeners
document.addEventListener("DOMContentLoaded", function() {
    const botonContinuar = document.getElementById("boton-continuar");
    const botonPagar = document.getElementById("boton-pagar");
    const botonVolver = document.getElementById("boton-volver");
    const nombreTienda = document.getElementById("nombre-tienda");

    if (botonContinuar) botonContinuar.addEventListener("click", irAlPaso2);
    if (botonPagar) botonPagar.addEventListener("click", procesarRegistro);
    if (botonVolver) botonVolver.addEventListener("click", volverAlPaso1);
    if (nombreTienda) nombreTienda.addEventListener("input", actualizarPreviewSlug);
});
