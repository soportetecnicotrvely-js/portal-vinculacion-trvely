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

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
