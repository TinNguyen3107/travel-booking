import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Trash2, Bell, Info, AlertTriangle, XCircle } from 'lucide-react';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface ModalNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ModalNotifications({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onDelete
}: ModalNotificationsProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-emerald-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-6">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      <div
        className={`relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 dark:bg-slate-900 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Hòm thư / Thông báo</h2>
              <p className="text-sm text-zinc-500 dark:text-slate-400">
                {notifications.filter(n => !n.is_read).length} thông báo chưa đọc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-zinc-50/50 p-4 dark:bg-slate-900/50">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-slate-800">
                <Bell className="h-8 w-8 text-zinc-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Chưa có thông báo nào</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-slate-400">
                Khi có người tương tác với bài viết của bạn hoặc có cập nhật mới, thông báo sẽ hiển thị ở đây.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((noti) => (
                <div
                  key={noti.id}
                  className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all ${
                    noti.is_read
                      ? 'border-zinc-200 bg-white dark:border-slate-800 dark:bg-slate-900 opacity-75 hover:opacity-100'
                      : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20 shadow-sm'
                  }`}
                >
                  <div className="mt-1 shrink-0">
                    {getIcon(noti.type)}
                  </div>
                  
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      if (!noti.is_read) onMarkAsRead(noti.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h4 className={`text-base font-bold ${!noti.is_read ? 'text-emerald-900 dark:text-emerald-100' : 'text-zinc-900 dark:text-white'}`}>
                        {noti.title}
                      </h4>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {new Date(noti.created_at || '').toLocaleDateString('vi-VN', {
                          hour: '2-digit', minute: '2-digit',
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className={`mt-1.5 text-sm leading-relaxed ${!noti.is_read ? 'text-emerald-800 dark:text-emerald-200/80' : 'text-zinc-600 dark:text-slate-400'}`}>
                      {noti.message}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!noti.is_read && (
                      <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(noti.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 opacity-0 transition-all hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
