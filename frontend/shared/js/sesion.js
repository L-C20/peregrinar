// =====================================================
// SESION DEL USUARIO ADMINISTRADOR
// Unico lugar que toca localStorage para el token.
// =====================================================

window.EP = window.EP || {};

(function () {

    const CLAVE_TOKEN = "ep_token";
    const CLAVE_USUARIO = "ep_usuario";


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

        cerrar(redirigir = true) {
            localStorage.removeItem(CLAVE_TOKEN);
            localStorage.removeItem(CLAVE_USUARIO);
            if (redirigir) window.location.href = "/login/";
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
