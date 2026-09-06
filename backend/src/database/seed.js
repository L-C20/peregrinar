// =====================================================
// DATOS INICIALES · EDITORIAL PEREGRINAR
//
//   npm run seed
//
// Crea el primer tenant con su administrador, su
// configuracion y un catalogo de ejemplo.
//
// NO se ejecuta al arrancar el servidor. Es un comando
// aparte, que se corre a mano, una vez.
//
// Es idempotente: si el tenant ya existe no duplica nada,
// avisa y termina. Para volver a empezar en desarrollo,
// borrá la base y corré migrate + seed de nuevo.
//
// La contraseña del administrador NUNCA esta escrita en
// este archivo. Sale de SEED_ADMIN_PASSWORD, y si no esta
// definida se genera una al azar y se muestra una sola vez.
// =====================================================

const crypto = require("crypto");
const bcrypt = require("bcrypt");

const config = require("../config/env");
const { pool, transaccion } = require("./connection");


const SLUG_TENANT = "editorial-peregrinar";


// -----------------------------------------------------
// SALIDA
// -----------------------------------------------------

const linea = (texto = "") => console.log(texto);
const ok = (texto) => console.log(`  ✓ ${texto}`);
const info = (texto) => console.log(`  • ${texto}`);
const error = (texto) => console.error(`  ✗ ${texto}`);


// -----------------------------------------------------
// CONTENIDO INICIAL
// -----------------------------------------------------

const TENANT = {
    nombre: "Editorial Peregrinar",
    slug: SLUG_TENANT,
    plan: "basico"
};


// Modulos: lo que la tienda tiene habilitado hoy.
const MODULOS = [
    ["catalogo", true],
    ["carrito", true],
    ["pedidos", true],
    ["galeria", true],
    ["promociones", false],
    ["insumos", false],
    ["blog", false]
];


// Paleta cálida y sobria, pensada para una librería cristiana.
const APARIENCIA = {
    nombre_tienda: "Editorial Peregrinar",
    descripcion_tienda: "Libros, papelería y regalería cristiana",

    color_principal: "#6E3B34",
    color_secundario: "#C9A227",
    color_fondo: "#FDFBF7",
    color_texto: "#2C2724",
    color_boton: "#6E3B34",
    color_boton_texto: "#FFFFFF",
    color_enlace: "#6E3B34",

    fuente_principal: "Inter",
    fuente_titulos: "Playfair Display",
    tamano_titulos: "medio",
    peso_titulos: "600",

    estilo_botones: "redondeado",
    estilo_tarjetas: "sombra",

    texto_bienvenida: "Libros que acompañan el camino",
    texto_subtitulo: "Biblias, literatura cristiana y papelería con propósito",
    texto_boton_principal: "Ver catálogo",
    mensaje_destacado: null
};


const SITIO = {
    meta_titulo: "Editorial Peregrinar · Libros y papelería cristiana",
    meta_descripcion:
        "Biblias, literatura cristiana, papelería y regalería. " +
        "Envíos a todo el país.",
    og_titulo: "Editorial Peregrinar",
    og_descripcion: "Libros, papelería y regalería cristiana",
    moneda: "ARS",
    simbolo_moneda: "$"
};


const MEDIOS_PAGO = [
    {
        tipo: "efectivo",
        nombre: "Efectivo",
        instrucciones: "Se abona al retirar el pedido.",
        orden: 0
    },
    {
        tipo: "transferencia",
        nombre: "Transferencia bancaria",
        instrucciones:
            "Te enviamos los datos de la cuenta al confirmar el pedido.",
        orden: 1
    }
];


const CATEGORIAS = [
    { nombre: "Biblias", slug: "biblias", orden: 0,
      descripcion: "Biblias de estudio, devocionales y de regalo" },
    { nombre: "Libros", slug: "libros", orden: 1,
      descripcion: "Literatura cristiana, devocionales y estudio bíblico" },
    { nombre: "Papelería", slug: "papeleria", orden: 2,
      descripcion: "Cuadernos, agendas, libretas y anotadores" },
    { nombre: "Regalería", slug: "regaleria", orden: 3,
      descripcion: "Tazas, cuadros, señaladores y objetos de regalo" },
    { nombre: "Insumos", slug: "insumos", orden: 4,
      descripcion: "Materiales y accesorios" }
];


