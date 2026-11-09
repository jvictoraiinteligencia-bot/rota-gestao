-- ==============================================================================
-- MIGRAÇÃO: FINANCIAMENTO DE VEÍCULOS
--   public.financiamentos            -> contrato (credor, valor, parcelas)
--   public.financiamento_veiculos    -> placas vinculadas, com vigência (histórico)
--   public.financiamento_parcelas    -> parcelas mensais (competência, valor, pagamento)
--   public.financiamento_auditoria   -> registro de toda inclusão/alteração (sem acesso pela anon key)
--   public.gerar_parcelas_financiamento(uuid) -> gera as parcelas a partir do contrato
--
-- Regra de rateio (calculada na aplicação, não gravada):
--   Para cada parcela de competência M, consideram-se as placas cujo vínculo cobre M;
--   o KM de cada placa é a soma de viagens.km_rodado dentro de M e do período do vínculo.
--   KM total > 0  -> rateio proporcional ao KM (inclusive contrato de uma única placa).
--   KM total = 0  -> parcela integralmente "não rateada".
--
-- ACESSO: o sistema não possui login. As novas tabelas são acessadas pela anon key
--   (papéis anon e authenticated) com SELECT, INSERT e UPDATE. Não há DELETE:
--   cancelamentos são feitos por status / data_fim. RISCO: quem tiver a anon key
--   (pública, presente no navegador) pode ler e alterar estes dados pela API.
--
-- SEGURANÇA DA EXECUÇÃO:
--   - Não altera, exclui ou atualiza registros nem estruturas das tabelas existentes.
--   - Executa em uma única transação: se qualquer passo falhar, nada é aplicado.
--   - Aborta se algum objeto de financiamento já existir (executar uma única vez).
-- Execute no SQL Editor do Supabase após backup.
-- ==============================================================================

BEGIN;

-- Não espera indefinidamente por bloqueios (ex.: na criação da FK para veiculos)
SET LOCAL lock_timeout = '5s';

-- ==============================================================================
-- 0. PRÉ-CHECAGEM
-- ==============================================================================
DO $$
BEGIN
    IF to_regclass('public.veiculos') IS NULL THEN
        RAISE EXCEPTION 'Tabela public.veiculos não encontrada. Nada foi alterado.';
    END IF;

    IF to_regclass('public.financiamentos') IS NOT NULL
       OR to_regclass('public.financiamento_veiculos') IS NOT NULL
       OR to_regclass('public.financiamento_parcelas') IS NOT NULL
       OR to_regclass('public.financiamento_auditoria') IS NOT NULL
       OR to_regprocedure('public.financiamento_set_updated_at()') IS NOT NULL
       OR to_regprocedure('public.financiamento_registrar_auditoria()') IS NOT NULL
       OR to_regprocedure('public.gerar_parcelas_financiamento(uuid)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'Migração abortada: já existem objetos de financiamento no banco. Nada foi alterado.';
    END IF;
END $$;

-- Necessária para impedir vínculos sobrepostos da mesma placa no mesmo contrato
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ==============================================================================
-- 1. FUNÇÃO: updated_at
-- ==============================================================================
CREATE FUNCTION public.financiamento_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 2. TABELA: financiamentos
-- ==============================================================================
CREATE TABLE public.financiamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credor TEXT NOT NULL CHECK (btrim(credor) <> ''),
    numero_contrato TEXT,
    descricao TEXT,
    valor_financiado NUMERIC(14, 2) CHECK (valor_financiado IS NULL OR valor_financiado >= 0),
    valor_parcela NUMERIC(12, 2) NOT NULL CHECK (valor_parcela > 0),
    quantidade_parcelas INTEGER NOT NULL CHECK (quantidade_parcelas BETWEEN 1 AND 360),
    data_primeira_parcela DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Quitado', 'Cancelado')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_financiamentos_credor_contrato
    ON public.financiamentos (upper(btrim(credor)), upper(btrim(numero_contrato)))
    WHERE numero_contrato IS NOT NULL AND btrim(numero_contrato) <> '';

CREATE INDEX idx_financiamentos_status ON public.financiamentos(status);

CREATE TRIGGER trg_financiamentos_updated_at
    BEFORE UPDATE ON public.financiamentos
    FOR EACH ROW EXECUTE FUNCTION public.financiamento_set_updated_at();

-- ==============================================================================
-- 3. TABELA: financiamento_veiculos (uma ou várias placas, com vigência)
-- Para desvincular uma placa, preencha data_fim; o histórico do rateio é preservado.
-- ==============================================================================
CREATE TABLE public.financiamento_veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financiamento_id UUID NOT NULL REFERENCES public.financiamentos(id) ON DELETE RESTRICT,
    -- RESTRICT: impede excluir um veículo que possui vínculo com contrato
    veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
    data_inicio DATE NOT NULL,
    data_fim DATE, -- NULL = vínculo vigente
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_financiamento_veiculo_periodo
        CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    -- A mesma placa não pode ter dois vínculos com períodos sobrepostos no mesmo contrato
    CONSTRAINT ex_financiamento_veiculo_sobreposto EXCLUDE USING gist (
        financiamento_id WITH =,
        veiculo_id WITH =,
        daterange(data_inicio, data_fim, '[]') WITH &&
    )
);

