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

const config = require("../config/env");
const { pool, transaccion } = require("./connection");
const { crearTenant } = require("../services/tenants");
const { crearUsuario } = require("../services/usuarios");


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


    let credenciales;

    await transaccion(async (cliente) => {

        // ---------------------------------------------
        // TIENDA
        //
        // La crea el mismo servicio que usa crear-tenant:
        // dominios, modulos, las tres tablas de configuracion
        // y los medios de pago. Asi la tienda numero 12 nace
        // exactamente igual que esta.
        // ---------------------------------------------

        const tenant = await crearTenant(cliente, {
            nombre: TENANT.nombre,
            slug: TENANT.slug,
            plan: TENANT.plan,
            // En desarrollo la tienda se sirve desde localhost.
            // El dominio real se agrega cuando exista.
            dominios: ["localhost"],
            apariencia: APARIENCIA,
            sitio: SITIO
        });

        const tenantId = tenant.id;

        ok(`Tienda "${TENANT.nombre}" creada con su configuración`);


        // ---------------------------------------------
        // ADMINISTRADOR
        //
        // La contraseña sale de SEED_ADMIN_PASSWORD; si no
        // esta definida se genera al azar y se muestra una
        // sola vez al final.
        // ---------------------------------------------

        credenciales = await crearUsuario({
            cliente,
            tenantId,
            nombre: "Administrador",
            email: process.env.SEED_ADMIN_EMAIL || "admin@editorialperegrinar.com",
            rol: "admin",
            password: process.env.SEED_ADMIN_PASSWORD || null
        });

        ok(`Administrador ${credenciales.usuario.email} creado`);


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
    linea(`   Email:      ${credenciales.usuario.email}`);
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
