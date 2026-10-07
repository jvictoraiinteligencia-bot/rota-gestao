import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Keys for environment variables or manual project configuration
const ENV_SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const ENV_SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const STORAGE_KEYS = {
  CUSTOM_URL: 'rotagestao_supabase_url',
  CUSTOM_ANON_KEY: 'rotagestao_supabase_anon_key',
};

// Retrieve credentials (preferring env vars, then user-configured project credentials)
export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = ENV_SUPABASE_URL;
  let anonKey = ENV_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    try {
      const storedUrl = localStorage.getItem(STORAGE_KEYS.CUSTOM_URL);
      const storedKey = localStorage.getItem(STORAGE_KEYS.CUSTOM_ANON_KEY);
      if (storedUrl && storedKey) {
        url = storedUrl;
        anonKey = storedKey;
      }
    } catch {
      // ignore
    }
  }

  const isConfigured = Boolean(url && anonKey && url.startsWith('http'));
  return { url, anonKey, isConfigured };
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_URL, url.trim());
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ANON_KEY, anonKey.trim());
    // Force recreate client
    cachedClient = null;
  } catch (err) {
    console.error('Failed to save Supabase credentials:', err);
  }
}

export function clearCustomSupabaseCredentials() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_URL);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_ANON_KEY);
    cachedClient = null;
  } catch (err) {
    console.error('Failed to clear Supabase credentials:', err);
  }
}

let cachedClient: SupabaseClient | null = null;

// Initialize Supabase Client
export function getSupabase(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return cachedClient;
}

// Test connectivity to Supabase
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const testUrl = url || getSupabaseCredentials().url;
    const testKey = anonKey || getSupabaseCredentials().anonKey;

    if (!testUrl || !testKey) {
      return { success: false, message: 'URL e Anon Key do Supabase são obrigatórios.' };
    }

    const client = createClient(testUrl, testKey);
    // Simple ping to test connection
    const { error } = await client.from('filiais').select('count', { count: 'exact', head: true });

    if (error) {
      // If table doesn't exist yet, but authentication is valid, error code 42P01 means Postgres schema needs creation
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Conectado com sucesso ao Supabase! (As tabelas precisam ser criadas pelo Script SQL no editor do Supabase).',
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message} (${error.code || ''})` };
    }

    return { success: true, message: 'Conexão com o Supabase PostgreSQL realizada com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err.message || err}` };
  }
}
