import React from 'react';

interface SidebarProps {
  activeCategory: string;
  setActiveCategory: (cat: 'My Projects' | 'Shared with me' | 'Templates' | 'Trash') => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  setActiveCategory,
  onOpenSettings,
}) => {
  const navItems = [
    { id: 'My Projects', label: 'My Projects', icon: 'dashboard', fill: true },
    { id: 'Shared with me', label: 'Shared with me', icon: 'group' },
    { id: 'Templates', label: 'Templates', icon: 'dashboard_customize' },
    { id: 'Trash', label: 'Trash', icon: 'delete' },
  ];

  return (
    <aside className="w-64 border-r border-[#c3c6d7]/30 bg-[#f7f9fb] h-full flex flex-col py-6 px-4 hidden md:flex shrink-0 z-10 pt-20">
      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = activeCategory === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveCategory(item.id as any)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all text-left ${
                isActive
                  ? 'bg-[#2563eb]/10 text-[#004ac6] font-bold shadow-xs'
                  : 'text-[#434655] hover:bg-[#e0e3e5]/60 hover:text-[#191c1e]'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={item.fill && isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-[#434655] hover:bg-[#e0e3e5]/60 rounded-xl font-medium text-sm transition-colors text-left"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          Settings
        </button>
      </div>
    </aside>
  );
};
