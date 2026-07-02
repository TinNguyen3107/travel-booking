import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

interface ModalConfirmProps extends ConfirmConfig {
  onClose: () => void;
}

export default function ModalConfirm({
  title,
  message,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  isDanger = true,
  onConfirm,
  onClose
}: ModalConfirmProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 dark:text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-slate-100"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-8 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isDanger ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-black text-zinc-950 dark:text-slate-50">{title}</h2>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-slate-400">{message}</p>
        </div>

        <div className="flex gap-2 border-t border-zinc-100 dark:border-slate-800 bg-zinc-50 dark:bg-slate-900/50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
