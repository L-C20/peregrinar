// =====================================================
// SESION DEL USUARIO ADMINISTRADOR
// Unico lugar que toca localStorage para el token.
// =====================================================

window.EP = window.EP || {};

(function () {

    const CLAVE_TOKEN = "ep_token";
    const CLAVE_USUARIO = "ep_usuario";
    const CLAVE_MOTIVO = "ep_motivo_salida";


    const sesion = {

        guardar(token, usuario) {
            localStorage.setItem(CLAVE_TOKEN, token);
            localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
        },

        token() {
            return localStorage.getItem(CLAVE_TOKEN);
        },

        usuario() {
            try {
                return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
            } catch {
                return null;
            }
        },

        activa() {
            return Boolean(this.token());
        },

        rol() {
            return this.usuario()?.rol || null;
        },

        // "motivo" explica en el login por qué lo echaron. Sin eso,
        // a quien se le vence la sesión mientras carga un producto
        // le aparece el login de la nada y no entiende qué pasó.
        // Va en sessionStorage: se muestra una vez y se descarta.
        cerrar(redirigir = true, motivo = null) {

            localStorage.removeItem(CLAVE_TOKEN);
            localStorage.removeItem(CLAVE_USUARIO);

            try {
                if (motivo) sessionStorage.setItem(CLAVE_MOTIVO, motivo);
                else sessionStorage.removeItem(CLAVE_MOTIVO);
            } catch {
                // Modo privado o almacenamiento bloqueado: se sigue igual.
            }

            if (redirigir) window.location.href = "/login/";
        },


        // Lo lee el login al cargar. Se borra al leerlo para que no
        // reaparezca en el próximo ingreso.
        motivoDeSalida() {
            try {
                const motivo = sessionStorage.getItem(CLAVE_MOTIVO);
                sessionStorage.removeItem(CLAVE_MOTIVO);
                return motivo;
            } catch {
                return null;
            }
        },

        // Guard para las paginas del panel.
        // Se llama al principio de cada pagina de /admin.
        requerir() {
            if (!this.activa()) {
                window.location.href = "/login/";
                return false;
            }
            return true;
        }

    };


    EP.sesion = sesion;

})();
