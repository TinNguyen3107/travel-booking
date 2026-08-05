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
  Moon,
  ShieldCheck,
  Sun,
  X,
  Bell
} from 'lucide-react';
import { useState, useEffect } from 'react';
import ModalNotifications from './ModalNotifications';
import logoImg from '@/logo/logo.png';
import { useLanguage } from '../contexts/LanguageContext';

type CurrentUser = { email: string; fullname: string; avatar?: string; role: 'user' | 'admin' | 'host' };

interface HeaderProps {
  user: CurrentUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigate: (sectionId: string) => void;
  onOpenProfile?: () => void;
  activeSection: string;
  adminMode?: boolean;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export default function Header({
  user,
  onOpenLogin,
  onLogout,
  onNavigate,
  onOpenProfile,
  activeSection,
  adminMode = false,
  isDark = false,
  onToggleDark
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const { lang, setLang, t } = useLanguage();

  const adminLabels = {
    dashboard: t('nav_dashboard'),
    preview: t('nav_preview'),
    logout: t('nav_logout'),
    darkOn: t('nav_dark_on'),
    darkOff: t('nav_dark_off')
  };

  const navItems = adminMode
    ? [
        { id: 'dashboard', label: adminLabels.dashboard, icon: LayoutDashboard },
        { id: 'preview', label: adminLabels.preview, icon: Compass }
      ]
    : [
        { id: 'about', label: t('nav_about') },
        { id: 'experiences', label: t('nav_experiences') },
        { id: 'how-it-works', label: t('nav_how') },
        { id: 'community', label: t('nav_community') },
        { id: 'faq', label: t('nav_faq') }
      ];

  const getDarkLabel = () => (adminMode ? (isDark ? adminLabels.darkOff : adminLabels.darkOn) : (isDark ? t('nav_dark_off') : t('nav_dark_on')));
  const getLogoutLabel = () => (adminMode ? adminLabels.logout : t('nav_logout'));

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  // Flag SVGs inline for zero dependency
  const FlagVN = () => (
    <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-sm shadow-sm" xmlns="http://www.w3.org/2000/svg">
      <rect width="30" height="20" fill="#DA251D"/>
      <polygon points="15,3 16.9,8.8 22.9,8.8 18,12.2 19.9,18 15,14.6 10.1,18 12,12.2 7.1,8.8 13.1,8.8" fill="#FFFF00"/>
    </svg>
  );

  const FlagUK = () => (
    <svg viewBox="0 0 60 30" className="h-4 w-6 rounded-sm shadow-sm" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => handleNavClick(adminMode ? 'dashboard' : 'hero')}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <img src={logoImg} alt="VietTour Logo" className="h-12 w-12 shrink-0 object-contain rounded-xl" />
          <span className="hidden text-sm font-black sm:block lg:text-base">
            <span className="text-zinc-950 dark:text-slate-50">Viet</span>
            <span className="text-emerald-600">Tour</span>
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
                    : 'text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={getDarkLabel()}
            title={getDarkLabel()}
            className={`relative flex h-9 w-16 items-center rounded-full p-1 transition-all duration-300 ${
              isDark
                ? 'bg-indigo-600 shadow-inner shadow-indigo-900'
                : 'bg-amber-100 shadow-inner shadow-amber-200'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
                isDark
                  ? 'translate-x-7 bg-indigo-100 text-indigo-700'
                  : 'translate-x-0 bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-amber-500'
              }`}
            >
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
          </button>

          {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              title={t('lang_toggle')}
              aria-label={t('lang_toggle')}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 px-2.5 py-1.5 text-xs font-bold text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
            >
              {lang === 'vi' ? <FlagUK /> : <FlagVN />}
              <span className="hidden sm:inline">{lang === 'vi' ? 'EN' : 'VI'}</span>
            </button>

          {user ? (
            <>
              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex items-center justify-center rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

              </div>

              {showNotifications && (
                <ModalNotifications 
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  notifications={notifications}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              )}

              <button type="button" onClick={onOpenProfile} className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.fullname} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  user.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">{user.fullname.charAt(0).toUpperCase()}</div>
                )}
                <span className="max-w-40 truncate">{user.fullname || user.email}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                {getLogoutLabel()}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <LogIn className="h-4 w-4" />
              {t('nav_login')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-slate-200 sm:hidden"
          aria-label="Mở menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-3 sm:hidden">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  activeSection === item.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-zinc-100 dark:border-slate-800 pt-3 space-y-2">
            {/* Mobile dark toggle */}
            <button
              type="button"
              onClick={onToggleDark}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              {getDarkLabel()}
            </button>
            {/* Mobile language toggle */}
              <button
                type="button"
                onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                {lang === 'vi' ? <FlagUK /> : <FlagVN />}
                {t('lang_toggle')}
              </button>
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
                {getLogoutLabel()}
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
                {t('nav_login')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
