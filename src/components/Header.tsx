/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Compass,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  X
} from 'lucide-react';
import { useState } from 'react';

type CurrentUser = { email: string; fullname: string; role: 'user' | 'admin' | 'host' };

interface HeaderProps {
  user: CurrentUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigate: (sectionId: string) => void;
  activeSection: string;
  adminMode?: boolean;
}

export default function Header({
  user,
  onOpenLogin,
  onLogout,
  onNavigate,
  activeSection,
  adminMode = false
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = adminMode
    ? [
        { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
        { id: 'preview', label: 'Tour đang mở bán', icon: Compass }
      ]
    : [
        { id: 'about', label: 'Về chúng tôi' },
        { id: 'experiences', label: 'Trải nghiệm' },
        { id: 'how-it-works', label: 'Cách hoạt động' },
        { id: 'community', label: 'Cộng đồng' },
        { id: 'faq', label: 'Hỏi đáp' }
      ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => handleNavClick(adminMode ? 'dashboard' : 'hero')}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Compass className="h-5 w-5" />
          </span>
          <span className="hidden text-sm font-black text-zinc-900 sm:block lg:text-base">
            TravelBooking
          </span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                {user.role === 'admin' && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                <span className="max-w-40 truncate">{user.fullname || user.email}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 sm:hidden"
          aria-label="Mở menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 sm:hidden">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  activeSection === item.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-zinc-100 pt-3">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
