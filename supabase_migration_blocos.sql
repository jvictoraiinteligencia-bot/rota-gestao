-- ==============================================================================
-- MIGRAÇÃO: cadastro de BLOCOS (public.blocos) e vínculo das rotas (rotas.bloco_id)
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez.
-- Não insere nenhum bloco: os blocos reais são cadastrados pelo usuário na tela "Blocos".
-- Não apaga nem altera rotas existentes: a coluna texto rotas.bloco é mantida e as
-- rotas antigas ficam com bloco_id NULL (exibindo o texto antigo) até serem vinculadas.
-- Pré-requisitos: supabase_migration_rotas_bloco.sql e supabase_migration_rotas_cliente.sql.
-- ==============================================================================

-- Nome padronizado do bloco: sem acentos, sem espaços extras e em maiúsculas
-- ("SECOS", "Secos" e " secos " resultam em "SECOS").
-- IMMUTABLE e sem a extensão unaccent para poder ser usada em índice.
CREATE OR REPLACE FUNCTION public.normalizar_nome_bloco(nome TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT upper(btrim(regexp_replace(
    translate(
      coalesce(nome, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
    ),
    '\s+', ' ', 'g'
  )))
$$;

CREATE TABLE IF NOT EXISTS public.blocos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT,
    nome TEXT NOT NULL CHECK (btrim(nome) <> ''),
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocos_nome ON public.blocos(nome);
CREATE INDEX IF NOT EXISTS idx_blocos_status ON public.blocos(status);

-- Não permite dois blocos ATIVOS com o mesmo nome padronizado
CREATE UNIQUE INDEX IF NOT EXISTS uq_blocos_nome_ativo
    ON public.blocos (public.normalizar_nome_bloco(nome))
    WHERE status = 'Ativo';

CREATE OR REPLACE FUNCTION public.blocos_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blocos_updated_at ON public.blocos;
CREATE TRIGGER trg_blocos_updated_at
    BEFORE UPDATE ON public.blocos
    FOR EACH ROW EXECUTE FUNCTION public.blocos_set_updated_at();

-- Vínculo da rota com o bloco cadastrado. Blocos não são excluídos fisicamente (apenas inativados).
-- Com rotas.cliente_id + rotas.bloco_id, a cadeia CLIENTE -> BLOCO -> ROTA -> TIPO DE VEÍCULO -> TABELA DE FRETE
-- (tabela_fretes.rota_id + tabela_fretes.tipo_carro_id) fica disponível para uso futuro.
ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS bloco_id UUID REFERENCES public.blocos(id);
CREATE INDEX IF NOT EXISTS idx_rotas_bloco_id ON public.rotas(bloco_id);

ALTER TABLE public.blocos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_blocos" ON public.blocos;
CREATE POLICY "allow_all_blocos" ON public.blocos FOR ALL TO public USING (true) WITH CHECK (true);

-- Atualiza o cache de schema do PostgREST para a API enxergar a nova tabela/coluna
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- OPCIONAL: vincular rotas antigas aos blocos cadastrados
-- Execute somente DEPOIS de cadastrar os blocos reais na tela "Blocos".
-- Preenche bloco_id apenas de rotas ainda sem vínculo cujo texto antigo corresponde
-- a um bloco ATIVO de mesmo nome padronizado. Não altera o texto da coluna bloco.
-- ==============================================================================
-- UPDATE public.rotas r
--    SET bloco_id = b.id
--   FROM public.blocos b
--  WHERE r.bloco_id IS NULL
--    AND b.status = 'Ativo'
--    AND public.normalizar_nome_bloco(r.bloco) = public.normalizar_nome_bloco(b.nome);
