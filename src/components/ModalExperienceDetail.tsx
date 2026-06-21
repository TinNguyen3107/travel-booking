import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Star, X, CalendarCheck, Users, Bed, Home, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { ExperienceTable, TourScheduleTable, formatDateVi, formatVnd, isExperienceOpen } from '../types';
import HostProfileWidget from './HostProfileWidget';

interface ModalExperienceDetailProps {
  experience: ExperienceTable;
  onClose: () => void;
  onBook: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop';

export default function ModalExperienceDetail({ experience, onClose, onBook }: ModalExperienceDetailProps) {
  const isOpen = isExperienceOpen(experience);
  const [schedules, setSchedules] = useState<TourScheduleTable[]>([]);

  useEffect(() => {
    fetch(`/api/schedules?experience_id=${experience.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSchedules(data);
      })
      .catch(console.error);
  }, [experience.id]);

  let parsedAmenities: string[] = [];
  try {
    parsedAmenities = typeof experience.amenities === 'string' && experience.amenities !== '[]' && experience.amenities !== ''
      ? JSON.parse(experience.amenities) : [];
  } catch (e) { }

  let parsedImages: string[] = [];
  try {
    parsedImages = typeof experience.images === 'string' && experience.images !== '[]' && experience.images !== ''
      ? JSON.parse(experience.images) : [];
  } catch (e) { }

  let oldState: any = null;
  if (experience.status === 'pending_update' && experience.previous_state) {
    try {
      oldState = JSON.parse(experience.previous_state);
    } catch (e) { }
  }

  const isChanged = (field: keyof ExperienceTable) => {
    if (!oldState) return false;
    return JSON.stringify(oldState[field]) !== JSON.stringify(experience[field]);
  };

  const highlightClass = (field: keyof ExperienceTable | (keyof ExperienceTable)[]) => {
    const fields = Array.isArray(field) ? field : [field];
    if (fields.some(f => isChanged(f))) {
      return 'bg-amber-100/50 outline outline-2 outline-amber-200 rounded-lg p-1 transition-all';
    }
    return '';
  };

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
              <h2 className={`text-2xl sm:text-3xl font-black leading-tight text-zinc-950 ${highlightClass('title')}`}>
                {experience.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-500">
                <span className={`inline-flex items-center gap-1.5 ${highlightClass('location')}`}>
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {experience.location}
                </span>
                <span className={`inline-flex items-center gap-1.5 ${highlightClass('duration')}`}>
                  <Clock className="h-4 w-4 text-emerald-600" />
                  {experience.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {Number(experience.rating || 0).toFixed(1)} ({experience.reviews_count} đánh giá)
                </span>
              </div>
            </div>
            <div className={`flex items-center gap-2 ${highlightClass('price')}`}>
              <span className="text-xs font-bold uppercase text-zinc-400">Giá tour</span>
              <span className="text-2xl font-black text-emerald-700">
                {formatVnd(experience.price)}
              </span>
            </div>
          </div>

          {experience.host_email && (
            <div className="mt-6 border-b border-zinc-100 pb-5">
              <h3 className="text-sm font-bold uppercase text-zinc-500 mb-3">Thông tin Host</h3>
              <HostProfileWidget email={experience.host_email} />
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${highlightClass(['max_guests', 'daily_capacity_max', 'daily_capacity'])}`}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
                <Users className="h-4 w-4 text-emerald-600" />
                Sức chứa
              </div>
              <div className="mt-2 text-base font-black text-zinc-950">
                {Number(experience.daily_capacity_max ?? experience.daily_capacity ?? experience.max_guests ?? 50)} khách/ngày
              </div>
              <div className="text-xs text-zinc-500">
                (Tổng {Number(experience.max_guests || 50)} khách)
              </div>
            </div>
            <div className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${highlightClass(['booking_open_date', 'booking_close_date'])}`}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                Nhận đặt
              </div>
              <div className="mt-2 text-sm font-black text-zinc-950">
                {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
              </div>
            </div>
            <div className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${highlightClass(['allow_children', 'min_age', 'child_max_age', 'child_price'])}`}>
              <div className="text-xs font-bold uppercase text-zinc-500">Chính sách trẻ em</div>
              {experience.allow_children ? (
                <div className="mt-2 text-xs font-bold text-zinc-700">
                  <span className="block">• Tuổi tham gia: từ {experience.min_age || 0} tuổi</span>
                  <span className="block">• Trẻ em ({experience.min_age || 0}-{experience.child_max_age || 12} tuổi): Giảm {experience.child_price || 0}%</span>
                </div>
              ) : (
                <div className="mt-2 text-xs font-bold text-rose-600">
                  Không áp dụng cho trẻ em.
                </div>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase text-zinc-500">Trạng thái</div>
              <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${isOpen ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                {isOpen ? 'Đang mở bán' : 'Đã đóng nhận đặt'}
              </div>
            </div>
          </div>

          {experience.status === 'pending_update' && experience.previous_state && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-black uppercase text-amber-800 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Chi tiết cập nhật (So sánh với bản cũ)
              </h3>
              <div className="text-xs text-amber-900 bg-white/60 p-3 rounded-lg border border-amber-100 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                {(() => {
                  try {
                    const oldState = JSON.parse(experience.previous_state);
                    const changes: string[] = [];
                    const ignoreKeys = ['id', 'status', 'previous_state'];
                    Object.keys(experience).forEach(key => {
                      if (ignoreKeys.includes(key)) return;
                      const oldVal = (oldState as any)[key];
                      const newVal = (experience as any)[key];
                      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                        changes.push(`- ${key}:\n  Cũ: ${JSON.stringify(oldVal)}\n  Mới: ${JSON.stringify(newVal)}`);
                      }
                    });
                    if (changes.length === 0) return 'Không có thay đổi dữ liệu nào đáng kể.';
                    return changes.join('\n\n');
                  } catch (e) {
                    return 'Không thể đọc được dữ liệu phiên bản cũ.';
                  }
                })()}
              </div>
            </div>
          )}

