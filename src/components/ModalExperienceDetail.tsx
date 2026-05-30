import React from 'react';
import { Clock, MapPin, Star, X, CalendarCheck } from 'lucide-react';
import { ExperienceTable, formatVnd } from '../types';

interface ModalExperienceDetailProps {
  experience: ExperienceTable;
  onClose: () => void;
  onBook: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop';

export default function ModalExperienceDetail({ experience, onClose, onBook }: ModalExperienceDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm overflow-y-auto py-10">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-zinc-600 shadow-sm backdrop-blur-md hover:bg-white hover:text-zinc-950"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-64 sm:h-80 w-full bg-zinc-950 overflow-hidden">
          {/* Blurred background */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
            style={{ backgroundImage: `url(${experience.image || FALLBACK_IMAGE})` }}
          />
          {/* Main image */}
          <img
            src={experience.image || FALLBACK_IMAGE}
            alt={experience.title}
            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
            className="relative h-full w-full object-contain"
          />
          <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm">
            {experience.category}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-zinc-950">
                {experience.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {experience.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  {experience.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {Number(experience.rating || 0).toFixed(1)} ({experience.reviews_count} đánh giá)
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase text-zinc-400">Giá tour</div>
              <div className="text-2xl font-black text-emerald-700">
                {formatVnd(experience.price)}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-black text-zinc-900 mb-3">Mô tả trải nghiệm</h3>
            <div className="text-zinc-600 leading-relaxed space-y-3 whitespace-pre-wrap">
              {experience.description || 'Chưa có mô tả cho tour này.'}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-black text-zinc-900 mb-3">Bản đồ khu vực</h3>
            <div className="rounded-2xl overflow-hidden border border-zinc-200">
              <iframe
                title="Bản đồ khu vực"
                width="100%"
                height="250"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(experience.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-zinc-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBook();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-sm hover:bg-emerald-700"
            >
              <CalendarCheck className="h-4 w-4" />
              Đặt tour ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
