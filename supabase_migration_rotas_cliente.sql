-- ==============================================================================
-- MIGRAÇÃO: CLIENTE na tabela rotas (relacionamento com public.clientes)
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez.
-- Não apaga nem altera registros existentes: rotas antigas ficam com cliente_id NULL.
-- Pré-requisito: supabase_migration_rotas_bloco.sql já executado.
-- ==============================================================================
ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);

CREATE INDEX IF NOT EXISTS idx_rotas_cliente_id ON public.rotas(cliente_id);

-- Atualiza o cache de schema do PostgREST para a API enxergar a nova coluna
NOTIFY pgrst, 'reload schema';
