/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * supabase.js v1.0
 * Inicializa el cliente de Supabase y lo deja disponible
 * como window.supabaseClient para el resto de los scripts.
 * =====================================================
 */

const SUPABASE_URL = "https://psiiydjszabextmvjfzd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaWl5ZGpzemFiZXh0bXZqZnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTkxMzEsImV4cCI6MjA5OTYzNTEzMX0.FTOXxAqxNsf0alSwY1tA-mjhM3bb4PVHiS8ExT2ZC8o";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
