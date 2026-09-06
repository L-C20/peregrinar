-- =====================================================
-- 001 · BASE
--
-- Funciones auxiliares que usan todas las migraciones
-- siguientes. No crea ninguna tabla.
--
-- Las claves primarias son UUID generadas con
-- gen_random_uuid(), que es parte del nucleo de
-- PostgreSQL desde la version 13: no hace falta
-- instalar ninguna extension.
-- =====================================================


-- -----------------------------------------------------
-- VERSION MINIMA
--
-- 007_ventas.sql usa ON DELETE SET NULL sobre una columna
-- concreta de una clave foranea compuesta, que existe desde
-- PostgreSQL 15. Se verifica aca para fallar con un mensaje
-- claro y no con un error de sintaxis tres migraciones
-- despues.
-- -----------------------------------------------------

DO $$
BEGIN
    IF current_setting('server_version_num')::int < 150000 THEN
        RAISE EXCEPTION
            'Esta plataforma necesita PostgreSQL 15 o superior. Versión detectada: %',
            current_setting('server_version');
    END IF;
END
$$;


-- -----------------------------------------------------
-- MANTENER updated_at AL DIA
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION establecer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------
-- ATAJO PARA ENGANCHAR EL TRIGGER A UNA TABLA
--
-- Uso:  SELECT agregar_updated_at('productos');
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION agregar_updated_at(tabla TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'CREATE TRIGGER trg_%1$s_updated_at
             BEFORE UPDATE ON %1$I
             FOR EACH ROW
             EXECUTE FUNCTION establecer_updated_at()',
        tabla
    );
END;
$$ LANGUAGE plpgsql;
