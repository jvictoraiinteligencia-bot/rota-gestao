import React from 'react';
import { Database } from 'lucide-react';
import { ActiveView } from '../../types';

export interface AdminSection {
  view: ActiveView;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

export interface AdminGroup {
  id: string;
  label: string;
  sections: AdminSection[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: 'system-config',
    label: 'Configuração do Sistema',
    sections: [
      {
        view: 'admin-database',
        label: 'Banco de Dados',
        description: 'Conexão Supabase, scripts SQL e testes do banco',
        icon: Database,
      },
    ],
  },
];

// O sistema ainda não possui controle de usuários: todos têm acesso à Administração.
// Substituir pela verificação de perfil/permissão quando a autenticação for implementada.
export const useCanAccessAdmin = (): boolean => true;
