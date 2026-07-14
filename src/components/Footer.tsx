/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Compass, Mail, MapPin, Phone } from 'lucide-react';
import logoImg from '@/logo/logo.png';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-zinc-200 dark:border-slate-700 bg-zinc-950 px-4 py-10 text-zinc-300 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('hero')}
            className="flex items-center gap-2 text-left text-lg font-black text-white"
          >
            <img src={logoImg} alt="VietTour Logo" className="h-12 w-12 shrink-0 object-contain rounded-xl" />
            <span>
              <span className="text-white">Viet</span>
              <span className="text-emerald-500">Tour</span>
            </span>
          </button>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400 dark:text-slate-500">
            Nền tảng đặt tour trải nghiệm địa phương tại Việt Nam, tập trung vào lịch trình rõ ràng,
            host đáng tin cậy và thao tác đặt tour nhanh.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Sản phẩm</h3>
          <div className="mt-4 grid gap-2 text-sm">
            {[
              ['about', 'Về chúng tôi'],
              ['experiences', 'Trải nghiệm'],
              ['how-it-works', 'Cách hoạt động'],
              ['community', 'Cộng đồng'],
              ['faq', 'Hỏi đáp']
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className="text-left text-zinc-400 dark:text-slate-500 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Liên hệ</h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-400 dark:text-slate-500">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-500" />
              viettour@gmail.com
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-500" />
              0775 460 916
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Ngũ Hành Sơn, Đà Nẵng, Việt Nam
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-zinc-800 pt-5 text-xs text-zinc-500 dark:text-slate-400">
        © 2026 VietTour. Bảo lưu mọi quyền.
      </div>
    </footer>
  );
}
