/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertCircle, Lock, LogIn, Mail, User, X } from 'lucide-react';

interface ModalLoginProps {
  onClose: () => void;
  onLoginSuccess: (user: { email: string; fullname: string; role: 'user' | 'admin' | 'host' }) => void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ModalLogin({ onClose, onLoginSuccess }: ModalLoginProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);



  const validateForm = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullname.trim();

    if (!emailPattern.test(cleanEmail)) {
      return 'Email không hợp lệ';
    }

    if (password.length < 6) {
      return 'Mật khẩu cần tối thiểu 6 ký tự';
    }

    if (isRegisterMode && cleanName.length < 2) {
      return 'Họ tên cần tối thiểu 2 ký tự';
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
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 className="text-xl font-black text-zinc-950">
            {isRegisterMode ? 'Đăng ký tài khoản' : 'Đăng nhập'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isRegisterMode
              ? 'Tạo tài khoản để đặt tour và bình luận.'
              : 'Đăng nhập để đặt tour, bình luận và trải nghiệm các dịch vụ.'}
          </p>
        </div>

        <div className="p-6">


          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">Họ và tên</span>
                <span className="relative block">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={fullname}
                    onChange={(event) => setFullname(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">Email</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">Mật khẩu</span>
              <span className="relative block">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                />
              </span>
            </label>

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
                  {isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-zinc-500">
            {isRegisterMode ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode((value) => !value);
                setError(null);
              }}
              className="font-bold text-emerald-700 hover:underline"
            >
              {isRegisterMode ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
