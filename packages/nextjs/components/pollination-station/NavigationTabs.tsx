"use client";

import { useState } from "react";
import { HomeIcon, DocumentTextIcon, TrophyIcon } from "@heroicons/react/24/outline";

type NavigationTabsProps = {
  onTabChange: (tabId: string) => void;
};

const NavigationTabs: React.FC<NavigationTabsProps> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange(tabId);
  };

  return (
    <div className="flex justify-center mb-8 gap-4">
      {[
        { id: 'dashboard', icon: HomeIcon, label: 'Dashboard' },
        { id: 'proposals', icon: DocumentTextIcon, label: 'Proposals' },
        { id: 'matches', icon: TrophyIcon, label: 'Matches' }
      ].map(tab => (
        <button
          key={tab.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            activeTab === tab.id ? 'bg-secondary text-primary-content' : 'bg-base-100'
          }`}
          onClick={() => handleTabClick(tab.id)}
        >
          <tab.icon className="h-5 w-5" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default NavigationTabs;

