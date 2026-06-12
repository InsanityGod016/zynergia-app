import { createClient } from '@supabase/supabase-js';

// Fallbacks hardcodeados: la anon key es pública por diseño (viaja en todo
// bundle web). Sin esto, los builds de Codemagic (que no tienen .env porque
// está en .gitignore) compilan con undefined y createClient() lanza al
// importar el módulo → bundle muerto → app congelada al arrancar (rechazo
// Apple "app frozen upon launch").
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://sbezuysumqlwqnvrhckg.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZXp1eXN1bXFsd3FudnJoY2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTczMzcsImV4cCI6MjA4ODMzMzMzN30.CBd4uUGYzoP_Tbkorah1__KEx20D_6oMfXlcf3dRGEE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
