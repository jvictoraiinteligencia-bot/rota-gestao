import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Radio,
  Play,
  Check,
  ArrowRight,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../../lib/supabase';
import {
  runSupabaseVerificationTests,
  VerificationTestResult,
} from '../../services/supabaseService';
import { useTransport } from '../../context/TransportContext';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FULL_SQL_SCRIPT = `-- ==============================================================================
-- RotaGestão - Schema Oficial PostgreSQL para Supabase
-- Sistema de Gestão Financeira e Operacional de Transportadora
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. filiais
CREATE TABLE IF NOT EXISTS public.filiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    codigo TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Inativa')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. tipos_carro
CREATE TABLE IF NOT EXISTS public.tipos_carro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    categoria TEXT NOT NULL,
    descricao TEXT,
    capacidade_carga TEXT,
    quantidade_eixos INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. veiculos
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa TEXT NOT NULL UNIQUE,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE SET NULL,
    marca TEXT,
    modelo TEXT,
    ano INTEGER NOT NULL,
    proprietario TEXT NOT NULL,
    tipo_proprietario TEXT NOT NULL DEFAULT 'Proprio' CHECK (tipo_proprietario IN ('Proprio', 'Agregado', 'Terceiro')),
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. motoristas
CREATE TABLE IF NOT EXISTS public.motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cnh TEXT NOT NULL,
    categoria_cnh TEXT NOT NULL,
    validade_cnh DATE NOT NULL,
    tipo_motorista TEXT NOT NULL DEFAULT 'Funcionario' CHECK (tipo_motorista IN ('Funcionario', 'Agregado', 'Terceiro')),
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. rotas
CREATE TABLE IF NOT EXISTS public.rotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    distancia_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tipo_operacao TEXT NOT NULL DEFAULT 'Carga Fechada (FTL)',
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. tabela_fretes
CREATE TABLE IF NOT EXISTS public.tabela_fretes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_id UUID REFERENCES public.rotas(id) ON DELETE CASCADE,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE CASCADE,
    valor_frete NUMERIC(12, 2) NOT NULL,
    vigencia_inicial DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_final DATE,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. viagens
CREATE TABLE IF NOT EXISTS public.viagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    rota_id UUID REFERENCES public.rotas(id) ON DELETE SET NULL,
    tipo_carro_id UUID REFERENCES public.tipos_carro(id) ON DELETE SET NULL,
    cliente TEXT NOT NULL,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    valor_frete NUMERIC(12, 2) NOT NULL,
    km_rodado NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantidade_viagens INTEGER NOT NULL DEFAULT 1,
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. despesas
CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
    motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
    tipo_despesa TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    fornecedor TEXT NOT NULL,
    quilometragem NUMERIC(10, 2),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    categoria TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_filial_id ON public.veiculos(filial_id);
CREATE INDEX IF NOT EXISTS idx_motoristas_cpf ON public.motoristas(cpf);
CREATE INDEX IF NOT EXISTS idx_rotas_codigo ON public.rotas(codigo);
CREATE INDEX IF NOT EXISTS idx_tabela_fretes_comb ON public.tabela_fretes(rota_id, tipo_carro_id);
CREATE INDEX IF NOT EXISTS idx_viagens_data ON public.viagens(data);
CREATE INDEX IF NOT EXISTS idx_despesas_data ON public.despesas(data);

-- Row Level Security (RLS)
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_carro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_fretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_filiais" ON public.filiais FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tipos_carro" ON public.tipos_carro FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_veiculos" ON public.veiculos FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_motoristas" ON public.motoristas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rotas" ON public.rotas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tabela_fretes" ON public.tabela_fretes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_viagens" ON public.viagens FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_despesas" ON public.despesas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_clientes" ON public.clientes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fornecedores" ON public.fornecedores FOR ALL TO public USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.viagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.motoristas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tabela_fretes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rotas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.filiais;

-- Dados Iniciais
INSERT INTO public.filiais (nome, codigo, cidade, estado, status) VALUES
('Matriz São Paulo', 'FIL-01', 'São Paulo', 'SP', 'Ativa'),
('Filial Curitiba', 'FIL-02', 'Curitiba', 'PR', 'Ativa'),
('Filial Rio de Janeiro', 'FIL-03', 'Rio de Janeiro', 'RJ', 'Ativa'),
('Filial Itajaí', 'FIL-04', 'Itajaí', 'SC', 'Ativa')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.tipos_carro (nome, categoria, descricao, capacidade_carga, quantidade_eixos, status) VALUES
('VUC', 'Leve', 'Veículo Urbano de Carga para centros urbanos', '3,5 ton', 2, 'Ativo'),
('3/4', 'Médio', 'Caminhão leve ágil intermunicipal', '4,5 ton', 2, 'Ativo'),
('Toco', 'Semipesado', 'Caminhão semipesado 4x2', '6,0 ton', 2, 'Ativo'),
('Truck', 'Pesado', 'Caminhão rígido 6x2', '14,0 ton', 3, 'Ativo'),
('Bitruck', 'Pesado', 'Caminhão 8x2 com 4 eixos', '22,0 ton', 4, 'Ativo'),
('Carreta', 'Extrapesado', 'Cavalo mecânico com semirreboque 3 eixos LS', '32,0 ton', 6, 'Ativo'),
('Bitrem', 'Extrapesado', 'Conjunto articulado 7 eixos', '40,0 ton', 7, 'Ativo')
ON CONFLICT (nome) DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { reloadOnlineData, isOnlineConnected, setIsOnlineConnected } = useTransport();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Test suite execution
  const [runningTests, setRunningTests] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<VerificationTestResult[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setTestResult(null);
      setTestSuiteResults(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Preencha a URL e a Anon Key do Supabase.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      saveCustomSupabaseCredentials(url.trim(), anonKey.trim());
      setIsOnlineConnected(true);
      await reloadOnlineData();
    }
  };

  const handleRunVerificationSuite = async () => {
    setRunningTests(true);
    setTestSuiteResults(null);
    const results = await runSupabaseVerificationTests();
    setRunningTests(false);
    setTestSuiteResults(results);

    // If tests succeeded, reload the main app data
    const allPassed = results.every((r) => r.success);
    if (allPassed) {
      setIsOnlineConnected(true);
      await reloadOnlineData();
    }
  };

  const handleCopySqlScript = () => {
    navigator.clipboard.writeText(FULL_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleDisconnect = () => {
    if (window.confirm('Deseja desconectar as credenciais do Supabase?')) {
      clearCustomSupabaseCredentials();
      setUrl('');
      setAnonKey('');
      setIsOnlineConnected(false);
      setTestResult({ success: false, message: 'Credenciais removidas.' });
      setTestSuiteResults(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Configuração & Testes do Banco Supabase
                {isOnlineConnected && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Radio size={12} className="animate-pulse" />
                    CONECTADO
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Criar tabelas, chaves estrangeiras, RLS e executar testes de validação (SELECT / INSERT)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Diagnostic Box for Schema Cache Missing */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <Sparkles size={16} className="text-blue-600" />
              <span>Solução para o erro "Could not find table 'public.filiais' in schema cache":</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              O Supabase respondeu com sucesso à autenticação, mas a tabela <strong>filiais</strong> (e as demais tabelas relacionais) ainda não foram executadas no PostgreSQL do seu projeto.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopySqlScript}
                className="py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedSql ? 'SQL Completo Copiado!' : 'Copiar Script SQL Completo (Todas as 10 Tabelas)'}</span>
              </button>

              <a
                href={url ? `${url.replace('.co', '.co/project/_/sql/new')}` : 'https://supabase.com/dashboard'}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 text-xs font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Abrir SQL Editor no Supabase</span>
                <ExternalLink size={13} />
              </a>
            </div>
            <p className="text-[10px] text-slate-500">
              * Cole no <strong>SQL Editor</strong> do painel Supabase e clique em <strong>RUN</strong>. O script cria todas as 10 tabelas, índices, chaves estrangeiras, regras de RLS e dados iniciais.
            </p>
          </div>

          {/* Connection Inputs */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTestConnection();
            }}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs"
          >
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Credenciais de Acesso
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project URL (Supabase)
              </label>
              <input
                type="url"
                required
                placeholder="https://seu-projeto.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 font-mono focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project API Key (Anon / Publishable Key)
              </label>
              <input
                type="text"
                required
                placeholder="sb_publishable_... ou eyJhbGci..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 text-slate-900 font-mono text-[11px] focus:outline-emerald-600"
              />
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-md text-xs border flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={testing}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                {testing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Validar Conexão</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await reloadOnlineData();
                  alert('Schema cache e dados recarregados!');
                }}
                className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
                title="Recarregar dados do banco"
              >
                <RefreshCw size={13} />
                <span>Recarregar Cache</span>
              </button>

              {isOnlineConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="py-2 px-3 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                >
                  Desconectar
                </button>
              )}
            </div>
          </form>

          {/* Test Suite Execution Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Play size={14} className="text-blue-600" />
                  <span>Bateria de Testes no Banco (SELECT, INSERT & Relacionamentos)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Executa testes reais contra o Supabase para validar filiais, tipos de carro, veículos e joins
                </p>
              </div>

              <button
                type="button"
                disabled={runningTests}
                onClick={handleRunVerificationSuite}
                className="py-2 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                {runningTests ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Executando Testes...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    <span>Executar Testes Agora</span>
                  </>
                )}
              </button>
            </div>

            {testSuiteResults && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-700 uppercase">
                  Resultado da Execução:
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {testSuiteResults.map((t) => (
                    <div
                      key={t.step}
                      className={`p-2.5 rounded border text-xs flex items-start gap-2.5 transition-colors ${
                        t.success
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/80 border-rose-200 text-rose-950'
                      }`}
                    >
                      {t.success ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            Teste {t.step}: {t.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              t.success ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                            }`}
                          >
                            {t.success ? 'PASSOU' : 'FALHOU'}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5 text-slate-700">{t.message}</p>
                        {t.dataSnippet && (
                          <pre className="mt-1 p-1 bg-black/5 rounded text-[10px] font-mono overflow-x-auto text-slate-600">
                            {t.dataSnippet}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Close */}
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
