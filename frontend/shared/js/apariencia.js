// =====================================================
// APARIENCIA · COMO SE APLICA LO QUE EL CLIENTE ELIGE
//
// Traduce lo guardado en la base a las variables de
// tokens.css. Lo usan DOS lugares:
//
//   - la tienda, sobre <html>, para verse como el cliente
//     la dejo;
//   - el editor del panel, sobre el recuadro de vista
//     previa, para mostrar el resultado antes de guardar.
//
// Vive acá y no en cada uno porque si el editor tradujera
// distinto que la tienda, la vista previa mentiria. Es
// exactamente el tipo de diferencia que nadie nota hasta
// que el cliente publica algo que no se ve como esperaba.
//
//   EP.apariencia.aplicar(document.documentElement, datos);
//   EP.apariencia.aplicar(recuadro, EP.apariencia.desdeCampos(formulario));
// =====================================================

window.EP = window.EP || {};

(function () {

    // -------------------------------------------------
    // TIPOGRAFIAS
    //
    // Lista cerrada a proposito: el valor viene de la base y
    // termina en una URL a Google Fonts. Un dato mal cargado
    // no puede hacer que la tienda le pida cualquier cosa a
    // un tercero.
    // -------------------------------------------------

    const FUENTES = {
        "Inter": "Inter:wght@400;500;600;700",
        "Playfair Display": "Playfair+Display:wght@500;600;700",
        "Lora": "Lora:wght@400;500;600;700",
        "Merriweather": "Merriweather:wght@400;700",
        "Libre Baskerville": "Libre+Baskerville:wght@400;700",
        "Source Serif 4": "Source+Serif+4:wght@400;600;700",
        "Poppins": "Poppins:wght@400;500;600;700",
        "Montserrat": "Montserrat:wght@400;500;600;700",
        "Nunito": "Nunito:wght@400;600;700",
        "Work Sans": "Work+Sans:wght@400;500;600;700"
    };

    const SON_SERIF = new Set([
        "Playfair Display", "Lora", "Merriweather",
        "Libre Baskerville", "Source Serif 4"
    ]);

    const RESPALDO_SERIF = 'Georgia, "Times New Roman", serif';
    const RESPALDO_SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';


    function pilaDeFuente(nombre) {
        const respaldo = SON_SERIF.has(nombre) ? RESPALDO_SERIF : RESPALDO_SANS;
        return FUENTES[nombre] ? `"${nombre}", ${respaldo}` : respaldo;
    }


    // Cada familia se pide una sola vez por carga, sin importar
    // cuantas veces se aplique la apariencia. En el editor eso
    // pasa en cada tecla.
    const pedidas = new Set();

    function cargarFuentes(nombres) {

        const familias = [...new Set(nombres)]
            .filter(nombre => FUENTES[nombre] && !pedidas.has(nombre));

        if (familias.length === 0) return;

        familias.forEach(nombre => pedidas.add(nombre));

        const enlace = (props) => {
            const nodo = document.createElement("link");
            Object.entries(props).forEach(([k, v]) => nodo.setAttribute(k, v === true ? "" : v));
            return nodo;
        };

        // Precarga del origen: ahorra una vuelta de DNS y TLS.
        if (pedidas.size === familias.length) {
            document.head.append(
                enlace({ rel: "preconnect", href: "https://fonts.googleapis.com" }),
                enlace({ rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: true })
            );
        }

        document.head.append(enlace({
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?" +
                  familias.map(nombre => `family=${FUENTES[nombre]}`).join("&") +
                  "&display=swap"
        }));
    }


    // -------------------------------------------------
    // TABLAS DE EQUIVALENCIA
    //
    // OJO: las mismas tablas estan en
    // backend/src/controllers/publico/tienda.js, que es quien
    // arma la respuesta de la tienda publica. Si cambia una,
    // cambia la otra.
    // -------------------------------------------------

    const TAMANOS = { chico: 0.9, medio: 1, grande: 1.15 };

    const RADIOS = { recto: "0px", redondeado: "8px", suave: "999px" };

    const TARJETAS = {
        plana: { borde: "1px solid transparent", sombra: "none" },
        borde: { borde: "1px solid var(--color-borde)", sombra: "none" },
        sombra: {
            borde: "1px solid transparent",
            sombra: "0 1px 3px rgba(15,23,42,.07), 0 8px 24px rgba(15,23,42,.06)"
        }
    };


    // -------------------------------------------------
    // DE LAS COLUMNAS DE LA BASE A LA FORMA QUE ESPERA aplicar()
    //
    // El editor tiene los valores crudos (chico, redondeado);
    // la tienda publica los recibe ya traducidos del backend.
    // Esta funcion pone a los dos en la misma forma.
    // -------------------------------------------------

    function desdeCampos(campos) {
        return {
            colores: {
                principal: campos.color_principal,
                secundario: campos.color_secundario,
                fondo: campos.color_fondo,
                texto: campos.color_texto,
                boton: campos.color_boton,
                boton_texto: campos.color_boton_texto,
                enlace: campos.color_enlace
            },
            tipografia: {
                principal: campos.fuente_principal,
                titulos: campos.fuente_titulos,
                tamano_titulos: TAMANOS[campos.tamano_titulos] ?? 1,
                peso_titulos: campos.peso_titulos
            },
            estilo: {
                botones: campos.estilo_botones,
                radio_boton: RADIOS[campos.estilo_botones] ?? "8px",
                tarjetas: campos.estilo_tarjetas
            }
        };
    }


    // -------------------------------------------------
    // APLICAR
    //
    // "destino" es el elemento sobre el que se escriben las
    // variables: <html> en la tienda, el recuadro de vista
    // previa en el editor.
    // -------------------------------------------------

    function aplicar(destino, apariencia) {

        if (!destino || !apariencia) return;

        const estilo = destino.style;
        const c = apariencia.colores || {};
        const t = apariencia.tipografia || {};
        const e = apariencia.estilo || {};

        estilo.setProperty("--color-principal", c.principal);
        estilo.setProperty("--color-secundario", c.secundario);
        estilo.setProperty("--color-fondo", c.fondo);
        estilo.setProperty("--color-texto", c.texto);
        estilo.setProperty("--color-boton", c.boton);
        estilo.setProperty("--color-boton-texto", c.boton_texto);
        estilo.setProperty("--color-enlace", c.enlace);

        // La superficie de las tarjetas se calcula a partir del
        // fondo para que no desentone si el cliente elige un
        // fondo oscuro.
        estilo.setProperty("--color-superficie", c.fondo);
        estilo.setProperty("--color-borde",
            `color-mix(in srgb, ${c.texto} 14%, transparent)`);

        cargarFuentes([t.principal, t.titulos]);
        estilo.setProperty("--fuente-principal", pilaDeFuente(t.principal));
        estilo.setProperty("--fuente-titulos", pilaDeFuente(t.titulos));
        estilo.setProperty("--tamano-titulos", String(t.tamano_titulos ?? 1));
        estilo.setProperty("--peso-titulos", t.peso_titulos);

        estilo.setProperty("--radio-boton", e.radio_boton || RADIOS[e.botones] || "8px");

        const tarjeta = TARJETAS[e.tarjetas];

        if (tarjeta) {
            estilo.setProperty("--borde-tarjeta", tarjeta.borde);
            estilo.setProperty("--sombra-tarjeta", tarjeta.sombra);
        }
    }


    EP.apariencia = {
        FUENTES, SON_SERIF, TAMANOS, RADIOS, TARJETAS,
        pilaDeFuente, cargarFuentes,
        desdeCampos, aplicar
    };

})();