CREATE INDEX idx_financiamento_veiculos_financiamento_id
    ON public.financiamento_veiculos(financiamento_id);
CREATE INDEX idx_financiamento_veiculos_veiculo_id
    ON public.financiamento_veiculos(veiculo_id);

CREATE TRIGGER trg_financiamento_veiculos_updated_at
    BEFORE UPDATE ON public.financiamento_veiculos
    FOR EACH ROW EXECUTE FUNCTION public.financiamento_set_updated_at();

-- ==============================================================================
-- 4. TABELA: financiamento_parcelas
-- competencia = 1º dia do mês ao qual a parcela é atribuída no rateio
-- ==============================================================================
CREATE TABLE public.financiamento_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financiamento_id UUID NOT NULL REFERENCES public.financiamentos(id) ON DELETE RESTRICT,
    numero INTEGER NOT NULL CHECK (numero > 0),
    competencia DATE NOT NULL CHECK (EXTRACT(DAY FROM competencia) = 1),
    vencimento DATE NOT NULL,
    valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
    status TEXT NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Paga', 'Cancelada')),
    data_pagamento DATE,
    valor_pago NUMERIC(12, 2) CHECK (valor_pago IS NULL OR valor_pago >= 0),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_financiamento_parcela_numero UNIQUE (financiamento_id, numero),
    CONSTRAINT ck_parcela_paga_com_data CHECK (status <> 'Paga' OR data_pagamento IS NOT NULL)
);

CREATE INDEX idx_financiamento_parcelas_competencia
    ON public.financiamento_parcelas(competencia);
CREATE INDEX idx_financiamento_parcelas_financiamento_id
    ON public.financiamento_parcelas(financiamento_id);

-- ==============================================================================
-- 5. AUDITORIA (gravada por gatilho; sem acesso pela anon key)
-- ==============================================================================
CREATE TABLE public.financiamento_auditoria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tabela TEXT NOT NULL,
    operacao TEXT NOT NULL,
    registro_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    papel TEXT, -- papel da requisição (ex.: anon); o sistema não identifica usuários
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financiamento_auditoria_registro
    ON public.financiamento_auditoria(tabela, registro_id, registrado_em DESC);

