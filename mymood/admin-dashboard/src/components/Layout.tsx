import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Music, Upload, Bell, BarChart3, LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'จัดการผู้ใช้' },
  { to: '/content', icon: Music, label: 'จัดการเนื้อหา' },
  { to: '/upload', icon: Upload, label: 'อัปโหลดเพลง' },
  { to: '/notifications', icon: Bell, label: 'แจ้งเตือน' },
  { to: '/analytics', icon: BarChart3, label: 'สถิติ' },
];

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout: () => void }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col justify-between shadow-sm">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-lg leading-tight">MyMood</h1>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || 
                (item.to === '/dashboard' && location.pathname === '/') ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
