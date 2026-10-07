-- ==============================================================================
-- MIGRAÇÃO: campo BLOCO na tabela rotas
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez.
-- Não apaga nem altera registros existentes: rotas antigas ficam com bloco NULL.
-- ==============================================================================
ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS bloco TEXT;

CREATE INDEX IF NOT EXISTS idx_rotas_bloco ON public.rotas(bloco);

-- Atualiza o cache de schema do PostgREST para a API enxergar a nova coluna
NOTIFY pgrst, 'reload schema';
