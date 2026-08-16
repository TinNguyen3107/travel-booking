/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Lock, LogIn, Mail, User, X, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ModalLoginProps {
  onClose: () => void;
  onLoginSuccess: (user: { email: string; fullname: string; role: 'user' | 'admin' | 'host' }) => void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ModalLogin({ onClose, onLoginSuccess }: ModalLoginProps) {
  const { t } = useLanguage();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  
  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('auth_google_error'));
      
      localStorage.setItem('auth_token', data.token);
      onLoginSuccess({ email: data.email, fullname: data.fullname, role: data.role });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      const google = (window as any).google;
      if (google && google.accounts && document.getElementById('googleSignInDiv')) {
        // Prevent multiple initialization errors by checking if button already rendered
        if (document.getElementById('googleSignInDiv')?.innerHTML !== '') {
          return;
        }

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse
        });
        google.accounts.id.renderButton(
          document.getElementById('googleSignInDiv'),
          { theme: 'outline', size: 'large', text: isRegisterMode ? 'signup_with' : 'signin_with' }
        );
      }
    };
    
    const timer = setTimeout(initGoogle, 300);
    return () => clearTimeout(timer);
  }, [isRegisterMode, GOOGLE_CLIENT_ID]);

  const validateForm = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullname.trim();

    if (!emailPattern.test(cleanEmail)) {
      return 'Email không hợp lệ';
    }

    if (isForgotPassword) {
      if (password.length < 6) return 'Mật khẩu mới cần tối thiểu 6 ký tự';
      if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
    } else {
      if (password.length < 6) {
        return 'Mật khẩu cần tối thiểu 6 ký tự';
      }

      if (isRegisterMode && cleanName.length < 2) {
        return 'Họ tên cần tối thiểu 2 ký tự';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    if (isForgotPassword) {
      const endpoint = '/api/auth/reset-password';
      const payload = { email: email.trim().toLowerCase(), newPassword: password };
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu');
        alert('Đổi mật khẩu thành công, vui lòng đăng nhập bằng mật khẩu mới.');
        setIsForgotPassword(false);
        setPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegisterMode
      ? { email: email.trim().toLowerCase(), password, fullname: fullname.trim() }
      : { email: email.trim().toLowerCase(), password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không thể xử lý yêu cầu');
      }

      onLoginSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 dark:text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-slate-100"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-zinc-100 dark:border-slate-800 px-6 py-5">
          <h2 className="text-xl font-black text-zinc-950 dark:text-slate-50">
            {isForgotPassword ? t('auth_forgot_title') : isRegisterMode ? t('auth_register_title') : t('auth_login_title')}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            {isForgotPassword 
              ? t('auth_forgot_desc')
              : isRegisterMode
              ? t('auth_register_desc')
              : t('auth_login_desc')}
          </p>
        </div>

        <div className="p-6">


          <form onSubmit={handleSubmit} className="space-y-4">
            {!isForgotPassword && isRegisterMode && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">{t('auth_fullname')}</span>
                <span className="relative block">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                  <input
                    value={fullname}
                    onChange={(event) => setFullname(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                    placeholder={t('auth_fullname_ph')}
                    autoComplete="name"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">{t('auth_email')}</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                  placeholder={t('auth_email_ph')}
                  autoComplete="email"
                />
              </span>
            </label>

            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">
                  {isForgotPassword ? t('auth_password_new') : t('auth_password')}
                </span>
                {!isRegisterMode && !isForgotPassword && (
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs font-bold text-emerald-600 hover:underline">
                    {t('auth_password_forgot')}
                  </button>
                )}
              </div>
              <span className="relative block">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                  placeholder={isForgotPassword ? t('auth_password_new_ph') : t('auth_password_ph')}
                  autoComplete={isRegisterMode || isForgotPassword ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {isForgotPassword && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">{t('auth_password_confirm')}</span>
                <span className="relative block">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                    placeholder={t('auth_password_confirm_ph')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {isForgotPassword ? t('auth_reset_btn') : isRegisterMode ? t('auth_register_btn') : t('auth_login_btn')}
                </>
              )}
            </button>
          </form>

          {!isForgotPassword && GOOGLE_CLIENT_ID && (
            <>
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-zinc-500 dark:bg-slate-900 dark:text-slate-400">
                    {t('auth_or_continue_with')}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-center w-full">
                {/* Google Sign In Button Container */}
                <div id="googleSignInDiv" className="w-full flex justify-center"></div>
              </div>
            </>
          )}

          <div className="mt-5 text-center text-sm text-zinc-500 dark:text-slate-400">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                }}
                className="font-bold text-emerald-700 hover:underline"
              >
                {t('auth_login_now')}
              </button>
            ) : (
              <>
                {isRegisterMode ? t('auth_has_account') : t('auth_no_account')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode((value) => !value);
                    setError(null);
                  }}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  {isRegisterMode ? t('auth_login_now') : t('auth_register_free')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
