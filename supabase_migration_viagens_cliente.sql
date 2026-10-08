-- ==============================================================================
-- MIGRAÇÃO: CLIENTE CADASTRADO na tabela viagens (relacionamento com public.clientes)
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez.
-- Não apaga nem altera registros existentes: viagens antigas ficam com cliente_id NULL
-- e mantêm o texto original na coluna "cliente".
-- Pré-requisito: tabela public.clientes já existente.
-- ==============================================================================
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);

CREATE INDEX IF NOT EXISTS idx_viagens_cliente_id ON public.viagens(cliente_id);

-- Atualiza o cache de schema do PostgREST para a API enxergar a nova coluna
NOTIFY pgrst, 'reload schema';
