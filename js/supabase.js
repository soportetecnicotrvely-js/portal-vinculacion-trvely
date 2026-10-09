/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * supabase.js v1.0
 * Inicializa el cliente de Supabase y lo deja disponible
 * como window.supabaseClient para el resto de los scripts.
 * =====================================================
 */

const SUPABASE_URL = "https://psiiydjszabextmvjfzd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SwlxgrWrwWAR99DuGpoOBg_Ugq9QuyM";

/*
| Sesiones separadas:
| - El panel de administración guarda su sesión con su propia llave.
| - El formulario público (y la corrección de documentos) NUNCA guardan
|   ni leen una sesión, así siempre actúan como visitante (rol "anon")
|   aunque el administrador haya iniciado sesión en el mismo navegador.
*/
const ES_PANEL_ADMIN = /\/admin(\.html)?\/?$/.test(window.location.pathname);

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: ES_PANEL_ADMIN
            ? {
                persistSession: true,
                autoRefreshToken: true,
                storageKey: "trvely-admin-auth"
            }
            : {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
    }
);
