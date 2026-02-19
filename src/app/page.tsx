'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import InspectionUpload from '@/components/InspectionUpload';
import InspectionHistory from '@/components/InspectionHistory';
import SettingsPanel from '@/components/SettingsPanel';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'inspect' && <InspectionUpload />}
        {activeTab === 'history' && <InspectionHistory />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