          {(experience.rooms || experience.beds) ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {experience.rooms ? (
                <div className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${highlightClass('rooms')}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-zinc-500">Số phòng</div>
                    <div className="text-base font-black text-zinc-950">{experience.rooms} phòng</div>
                  </div>
                </div>
              ) : null}
              {experience.beds ? (
                <div className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${highlightClass('beds')}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Bed className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-zinc-500">Số giường</div>
                    <div className="text-base font-black text-zinc-950">{experience.beds} giường</div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {parsedAmenities.length > 0 && (
            <div className={`mt-6 ${highlightClass('amenities')}`}>
              <h3 className="text-lg font-black text-zinc-900 mb-3">Tiện ích</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {parsedAmenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          {schedules.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-black text-zinc-900 mb-3">Lịch khởi hành sắp tới</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {schedules.filter(s => s.remaining_slots > 0).slice(0, 4).map(schedule => (
                  <div key={schedule.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="text-sm font-bold text-emerald-900">
                        {formatDateVi(schedule.start_date)} - {formatDateVi(schedule.end_date)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-700">
                        Còn {schedule.remaining_slots} chỗ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedImages.length > 0 && (
            <div className={`mt-6 ${highlightClass('images')}`}>
              <h3 className="text-lg font-black text-zinc-900 mb-3">Thư viện ảnh</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {parsedImages.map((img, idx) => (
                  <img key={idx} src={img} alt={`${experience.title} ${idx}`} className="h-32 w-full object-cover rounded-xl border border-zinc-200" />
                ))}
              </div>
            </div>
          )}

          <div className={`mt-6 ${highlightClass('description')}`}>
            <h3 className="text-lg font-black text-zinc-900 mb-3">Mô tả trải nghiệm</h3>
            <div className="text-zinc-600 leading-relaxed space-y-3 whitespace-pre-wrap">
              {experience.description || 'Chưa có mô tả cho tour này.'}
            </div>
          </div>

          {experience.host_email && (
            <HostProfileWidget email={experience.host_email} />
          )}

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
                if (!isOpen) return;
                onClose();
                onBook();
              }}
              disabled={!isOpen}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <CalendarCheck className="h-4 w-4" />
              {isOpen ? 'Đặt tour ngay' : 'Tour đã đóng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
