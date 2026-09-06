// =====================================================
// UTILIDADES DEL PANEL
//
// Formatos, ayudas para armar HTML sin innerHTML y los
// iconos. Se carga antes que cualquier otra pantalla.
// =====================================================

window.EP = window.EP || {};

(function () {

    // -------------------------------------------------
    // FORMATOS
    // -------------------------------------------------

    const moneda = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2
    });

    const numero = new Intl.NumberFormat("es-AR");

    const fecha = new Intl.DateTimeFormat("es-AR", {
        day: "2-digit", month: "short", year: "numeric"
    });


    EP.fmt = {

        precio: (valor) => moneda.format(Number(valor) || 0),

        numero: (valor) => numero.format(Number(valor) || 0),

        fecha: (iso) => (iso ? fecha.format(new Date(iso)) : ""),

        // "hace 3 días" es más útil que una fecha exacta para
        // saber qué se cargó recién.
        relativa(iso) {
            if (!iso) return "";

            const dias = Math.floor(
                (Date.now() - new Date(iso).getTime()) / 86400000
            );

            if (dias <= 0) return "hoy";
            if (dias === 1) return "ayer";
            if (dias < 30) return `hace ${dias} días`;

            return fecha.format(new Date(iso));
        }
    };


    // -------------------------------------------------
    // DOM
    //
    // Se arma con createElement y textContent en vez de
    // innerHTML: los nombres de producto los escribe el
    // cliente y podrían traer < o & sin mala intención.
    // -------------------------------------------------

    EP.dom = {

        crear(etiqueta, propiedades = {}, hijos = []) {

            const nodo = document.createElement(etiqueta);

            for (const [clave, valor] of Object.entries(propiedades)) {

                if (valor === null || valor === undefined || valor === false) continue;

                if (clave === "clase") nodo.className = valor;
                else if (clave === "texto") nodo.textContent = valor;
                else if (clave === "html") nodo.innerHTML = valor;   // solo para iconos propios
                else if (clave === "datos") Object.assign(nodo.dataset, valor);
                else if (clave.startsWith("on")) {
                    nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
                }
                else if (clave === "estilo") nodo.setAttribute("style", valor);
                else if (valor === true) nodo.setAttribute(clave, "");
                else nodo.setAttribute(clave, valor);
            }

            for (const hijo of [].concat(hijos)) {
                if (hijo === null || hijo === undefined || hijo === false) continue;
                nodo.append(typeof hijo === "string" ? document.createTextNode(hijo) : hijo);
            }

            return nodo;
        },

        vaciar(nodo) {
            while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
            return nodo;
        },

        reemplazar(nodo, ...contenido) {
            EP.dom.vaciar(nodo);
            nodo.append(...contenido.flat().filter(Boolean));
            return nodo;
        },

        icono(nombre, clase = "") {
            const envoltorio = document.createElement("span");
            envoltorio.className = clase;
            envoltorio.innerHTML = EP.iconos[nombre] || "";
            return envoltorio.firstElementChild || envoltorio;
        }
    };


    // -------------------------------------------------
    // VARIOS
    // -------------------------------------------------

    EP.util = {

        // Para no consultar la API en cada tecla del buscador.
        esperar(fn, ms = 350) {
            let temporizador;
            return (...args) => {
                clearTimeout(temporizador);
                temporizador = setTimeout(() => fn(...args), ms);
            };
        },

        // Deja el formulario bloqueado mientras se guarda, para
        // que un doble clic no cree el producto dos veces.
        async ocupado(boton, tarea, textoOcupado = "Guardando…") {
            const original = boton.textContent;
            boton.disabled = true;
            boton.textContent = textoOcupado;
            try {
                return await tarea();
            } finally {
                boton.disabled = false;
                boton.textContent = original;
            }
        },

        parametros(objeto) {
            const query = new URLSearchParams();
            for (const [clave, valor] of Object.entries(objeto)) {
                if (valor !== "" && valor !== null && valor !== undefined) {
                    query.set(clave, valor);
                }
            }
            const texto = query.toString();
            return texto ? `?${texto}` : "";
        }
    };


    // -------------------------------------------------
    // ICONOS
    // Trazos sueltos, sin librería: son diez y pesan nada.
    // -------------------------------------------------

    const trazo = 'fill="none" stroke="currentColor" stroke-width="1.7" ' +
                  'stroke-linecap="round" stroke-linejoin="round"';

    const svg = (contenido) =>
        `<svg viewBox="0 0 24 24" ${trazo} aria-hidden="true">${contenido}</svg>`;

    EP.iconos = {
        inicio: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
        productos: svg('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'),
        categorias: svg('<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>'),
        pedidos: svg('<path d="M6 2h12l1.5 5H4.5z"/><path d="M5 7v13h14V7"/><path d="M9.5 11a2.5 2.5 0 0 0 5 0"/>'),
        clientes: svg('<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
        apariencia: svg('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.5" r="1.2"/><circle cx="15" cy="9.5" r="1.2"/><circle cx="9.5" cy="15" r="1.2"/>'),
        contenido: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
        configuracion: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1"/>'),
        buscar: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
        mas: svg('<path d="M12 5v14M5 12h14"/>'),
        lapiz: svg('<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>'),
        basura: svg('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>'),
        cerrar: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
        menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
        imagen: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-2 4 4"/>'),
        subir: svg('<path d="M12 16V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'),
        asa: svg('<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>'),
        alerta: svg('<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17.5v.01"/>'),
        tienda: svg('<path d="M4 9h16v11H4z"/><path d="M3 9 5 4h14l2 5"/><path d="M9 20v-6h6v6"/>')
    };

})();