-- SECURITY DEFINER: grava na auditoria mesmo sem a anon key ter permissão nela
CREATE FUNCTION public.financiamento_registrar_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.financiamento_auditoria
      (tabela, operacao, registro_id, dados_anteriores, dados_novos, papel)
  VALUES (
      TG_TABLE_NAME,
      TG_OP,
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
      COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', session_user)
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_financiamentos_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON public.financiamentos
    FOR EACH ROW EXECUTE FUNCTION public.financiamento_registrar_auditoria();

CREATE TRIGGER trg_financiamento_veiculos_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON public.financiamento_veiculos
    FOR EACH ROW EXECUTE FUNCTION public.financiamento_registrar_auditoria();

CREATE TRIGGER trg_financiamento_parcelas_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON public.financiamento_parcelas
    FOR EACH ROW EXECUTE FUNCTION public.financiamento_registrar_auditoria();

-- ==============================================================================
-- 6. FUNÇÃO: gerar parcelas do contrato (somente se ainda não houver nenhuma)
-- Mantém o dia da 1ª parcela; nos meses sem esse dia (29, 30, 31) usa o último
-- dia do próprio mês, sem avançar para o mês seguinte.
-- Ex.: 1ª em 31/01 -> 28/02 (29/02 em ano bissexto), 31/03, 30/04, 31/05...
-- SECURITY INVOKER (padrão): respeita as permissões e o RLS de quem chama.
-- ==============================================================================
CREATE FUNCTION public.gerar_parcelas_financiamento(p_financiamento_id UUID)
RETURNS SETOF public.financiamento_parcelas
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_contrato public.financiamentos%ROWTYPE;
    v_dia INTEGER;
    v_mes_base DATE;
BEGIN
    SELECT * INTO v_contrato FROM public.financiamentos WHERE id = p_financiamento_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Financiamento % não encontrado.', p_financiamento_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.financiamento_parcelas WHERE financiamento_id = p_financiamento_id) THEN
        RAISE EXCEPTION 'As parcelas deste financiamento já foram geradas.';
    END IF;

    v_dia := EXTRACT(DAY FROM v_contrato.data_primeira_parcela)::INTEGER;
    v_mes_base := v_contrato.data_primeira_parcela - (v_dia - 1); -- 1º dia do mês da 1ª parcela

    RETURN QUERY
    INSERT INTO public.financiamento_parcelas (financiamento_id, numero, competencia, vencimento, valor)
    SELECT
        v_contrato.id,
        mes.n,
        mes.inicio,
        LEAST(mes.inicio + (v_dia - 1), mes.ultimo_dia),
        v_contrato.valor_parcela
      FROM (
          SELECT
              s.n,
              (v_mes_base + make_interval(months => s.n - 1))::DATE AS inicio,
              (v_mes_base + make_interval(months => s.n) - INTERVAL '1 day')::DATE AS ultimo_dia
            FROM generate_series(1, v_contrato.quantidade_parcelas) AS s(n)
      ) AS mes
    RETURNING *;
END;
$$;

-- ==============================================================================
-- 7. PERMISSÕES
-- Anon key: ler, incluir e editar. Sem exclusão. Auditoria inacessível.
-- ==============================================================================
REVOKE ALL ON TABLE public.financiamentos         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.financiamento_veiculos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.financiamento_parcelas FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.financiamento_auditoria FROM PUBLIC, anon, authenticated;
-- O Supabase concede acesso a novas sequências para anon/authenticated por padrão
REVOKE ALL ON SEQUENCE public.financiamento_auditoria_id_seq FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.financiamentos         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financiamento_veiculos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financiamento_parcelas TO anon, authenticated;

REVOKE ALL ON FUNCTION public.gerar_parcelas_financiamento(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_parcelas_financiamento(UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.financiamento_set_updated_at()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.financiamento_registrar_auditoria() FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 8. RLS: políticas por operação (sem política de DELETE)
-- ==============================================================================
ALTER TABLE public.financiamentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financiamento_veiculos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financiamento_parcelas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financiamento_auditoria ENABLE ROW LEVEL SECURITY; -- sem políticas = sem acesso via API

CREATE POLICY financiamentos_select ON public.financiamentos
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY financiamentos_insert ON public.financiamentos
    FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY financiamentos_update ON public.financiamentos
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY financiamento_veiculos_select ON public.financiamento_veiculos
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY financiamento_veiculos_insert ON public.financiamento_veiculos
    FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY financiamento_veiculos_update ON public.financiamento_veiculos
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY financiamento_parcelas_select ON public.financiamento_parcelas
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY financiamento_parcelas_insert ON public.financiamento_parcelas
    FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY financiamento_parcelas_update ON public.financiamento_parcelas
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. REALTIME (apenas as 3 tabelas novas; a auditoria não é publicada)
-- ==============================================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.financiamentos;
    EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.financiamento_veiculos;
    EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.financiamento_parcelas;
    EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
    END;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
