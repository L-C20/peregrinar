// =====================================================
// PANEL · PANTALLA PROVISORIA DE LA ETAPA 5
//
// Sirve para comprobar de punta a punta que el login, el
// token y el cambio de contraseña funcionan. El panel real
// se construye en la Etapa 7.
// =====================================================

(function () {

    // Sin sesión no se muestra nada: vuelve al login.
    if (!EP.sesion.requerir()) return;


    const titulo = document.getElementById("titulo");
    const datos = document.getElementById("datos");
    const botonSalir = document.getElementById("botonSalir");
    const botonPassword = document.getElementById("botonPassword");
    const cajaPassword = document.getElementById("cajaPassword");
    const formPassword = document.getElementById("formPassword");
    const botonGuardar = document.getElementById("botonGuardar");


    const ROLES = {
        superadmin: "Superadministrador de la plataforma",
        admin: "Administrador de la tienda",
        empleado: "Empleado"
    };


    function fila(etiqueta, valor) {
        const bloque = document.createElement("div");
        bloque.className = "panel__dato";

        const dt = document.createElement("dt");
        dt.textContent = etiqueta;

        const dd = document.createElement("dd");
        dd.textContent = valor;

        bloque.append(dt, dd);
        datos.append(bloque);
    }


    // -------------------------------------------------
    // QUIEN SOY
    //
    // Se le pregunta al backend en vez de confiar en lo que
    // quedó guardado en el navegador: si la sesión venció o
    // el usuario fue desactivado, hay que enterarse ahora.
    // -------------------------------------------------

    EP.api.get("/api/auth/yo")
        .then(respuesta => {

            const usuario = respuesta.usuario;

            titulo.textContent = respuesta.tienda
                ? respuesta.tienda.nombre
                : "Plataforma";

            document.title = titulo.textContent;

            fila("Usuario", usuario.nombre);
            fila("Email", usuario.email);
            fila("Rol", ROLES[usuario.rol] || usuario.rol);

            if (respuesta.tienda) {
                fila("Tienda", respuesta.tienda.nombre);
            }
        })
        .catch(error => {
            EP.notificar.error(error.message);
        });


    // -------------------------------------------------
    // CERRAR SESION
    // -------------------------------------------------

    botonSalir.addEventListener("click", async () => {

        const confirmado = await EP.confirmar({
            titulo: "¿Cerrar sesión?",
            mensaje: "Vas a tener que ingresar de nuevo con tu email y contraseña.",
            textoConfirmar: "Cerrar sesión"
        });

        if (confirmado) EP.sesion.cerrar();
    });


    // -------------------------------------------------
    // CAMBIAR CONTRASEÑA
    // -------------------------------------------------

    botonPassword.addEventListener("click", () => {
        cajaPassword.hidden = !cajaPassword.hidden;
        if (!cajaPassword.hidden) document.getElementById("actual").focus();
    });


    formPassword.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const actual = document.getElementById("actual");
        const nueva = document.getElementById("nueva");

        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando…";

        try {

            const respuesta = await EP.api.post(
                "/api/auth/cambiar-password",
                {
                    password_actual: actual.value,
                    password_nueva: nueva.value
                },
                { redirigirEn401: false }
            );

            EP.notificar.exito(respuesta.mensaje);

            formPassword.reset();
            cajaPassword.hidden = true;

        } catch (error) {
            EP.notificar.error(error.message);

        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = "Guardar";
        }
    });

})();
