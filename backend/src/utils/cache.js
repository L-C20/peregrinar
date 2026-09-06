// =====================================================
// CACHE EN MEMORIA CON VENCIMIENTO
//
// Para datos que cambian poco y se consultan en CADA
// peticion: a que tenant corresponde un dominio, que
// modulos tiene activos una tienda.
//
// Es por proceso: si mañana corren varias instancias, cada
// una tiene la suya. Por eso el vencimiento es corto y
// ademas hay invalidacion explicita (olvidar / limpiar)
// para cuando el panel cambia esos datos.
//
// No se cachean datos de negocio (productos, pedidos):
// esos tienen que verse actualizados al instante.
// =====================================================

class Cache {

    constructor(ttlMs = 60000, nombre = "cache") {
        this.ttl = ttlMs;
        this.nombre = nombre;
        this.entradas = new Map();
    }


    // Devuelve { valor } si hay algo vigente, o undefined si no.
    // El envoltorio permite cachear tambien el valor null
    // (por ejemplo: "este dominio no corresponde a ninguna tienda").
    obtener(clave) {

        const entrada = this.entradas.get(clave);

        if (!entrada) return undefined;

        if (Date.now() > entrada.vence) {
            this.entradas.delete(clave);
            return undefined;
        }

        return { valor: entrada.valor };
    }


    guardar(clave, valor) {
        this.entradas.set(clave, {
            valor,
            vence: Date.now() + this.ttl
        });
        return valor;
    }


    olvidar(clave) {
        this.entradas.delete(clave);
    }


    limpiar() {
        this.entradas.clear();
    }


    // Atajo: busca en cache y, si no esta, ejecuta la consulta
    // y guarda el resultado.
    async recordar(clave, obtenerValor) {

        const enCache = this.obtener(clave);

        if (enCache) return enCache.valor;

        return this.guardar(clave, await obtenerValor());
    }

}


module.exports = Cache;
