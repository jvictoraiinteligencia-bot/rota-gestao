import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { ADMIN_GROUPS } from './adminConfig';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { activeView, setActiveView } = useTransport();

  return (
    <div className="space-y-5">
      {/* Admin area banner */}
      <div className="bg-slate-900 text-slate-100 rounded-xl px-5 py-4 flex items-center gap-3 shadow-xs">
        <div className="p-2 rounded-lg bg-slate-800 text-slate-200">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Administração</h2>
          <p className="text-[11px] text-slate-400">
            Área administrativa do RotaGestão — configurações técnicas do sistema, separadas das rotinas operacionais.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Admin sub-navigation */}
        <aside className="lg:w-60 shrink-0 bg-white border border-slate-200 rounded-xl p-3 h-fit space-y-3">
          {ADMIN_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              {group.sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeView === section.view;

                return (
                  <button
                    key={section.view}
                    onClick={() => setActiveView(section.view)}
                    className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={15} className={`mt-0.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-semibold">{section.label}</div>
                      <div className={`text-[10px] ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {section.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Section content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};
