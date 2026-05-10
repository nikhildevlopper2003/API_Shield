import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Key, ShieldOff, AlertTriangle,
  Settings, Menu, Zap, Circle
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket.js';

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/api-keys',     label: 'API Keys',        icon: Key },
  { to: '/blocked-ips',  label: 'Blocked IPs',     icon: ShieldOff },
  { to: '/abuse-logs',   label: 'Abuse Logs',      icon: AlertTriangle },
  { to: '/rate-policies',label: 'Rate Policies',   icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connected } = useSocket();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 flex flex-col bg-gray-900 border-r border-gray-800
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">APIShield Pro</p>
            <p className="text-xs text-gray-500">Gateway Dashboard</p>
          </div>
        </div>

        {/* 🔥 NEW: Section label (no UI break) */}
        <div className="px-5 pt-4 text-[11px] uppercase tracking-wide text-gray-600">
          Admin Panel
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-700/40'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
              `}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Connection status */}
        <div className="px-5 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <Circle
              size={8}
              className={connected ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'}
            />
            <span className="text-xs text-gray-400">
              {connected ? 'Live — Real-time connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold text-white">APIShield Pro</span>
          <div />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <Outlet />
        </main>

      </div>
    </div>
  );
}