// Catálogo de ejemplo. Sin imágenes: se cargan desde el panel.
const PRODUCTOS = [
    { categoria: "biblias", nombre: "Biblia de estudio, tapa dura",
      slug: "biblia-de-estudio-tapa-dura", precio: 48900, stock: 12,
      destacado: true,
      descripcion: "Biblia de estudio con notas al pie, mapas y concordancia." },

    { categoria: "biblias", nombre: "Biblia compacta con cierre",
      slug: "biblia-compacta-con-cierre", precio: 32500, stock: 20,
      descripcion: "Formato de bolsillo, cubierta símil cuero con cierre." },

    { categoria: "libros", nombre: "Devocional diario",
      slug: "devocional-diario", precio: 18700, stock: 30, novedad: true,
      descripcion: "Una lectura breve para cada día del año." },

    { categoria: "libros", nombre: "El peregrino, edición ilustrada",
      slug: "el-peregrino-edicion-ilustrada", precio: 24900, stock: 8,
      destacado: true,
      descripcion: "Edición ilustrada del clásico de John Bunyan." },

    { categoria: "papeleria", nombre: "Cuaderno tapa dura A5",
      slug: "cuaderno-tapa-dura-a5", precio: 9800, stock: 45,
      descripcion: "96 hojas rayadas, encuadernación cosida." },

    { categoria: "papeleria", nombre: "Agenda anual",
      slug: "agenda-anual", precio: 15400, precio_anterior: 18900, stock: 25,
      novedad: true,
      descripcion: "Planificador semanal con espacio para notas y versículos." },

    { categoria: "regaleria", nombre: "Taza de cerámica con versículo",
      slug: "taza-de-ceramica-con-versiculo", precio: 11200, stock: 18,
      descripcion: "Cerámica esmaltada, apta para microondas." },

    { categoria: "regaleria", nombre: "Set de señaladores",
      slug: "set-de-senaladores", precio: 4500, stock: 60,
      descripcion: "Seis señaladores impresos en cartulina ilustración." }
];


const FAQ = [
    { pregunta: "¿Hacen envíos a todo el país?",
      respuesta: "Sí. Coordinamos el envío por correo una vez confirmado el pedido." },

    { pregunta: "¿Qué formas de pago aceptan?",
      respuesta: "Efectivo al retirar y transferencia bancaria." },

    { pregunta: "¿Puedo retirar el pedido personalmente?",
      respuesta: "Sí. Al confirmar el pedido te pasamos la dirección y los horarios." },

    { pregunta: "¿Hacen trabajos personalizados?",
      respuesta: "Sí, realizamos personalizaciones sobre pedido. Escribinos y lo vemos." }
];


const PAGINAS = [
    {
        clave: "nosotros",
        titulo: "Nosotros",
        subtitulo: "Una editorial con propósito",
        contenido:
            "<p>Editorial Peregrinar nació con el deseo de acercar buena " +
            "literatura cristiana, papelería y regalería a quienes caminan " +
            "en la fe.</p><p>Este texto se edita desde el panel " +
            "administrativo, en la sección Contenido.</p>"
    },
    {
        clave: "trabajos-personalizados",
        titulo: "Trabajos personalizados",
        subtitulo: "Regalos y materiales a medida",
        contenido:
            "<p>Realizamos cuadernos, señaladores y regalos personalizados " +
            "para congregaciones, retiros y eventos.</p><p>Contanos qué " +
            "necesitás y preparamos un presupuesto.</p>"
    }
];


const GALERIAS = [
    { nombre: "Trabajos realizados", slug: "trabajos-realizados", orden: 0,
      descripcion: "Algunos de los trabajos personalizados que hicimos" }
];


// -----------------------------------------------------
// CONTRASEÑA DEL ADMINISTRADOR
// -----------------------------------------------------

function obtenerCredenciales() {

    const email =
        process.env.SEED_ADMIN_EMAIL || "admin@editorialperegrinar.com";

    const password = process.env.SEED_ADMIN_PASSWORD;

    if (password) {
        return { email, password, generada: false };
    }

    // 18 caracteres seguros, sin ambigüedades visuales.
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    const generada = Array.from(
        crypto.randomBytes(18),
        byte => alfabeto[byte % alfabeto.length]
    ).join("");

    return { email, password: generada, generada: true };
}


