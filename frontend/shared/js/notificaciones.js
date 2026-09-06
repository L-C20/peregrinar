// =====================================================
// NOTIFICACIONES Y CONFIRMACIONES
//
// Reemplaza alert() y confirm() en toda la plataforma.
//   EP.notificar.exito("Producto creado correctamente")
//   EP.notificar.error("No se pudo eliminar el producto")
//   await EP.confirmar({ ... })  ->  true | false
// =====================================================

window.EP = window.EP || {};

(function () {

    const DURACION = 4000;

    let contenedor = null;


    function obtenerContenedor() {

        if (contenedor && document.body.contains(contenedor)) return contenedor;

        contenedor = document.createElement("div");
        contenedor.className = "ep-notificaciones";
        contenedor.setAttribute("role", "status");
        contenedor.setAttribute("aria-live", "polite");

        document.body.appendChild(contenedor);

        return contenedor;
    }


    const ICONOS = {
        exito: "\u2713",
        error: "\u2715",
        aviso: "\u26A0",
        info: "\u2139"
    };


    function mostrar(tipo, mensaje, duracion = DURACION) {

        const nodo = document.createElement("div");
        nodo.className = `ep-notificacion ep-notificacion--${tipo}`;

        const icono = document.createElement("span");
        icono.className = "ep-notificacion__icono";
        icono.textContent = ICONOS[tipo] || ICONOS.info;

        const texto = document.createElement("span");
        texto.className = "ep-notificacion__texto";
        texto.textContent = mensaje;

        const cerrar = document.createElement("button");
        cerrar.className = "ep-notificacion__cerrar";
        cerrar.type = "button";
        cerrar.setAttribute("aria-label", "Cerrar notificación");
        cerrar.textContent = "\u00D7";
        cerrar.addEventListener("click", () => quitar(nodo));

        nodo.append(icono, texto, cerrar);
        obtenerContenedor().appendChild(nodo);

        requestAnimationFrame(() => nodo.classList.add("ep-notificacion--visible"));

        if (duracion > 0) setTimeout(() => quitar(nodo), duracion);

        return nodo;
    }


    function quitar(nodo) {
        if (!nodo.isConnected) return;
        nodo.classList.remove("ep-notificacion--visible");
        setTimeout(() => nodo.remove(), 250);
    }


    // -------------------------------------------------
    // CONFIRMACION
    // Obligatoria antes de cualquier accion destructiva.
    // -------------------------------------------------

    function confirmar({
        titulo = "¿Confirmás la acción?",
        mensaje = "",
        textoConfirmar = "Confirmar",
        textoCancelar = "Cancelar",
        peligro = false
    } = {}) {

        return new Promise((resolver) => {

            const fondo = document.createElement("div");
            fondo.className = "ep-modal-fondo";

            const modal = document.createElement("div");
            modal.className = "ep-modal";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");

            const encabezado = document.createElement("h2");
            encabezado.className = "ep-modal__titulo";
            encabezado.textContent = titulo;

            const cuerpo = document.createElement("p");
            cuerpo.className = "ep-modal__mensaje";
            cuerpo.textContent = mensaje;

            const acciones = document.createElement("div");
            acciones.className = "ep-modal__acciones";

            const botonCancelar = document.createElement("button");
            botonCancelar.type = "button";
            botonCancelar.className = "ep-boton ep-boton--secundario";
            botonCancelar.textContent = textoCancelar;

            const botonConfirmar = document.createElement("button");
            botonConfirmar.type = "button";
            botonConfirmar.className = peligro
                ? "ep-boton ep-boton--peligro"
                : "ep-boton ep-boton--primario";
            botonConfirmar.textContent = textoConfirmar;

            acciones.append(botonCancelar, botonConfirmar);
            modal.append(encabezado);
            if (mensaje) modal.append(cuerpo);
            modal.append(acciones);
            fondo.append(modal);
            document.body.append(fondo);

            requestAnimationFrame(() => fondo.classList.add("ep-modal-fondo--visible"));
            botonConfirmar.focus();

            function cerrar(resultado) {
                document.removeEventListener("keydown", alPresionarTecla);
                fondo.classList.remove("ep-modal-fondo--visible");
                setTimeout(() => fondo.remove(), 200);
                resolver(resultado);
            }

            function alPresionarTecla(evento) {
                if (evento.key === "Escape") cerrar(false);
            }

            botonCancelar.addEventListener("click", () => cerrar(false));
            botonConfirmar.addEventListener("click", () => cerrar(true));
            fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(false); });
            document.addEventListener("keydown", alPresionarTecla);

        });
    }


    EP.notificar = {
        exito: (mensaje, duracion) => mostrar("exito", mensaje, duracion),
        error: (mensaje, duracion) => mostrar("error", mensaje, duracion),
        aviso: (mensaje, duracion) => mostrar("aviso", mensaje, duracion),
        info: (mensaje, duracion) => mostrar("info", mensaje, duracion)
    };

    EP.confirmar = confirmar;

})();
