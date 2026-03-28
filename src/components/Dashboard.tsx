import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, PlusCircle, Settings, LogOut, PanelLeftClose, PanelLeftOpen, FolderSearch } from 'lucide-react';
import { DashboardOverview } from './DashboardOverview';
import { CampaignWizard } from './CampaignWizard';
import { CampaignExplorer } from './CampaignExplorer';

export const Dashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'wizard' | 'explorer'>('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* AppShell Sidebar */}
      <aside className={`flex flex-col bg-surface border-r border-border z-10 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-6 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <h1 className="text-xl font-bold text-textMain tracking-tight whitespace-nowrap">Fetemi Portal</h1>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-textMuted hover:text-textMain transition-colors flex-shrink-0 pt-0.5">
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        
        <nav className={`flex-1 space-y-2 mt-6 overflow-x-hidden ${isCollapsed ? 'px-3' : 'px-4'}`}>
          <button 
            onClick={() => setActiveTab('overview')}
            title="Overview"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4'} py-3 rounded-lg transition-all font-medium text-sm ${activeTab === 'overview' ? 'bg-primary-50 text-primary-700' : 'text-textMuted hover:text-textMain hover:bg-slate-100'}`}
          >
            <div className="shrink-0"><LayoutDashboard size={isCollapsed ? 22 : 18} /></div>
            {!isCollapsed && <span className="whitespace-nowrap">Overview</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('explorer')}
            title="Campaign Explorer"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4'} py-3 rounded-lg transition-all font-medium text-sm ${activeTab === 'explorer' ? 'bg-primary-50 text-primary-700' : 'text-textMuted hover:text-textMain hover:bg-slate-100'}`}
          >
            <div className="shrink-0"><FolderSearch size={isCollapsed ? 22 : 18} /></div>
            {!isCollapsed && <span className="whitespace-nowrap">Explorer</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('wizard')}
            title="New Campaign"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4'} py-3 rounded-lg transition-all font-medium text-sm ${activeTab === 'wizard' ? 'bg-primary-50 text-primary-700' : 'text-textMuted hover:text-textMain hover:bg-slate-100'}`}
          >
            <div className="shrink-0"><PlusCircle size={isCollapsed ? 22 : 18} /></div>
            {!isCollapsed && <span className="whitespace-nowrap">New Campaign</span>}
          </button>
          
          <div className="pt-6 pb-2">
             {!isCollapsed ? (
               <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Configuration</div>
             ) : (
               <div className="w-full h-px bg-border my-2" />
             )}
          </div>
          
          <button 
            title="Settings"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4'} py-3 rounded-lg transition-all font-medium text-sm text-textMuted hover:text-textMain hover:bg-slate-100`}
          >
            <div className="shrink-0"><Settings size={isCollapsed ? 22 : 18} /></div>
            {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
          </button>
        </nav>

        <div className={`p-4 border-t border-border bg-surface overflow-hidden ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {!isCollapsed && (
            <div className="mb-4 px-1 whitespace-nowrap">
              <p className="text-sm font-semibold text-textMain truncate w-[200px]">{session?.user?.email || 'test@fetemi.io'}</p>
              <p className="text-xs text-textMuted">Admin</p>
            </div>
          )}
          <button 
            onClick={logout}
            title="Sign Out"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-start gap-3 px-4 py-2.5'} rounded-lg text-textMuted hover:text-red-600 hover:bg-red-50 transition-all font-semibold text-sm`}
          >
            <div className="shrink-0"><LogOut size={isCollapsed ? 22 : 16} /></div>
            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-background">
        <div className="relative z-10 w-full h-full">
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'explorer' && <CampaignExplorer onNavigateWizard={() => setActiveTab('wizard')} />}
          {activeTab === 'wizard' && <CampaignWizard onComplete={() => setActiveTab('overview')} />}
        </div>
      </main>
    </div>
  );
};
