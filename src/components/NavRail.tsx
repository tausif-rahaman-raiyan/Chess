import React from 'react';
import {
  BookOpen,
  Cpu,
  FolderHeart,
  Home,
  Info,
  Settings,
  Swords,
} from 'lucide-react';
import { NavTab, useAppStore } from '../store/useAppStore';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
  { id: 'home', label: 'Home', icon: <Home size={20} /> },
  { id: 'play', label: 'Play', icon: <Swords size={20} /> },
  { id: 'analysis', label: 'Analysis', icon: <Cpu size={20} /> },
  { id: 'saved', label: 'Games', icon: <FolderHeart size={20} /> },
  { id: 'openings', label: 'Openings', icon: <BookOpen size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  { id: 'about', label: 'About', icon: <Info size={20} /> },
];

export const NavRail: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav
      aria-label="Primary Navigation"
      style={{
        width: 78,
        minWidth: 78,
        background: 'var(--bg-rail)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 6px',
        gap: 6,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            style={{
              width: 64,
              padding: '10px 4px',
              borderRadius: 10,
              border: 'none',
              background: active ? 'var(--bg-surface-elevated)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: active ? 700 : 600,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {active && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  borderRadius: 99,
                  background: 'var(--accent)',
                }}
              />
            )}
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
