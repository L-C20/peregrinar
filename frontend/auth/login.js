// =====================================================
// INGRESO AL PANEL
//
// El backend resuelve la tienda por el dominio, asi que
// esta pantalla no manda ni sabe ningun tenant_id.
// =====================================================

(function () {

    const formulario = document.getElementById("formulario");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const boton = document.getElementById("boton");
    const verPassword = document.getElementById("verPassword");
    const aviso = document.getElementById("aviso");
    const avisoTexto = document.getElementById("avisoTexto");
    const nombreTienda = document.getElementById("nombreTienda");

    const errores = {
        email: document.getElementById("errorEmail"),
        password: document.getElementById("errorPassword")
    };


    // Si la sesión sigue viva, no tiene sentido pedir el login.
    if (EP.sesion.activa()) {
        window.location.replace("/admin/");
        return;
    }


    // Si llegó acá porque se le venció la sesión, se le dice.
    const motivo = EP.sesion.motivoDeSalida();

    if (motivo) {
        avisoTexto.textContent = motivo;
        aviso.hidden = false;
    }


    // -------------------------------------------------
    // NOMBRE DE LA TIENDA
    // Confirma de paso que el backend resolvió bien el tenant.
    // -------------------------------------------------

    EP.api.get("/api/public/tienda", { redirigirEn401: false })
        .then(datos => {
            nombreTienda.textContent = datos.tienda.nombre;
            document.title = `Ingresar · ${datos.tienda.nombre}`;
        })
        .catch(() => {
            nombreTienda.textContent = "Panel";
        });


    // -------------------------------------------------
    // MOSTRAR / OCULTAR LA CONTRASEÑA
    // -------------------------------------------------

    verPassword.addEventListener("click", () => {
        const oculta = password.type === "password";
        password.type = oculta ? "text" : "password";
        verPassword.textContent = oculta ? "Ocultar" : "Mostrar";
        password.focus();
    });


    // -------------------------------------------------
    // VALIDACION EN EL NAVEGADOR
    //
    // Es solo comodidad: evita un viaje al servidor por un
    // campo vacío. La validación que importa está en el
    // backend, que no confía en nada de esto.
    // -------------------------------------------------

    function limpiarErrores() {
        aviso.hidden = true;
        for (const campo of [email, password]) {
            campo.removeAttribute("aria-invalid");
        }
        errores.email.textContent = "";
        errores.password.textContent = "";
    }


    function marcarError(campo, mensaje) {
        campo.setAttribute("aria-invalid", "true");
        errores[campo.id].textContent = mensaje;
    }


    function validar() {

        let primerProblema = null;

        const valorEmail = email.value.trim();

        if (!valorEmail) {
            marcarError(email, "Escribí tu email");
            primerProblema = primerProblema || email;

        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valorEmail)) {
            marcarError(email, "Ese email no parece válido");
            primerProblema = primerProblema || email;
        }

        if (!password.value) {
            marcarError(password, "Escribí tu contraseña");
            primerProblema = primerProblema || password;
        }

        return primerProblema;
    }


    function mostrarAviso(mensaje) {
        avisoTexto.textContent = mensaje;
        aviso.hidden = false;
    }


    // -------------------------------------------------
    // ENVIO
    // -------------------------------------------------

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();
        limpiarErrores();

        const problema = validar();

        if (problema) {
            problema.focus();
            return;
        }


        boton.disabled = true;
        boton.textContent = "Ingresando…";


        try {

            const datos = await EP.api.post(
                "/api/auth/login",
                { email: email.value.trim(), password: password.value },
                // En esta pantalla un 401 es "credenciales incorrectas",
                // no una sesión vencida: no hay que redirigir.
                { redirigirEn401: false }
            );

            EP.sesion.guardar(datos.token, {
                ...datos.usuario,
                tienda: datos.tienda
            });

            // replace() para que el botón "atrás" no vuelva al login.
            window.location.replace("/admin/");

        } catch (error) {

            mostrarAviso(error.message);

            // Un 429 es el límite de intentos: no tiene sentido
            // dejar el botón listo para seguir probando.
            if (error.estado !== 429) {
                boton.disabled = false;
                boton.textContent = "Ingresar";
                password.value = "";
                password.focus();
            } else {
                boton.textContent = "Demasiados intentos";
            }
        }
    });

})();
