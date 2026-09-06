// =====================================================
// FORMATO UNICO DE RESPUESTA DE LA API
//
//   Exito:  { ok: true,  data: ... }
//   Error:  { ok: false, error: "mensaje", detalles?: ... }
//
// Ninguna ruta debe hacer res.json() directamente.
// =====================================================

function exito(res, data = null, estado = 200) {
    return res.status(estado).json({ ok: true, data });
}


function creado(res, data = null) {
    return exito(res, data, 201);
}


// Listados paginados: los metadatos van al lado de data, nunca dentro.
function listado(res, items, meta = null) {
    const cuerpo = { ok: true, data: items };
    if (meta) cuerpo.meta = meta;
    return res.status(200).json(cuerpo);
}


function fallo(res, mensaje, estado = 400, detalles = null) {
    const cuerpo = { ok: false, error: mensaje };
    if (detalles) cuerpo.detalles = detalles;
    return res.status(estado).json(cuerpo);
}


module.exports = { exito, creado, listado, fallo };
