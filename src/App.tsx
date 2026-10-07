/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TransportProvider, useTransport } from './context/TransportContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { VehiclesView } from './components/views/VehiclesView';
import { DriversView } from './components/views/DriversView';
import { BranchesView } from './components/views/BranchesView';
import { ClientsView } from './components/views/ClientsView';
import { TripsView } from './components/views/TripsView';
import { ExpensesView } from './components/views/ExpensesView';
import { VehicleAnalysisView } from './components/views/VehicleAnalysisView';
import { RoutesPricingView } from './components/views/RoutesPricingView';
import { ReportsView } from './components/views/ReportsView';
import { TripModal } from './components/modals/TripModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { SupabaseConnectionModal } from './components/modals/SupabaseConnectionModal';

function MainLayout() {
  const { activeView, supabaseModalOpen, setSupabaseModalOpen } = useTransport();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'vehicles':
        return <VehiclesView />;
      case 'drivers':
        return <DriversView />;
      case 'branches':
        return <BranchesView />;
      case 'clients':
        return <ClientsView />;
      case 'routes-pricing':
        return <RoutesPricingView />;
      case 'trips':
        return <TripsView />;
      case 'expenses':
        return <ExpensesView />;
      case 'vehicle-analysis':
        return <VehicleAnalysisView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenTripModal={() => setTripModalOpen(true)}
        onOpenExpenseModal={() => setExpenseModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenTripModal={() => setTripModalOpen(true)}
          onOpenExpenseModal={() => setExpenseModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>

        {/* Clean Footer */}
        <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              RotaGestão — Sistema Integrado de Gestão Financeira e Operacional de Frota
            </span>
            <span className="text-slate-400">
              Controle de Fretes, Despesas e Margem por Veículo
            </span>
          </div>
        </footer>
      </div>

      {/* Quick Global Action Modals */}
      <TripModal
        isOpen={tripModalOpen}
        onClose={() => setTripModalOpen(false)}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
      />

      <SupabaseConnectionModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TransportProvider>
      <MainLayout />
    </TransportProvider>
  );
}