// -----------------------------------------------------
// PROCESO
// -----------------------------------------------------

async function sembrar() {

    // Guardarraíl: en producción hay que pedirlo explícitamente.
    if (config.esProduccion && !process.argv.includes("--forzar")) {
        error("NODE_ENV es production.");
        linea();
        linea("  Este comando carga datos de ejemplo. Si de verdad querés");
        linea("  ejecutarlo en producción, agregá --forzar.");
        linea();
        process.exit(1);
    }


    const existente = await pool.query(
        "SELECT id, nombre FROM tenants WHERE slug = $1",
        [SLUG_TENANT]
    );

    if (existente.rows.length > 0) {
        info(`El tenant "${existente.rows[0].nombre}" ya existe. No se cambió nada.`);
        linea();
        linea("  Para volver a empezar en desarrollo:");
        linea("    1. borrá la base de datos");
        linea("    2. npm run migrate");
        linea("    3. npm run seed");
        return;
    }


    const credenciales = obtenerCredenciales();

    const passwordHash = await bcrypt.hash(
        credenciales.password,
        config.seguridad.bcryptRounds
    );


    await transaccion(async (cliente) => {

        // ---------------------------------------------
        // TENANT
        // ---------------------------------------------

        const tenant = (await cliente.query(
            `INSERT INTO tenants (nombre, slug, plan)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [TENANT.nombre, TENANT.slug, TENANT.plan]
        )).rows[0];

        const tenantId = tenant.id;

        ok(`Tenant "${TENANT.nombre}" creado`);


        // ---------------------------------------------
        // DOMINIO
        // En desarrollo la tienda se sirve desde localhost.
        // El dominio real se agrega desde el panel de
        // plataforma cuando exista.
        // ---------------------------------------------

        await cliente.query(
            `INSERT INTO tenant_dominios (tenant_id, dominio, principal)
             VALUES ($1, $2, true)`,
            [tenantId, "localhost"]
        );

        ok("Dominio localhost asociado");


        // ---------------------------------------------
        // MODULOS
        // ---------------------------------------------

        for (const [modulo, activo] of MODULOS) {
            await cliente.query(
                `INSERT INTO tenant_modulos (tenant_id, modulo, activo)
                 VALUES ($1, $2, $3)`,
                [tenantId, modulo, activo]
            );
        }

        ok(`${MODULOS.filter(m => m[1]).length} módulos activos`);


        // ---------------------------------------------
        // ADMINISTRADOR
        // ---------------------------------------------

        await cliente.query(
            `INSERT INTO usuarios (tenant_id, nombre, email, password_hash, rol)
             VALUES ($1, $2, $3, $4, 'admin')`,
            [tenantId, "Administrador", credenciales.email, passwordHash]
        );

        ok(`Administrador ${credenciales.email} creado`);


        // ---------------------------------------------
        // CONFIGURACION
        // ---------------------------------------------

        const camposApariencia = Object.keys(APARIENCIA);

        await cliente.query(
            `INSERT INTO configuracion_apariencia
                 (tenant_id, ${camposApariencia.join(", ")})
             VALUES
                 ($1, ${camposApariencia.map((_, i) => `$${i + 2}`).join(", ")})`,
            [tenantId, ...camposApariencia.map(campo => APARIENCIA[campo])]
        );

        const camposSitio = Object.keys(SITIO);

        await cliente.query(
            `INSERT INTO configuracion_sitio
                 (tenant_id, ${camposSitio.join(", ")})
             VALUES
                 ($1, ${camposSitio.map((_, i) => `$${i + 2}`).join(", ")})`,
            [tenantId, ...camposSitio.map(campo => SITIO[campo])]
        );

        // Los datos de contacto los completa el cliente desde el panel.
        await cliente.query(
            "INSERT INTO configuracion_contacto (tenant_id) VALUES ($1)",
            [tenantId]
        );

        ok("Configuración de apariencia, sitio y contacto creada");


        // ---------------------------------------------
        // MEDIOS DE PAGO
        // ---------------------------------------------

        for (const medio of MEDIOS_PAGO) {
            await cliente.query(
                `INSERT INTO medios_pago (tenant_id, tipo, nombre, instrucciones, orden)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tenantId, medio.tipo, medio.nombre, medio.instrucciones, medio.orden]
            );
        }

        ok(`${MEDIOS_PAGO.length} medios de pago configurados`);


        // ---------------------------------------------
        // CATEGORIAS
        // ---------------------------------------------

        const idsCategorias = new Map();

        for (const categoria of CATEGORIAS) {

            const fila = (await cliente.query(
                `INSERT INTO categorias (tenant_id, nombre, slug, descripcion, orden)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [tenantId, categoria.nombre, categoria.slug,
                 categoria.descripcion, categoria.orden]
            )).rows[0];

            idsCategorias.set(categoria.slug, fila.id);
        }

        ok(`${CATEGORIAS.length} categorías creadas`);


        // ---------------------------------------------
        // PRODUCTOS
        // ---------------------------------------------

        let orden = 0;

        for (const producto of PRODUCTOS) {

            await cliente.query(
                `INSERT INTO productos (
                     tenant_id, categoria_id, nombre, slug, descripcion,
                     precio, precio_anterior, stock,
                     destacado, novedad, orden
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    tenantId,
                    idsCategorias.get(producto.categoria),
                    producto.nombre,
                    producto.slug,
                    producto.descripcion,
                    producto.precio,
                    producto.precio_anterior ?? null,
                    producto.stock,
                    producto.destacado === true,
                    producto.novedad === true,
                    orden++
                ]
            );
        }

        ok(`${PRODUCTOS.length} productos de ejemplo creados`);


        // ---------------------------------------------
        // CONTENIDO
        // ---------------------------------------------

        let ordenFaq = 0;

        for (const item of FAQ) {
            await cliente.query(
                `INSERT INTO faq (tenant_id, pregunta, respuesta, orden)
                 VALUES ($1, $2, $3, $4)`,
                [tenantId, item.pregunta, item.respuesta, ordenFaq++]
            );
        }

        for (const pagina of PAGINAS) {
            await cliente.query(
                `INSERT INTO paginas_contenido
                     (tenant_id, clave, titulo, subtitulo, contenido)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tenantId, pagina.clave, pagina.titulo,
                 pagina.subtitulo, pagina.contenido]
            );
        }

        for (const galeria of GALERIAS) {
            await cliente.query(
                `INSERT INTO galerias (tenant_id, nombre, slug, descripcion, orden)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tenantId, galeria.nombre, galeria.slug,
                 galeria.descripcion, galeria.orden]
            );
        }

        ok(`${FAQ.length} preguntas frecuentes, ${PAGINAS.length} páginas y ${GALERIAS.length} galería`);
    });


    // -------------------------------------------------
    // CREDENCIALES
    // -------------------------------------------------

    linea();
    linea("  ─────────────────────────────────────────────");
    linea("   ACCESO AL PANEL");
    linea("  ─────────────────────────────────────────────");
    linea(`   Email:      ${credenciales.email}`);
    linea(`   Contraseña: ${credenciales.password}`);
    linea("  ─────────────────────────────────────────────");

    if (credenciales.generada) {
        linea();
        linea("   Esta contraseña se generó al azar y no se guarda en");
        linea("   ningún lado. Copiala ahora y cambiala al entrar.");
    }
}


// -----------------------------------------------------
// ENTRADA
// -----------------------------------------------------

if (require.main === module) {

    linea();
    linea("Cargando datos iniciales");
    linea();

    sembrar()
        .then(() => { linea(); })
        .catch((falla) => {

            const conocidos = {
                "28P01": "Usuario o contraseña incorrectos en DATABASE_URL",
                "3D000": "La base de datos no existe. Ejecutá primero: npm run migrate",
                "42P01": "Faltan tablas. Ejecutá primero: npm run migrate",
                ECONNREFUSED: "No hay ningún PostgreSQL escuchando en la dirección de DATABASE_URL"
            };

            error(conocidos[falla.code] || falla.message);
            linea();
            process.exit(1);
        })
        .finally(() => pool.end());
}


module.exports = sembrar;
