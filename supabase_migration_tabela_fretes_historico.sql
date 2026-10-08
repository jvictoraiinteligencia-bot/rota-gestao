-- ==============================================================================
-- MIGRAÇÃO: HISTÓRICO DE REAJUSTES DA TABELA DE FRETES (public.tabela_fretes_historico)
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez.
-- Não altera nem apaga registros existentes de tabela_fretes, rotas, clientes, blocos ou tipos_carro.
-- Não grava KM: o R$/KM do histórico é calculado com rotas.distancia_km da rota registrada.
-- Pré-requisitos: supabase_migration_rotas_cliente.sql e supabase_migration_blocos.sql.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tabela_fretes_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela_frete_id UUID NOT NULL REFERENCES public.tabela_fretes(id) ON DELETE CASCADE,
    valor_anterior NUMERIC(12, 2) NOT NULL,
    valor_novo NUMERIC(12, 2) NOT NULL,
    alterado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- O sistema ainda não tem login; fica NULL até existir identificação do usuário.
    alterado_por TEXT,
    motivo TEXT,
    -- Contexto da tarifa no momento da alteração (ids + nomes, para não depender de renomeações)
    rota_id UUID REFERENCES public.rotas(id) ON DELETE SET NULL,
    rota_nome TEXT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT,
    bloco_id UUID REFERENCES public.blocos(id) ON DELETE SET NULL,
    bloco_nome TEXT,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE SET NULL,
    tipo_carro_nome TEXT
);

CREATE INDEX IF NOT EXISTS idx_tabela_fretes_historico_tarifa
    ON public.tabela_fretes_historico (tabela_frete_id, alterado_em DESC);

ALTER TABLE public.tabela_fretes_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_tabela_fretes_historico" ON public.tabela_fretes_historico;
CREATE POLICY "allow_all_tabela_fretes_historico" ON public.tabela_fretes_historico
    FOR ALL TO public USING (true) WITH CHECK (true);

-- Altera o valor do frete e registra o histórico na MESMA transação:
-- o valor anterior nunca é perdido sem a respectiva linha de histórico.
-- Retorna a linha de histórico criada, ou NULL se o valor não mudou.
CREATE OR REPLACE FUNCTION public.reajustar_valor_tarifa_frete(
    p_tabela_frete_id UUID,
    p_valor_novo NUMERIC,
    p_motivo TEXT DEFAULT NULL,
    p_alterado_por TEXT DEFAULT NULL
)
RETURNS public.tabela_fretes_historico
LANGUAGE plpgsql
AS $$
DECLARE
    v_tarifa public.tabela_fretes%ROWTYPE;
    v_historico public.tabela_fretes_historico%ROWTYPE;
BEGIN
    IF p_valor_novo IS NULL OR p_valor_novo <= 0 THEN
        RAISE EXCEPTION 'Valor do frete inválido.';
    END IF;

    SELECT * INTO v_tarifa
      FROM public.tabela_fretes
     WHERE id = p_tabela_frete_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tarifa % não encontrada.', p_tabela_frete_id;
    END IF;

    IF v_tarifa.valor_frete = p_valor_novo THEN
        RETURN NULL;
    END IF;

    UPDATE public.tabela_fretes
       SET valor_frete = p_valor_novo
     WHERE id = p_tabela_frete_id;

    INSERT INTO public.tabela_fretes_historico (
        tabela_frete_id, valor_anterior, valor_novo, alterado_por, motivo,
        rota_id, rota_nome, cliente_id, cliente_nome, bloco_id, bloco_nome,
        tipo_carro_id, tipo_carro_nome
    )
    SELECT
        v_tarifa.id, v_tarifa.valor_frete, p_valor_novo,
        NULLIF(btrim(p_alterado_por), ''), NULLIF(btrim(p_motivo), ''),
        r.id, r.nome, r.cliente_id, c.nome, r.bloco_id, COALESCE(b.nome, r.bloco),
        t.id, t.nome
      FROM (SELECT 1) AS base
      LEFT JOIN public.rotas r ON r.id = v_tarifa.rota_id
      LEFT JOIN public.clientes c ON c.id = r.cliente_id
      LEFT JOIN public.blocos b ON b.id = r.bloco_id
      LEFT JOIN public.tipos_carro t ON t.id = v_tarifa.tipo_carro_id
    RETURNING * INTO v_historico;

    RETURN v_historico;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reajustar_valor_tarifa_frete(UUID, NUMERIC, TEXT, TEXT) TO anon, authenticated;

-- Atualiza o cache de schema do PostgREST para a API enxergar a nova tabela/função
NOTIFY pgrst, 'reload schema';
