// =====================================================
// REPOSITORIO DE ARCHIVOS
//
// Registro de todo lo que se sube desde el panel. Las
// tablas de negocio guardan la clave en su propia columna;
// esta tabla sirve para saber quien subio que, y para poder
// limpiar o migrar archivos sabiendo exactamente que hay.
// =====================================================

const { consulta, fila, filas } = require("./base");


async function registrar(tenantId, {
    clave,
    driver,
    nombreOriginal = null,
    mime = null,
    tamano = null,
    entidad = null,
    entidadId = null,
    usuarioId = null
}) {

    return fila(tenantId,
        `INSERT INTO archivos
             (tenant_id, clave, driver, nombre_original,
              mime, tamano, entidad, entidad_id, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tenant_id, clave) DO NOTHING
         RETURNING id, clave, created_at`,
        [clave, driver, nombreOriginal, mime, tamano,
         entidad, entidadId, usuarioId]
    );
}


async function porClave(tenantId, clave) {
    return fila(tenantId,
        `SELECT * FROM archivos WHERE tenant_id = $1 AND clave = $2`,
        [clave]
    );
}


async function porEntidad(tenantId, entidad, entidadId) {
    return filas(tenantId,
        `SELECT * FROM archivos
         WHERE tenant_id = $1 AND entidad = $2 AND entidad_id = $3
         ORDER BY created_at`,
        [entidad, entidadId]
    );
}


// Borra el registro. El archivo en si lo elimina storage:
// son dos pasos distintos a proposito, porque pueden fallar
// por separado.
async function eliminarRegistro(tenantId, clave) {
    const resultado = await consulta(tenantId,
        `DELETE FROM archivos WHERE tenant_id = $1 AND clave = $2`,
        [clave]
    );
    return resultado.rowCount > 0;
}


module.exports = { registrar, porClave, porEntidad, eliminarRegistro };
