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
import { useLanguage } from '../contexts/LanguageContext';

export default function ModalExperienceDetail({ experience, onClose, onBook }: ModalExperienceDetailProps) {
  const { t, tCategory, tDynamic } = useLanguage();
  const isOpen = isExperienceOpen(experience);
  const [schedules, setSchedules] = useState<TourScheduleTable[]>([]);
  const validSchedules = schedules.filter(s =>
    s.start_date >= experience.booking_open_date &&
    (!experience.booking_close_date || s.start_date <= experience.booking_close_date)
  );
  const [availability, setAvailability] = useState<{ totalRemaining: number, dailyRemaining: number, isAvailable: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/experiences/${experience.id}/availability?date=${new Date().toISOString().split('T')[0]}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setAvailability(data);
      })
      .catch(console.error);

    fetch(`/api/schedules?experience_id=${experience.id}`, { cache: 'no-store' })
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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 p-2 sm:p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-full max-h-[96vh] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/95 backdrop-blur-xl dark:bg-slate-900 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/80 backdrop-blur-lg dark:bg-slate-800/80 p-2 text-zinc-600 dark:text-slate-300 shadow-sm hover:bg-white dark:hover:bg-slate-700 hover:text-zinc-950 dark:hover:text-white"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-y-auto w-full">
          <div className="relative h-64 sm:h-100 w-full bg-zinc-950 overflow-hidden shrink-0">
            {/* Blurred background */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
              style={{ backgroundImage: `url(${experience.image || FALLBACK_IMAGE})` }}
            />
            {/* Main image */}
            <img
              src={experience.image || FALLBACK_IMAGE}
              alt={tDynamic(experience.title)}
              onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              className="relative h-full w-full object-contain"
            />
            <div className="absolute bottom-4 left-4 rounded-full bg-white/80 backdrop-blur-lg dark:bg-slate-800/95 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm">
              {tCategory(experience.category)}
            </div>
          </div>

          <div className="p-6 sm:p-10 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className={`text-2xl sm:text-3xl font-black leading-tight text-zinc-950 dark:text-slate-50 ${highlightClass('title')}`}>
                  {tDynamic(experience.title)}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-500 dark:text-slate-400">
                  <span className={`inline-flex items-center gap-1.5 ${highlightClass('location')}`}>
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {tDynamic(experience.location)}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 ${highlightClass('duration')}`}>
                    <Clock className="h-4 w-4 text-emerald-600" />
                    {tDynamic(experience.duration)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    {Number(experience.rating || 0).toFixed(1)} ({experience.reviews_count} {t('detail_rating_count')})
                  </span>
                </div>
              </div>
              <div className={`flex items-center gap-2 ${highlightClass('price')}`}>
                <span className="text-xs font-bold uppercase text-zinc-400 dark:text-slate-500">{t('booking_tour')}</span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatVnd(experience.price)}
                </span>
              </div>
            </div>

            {experience.host_email && (
              <div className="mt-6 border-b border-zinc-100 dark:border-slate-800 pb-5">
                <h3 className="text-sm font-bold uppercase text-zinc-500 dark:text-slate-400 mb-3">{t('detail_host_info')}</h3>
                <HostProfileWidget email={experience.host_email} />
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 ${highlightClass(['max_guests', 'daily_capacity_max', 'daily_capacity'])}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">
                  <Users className="h-4 w-4 text-emerald-600" />
                  {t('detail_capacity')}
                </div>
                <div className="mt-2 text-base font-black text-zinc-950 dark:text-slate-50">
                  {Number(experience.daily_capacity_max ?? experience.daily_capacity ?? experience.max_guests ?? 50)} {t('detail_guests_day')}
                </div>
                <div className="text-xs text-zinc-500 dark:text-slate-400">
                  ({t('detail_total_max')} {Number(experience.max_guests || 50)} {t('detail_max_guests_tour')})
                </div>
              </div>
              <div className={`rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 ${highlightClass(['booking_open_date', 'booking_close_date'])}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  {t('detail_booking_open')}
                </div>
                <div className="mt-2 text-sm font-black text-zinc-950 dark:text-slate-50">
                  {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
                </div>
              </div>
              <div className={`rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 ${highlightClass(['allow_children', 'min_age', 'child_max_age', 'child_price'])}`}>
                <div className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('detail_child_policy')}</div>
                {experience.allow_children ? (
                  <div className="mt-2 text-xs font-bold text-zinc-700 dark:text-slate-200">
                    <span className="block">• {t('detail_age_from')} {experience.min_age || 0} {t('detail_age_to')}</span>
                    <span className="block">• {t('detail_child_discount')} ({experience.min_age || 0}-{experience.child_max_age || 12} {t('detail_age_to')}): {t('detail_discount')} {experience.child_price || 0}%</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs font-bold text-rose-600">
                    {t('detail_no_children')}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4">
                <div className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('detail_status')}</div>
                <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${isOpen ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                  {isOpen ? t('exp_title') : t('detail_tour_closed')}
                </div>
                {validSchedules.length > 0 ? (
                  <div className="mt-2 text-sm font-bold text-zinc-700 dark:text-slate-200">
                    {t('detail_available')} <span className="text-emerald-700">{validSchedules.reduce((acc, s) => acc + s.remaining_slots, 0)}</span> {t('detail_slots')}
                  </div>
                ) : availability ? (
                  <div className="mt-2 text-sm font-bold text-zinc-700 dark:text-slate-200">
                    {t('detail_available')} <span className="text-emerald-700">{availability.totalRemaining}</span> {t('detail_slots_total')}
                  </div>
                ) : null}
              </div>
            </div>

            {experience.status === 'pending_update' && experience.previous_state && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-black uppercase text-amber-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {t('host_update_detail')}
                </h3>
                <div className="text-sm text-amber-900 bg-white/80 backdrop-blur-lg dark:bg-slate-800/60 p-4 rounded-lg border border-amber-100 max-h-60 overflow-y-auto">
                  <ul className="list-disc pl-5 space-y-2">
                    {(() => {
                      try {
                        const oldState = JSON.parse(experience.previous_state);
                        const changes: React.ReactNode[] = [];
                        const ignoreKeys = ['id', 'status', 'previous_state'];

                        const fieldLabels: Record<string, string> = {
                          title: t('host_form_name'),
                          description: t('host_form_desc'),
                          price: t('host_table_price'),
                          location: t('host_form_location'),
                          duration: t('host_form_duration'),
                          category: t('host_form_category'),
                          max_guests: t('host_form_max_guests'),
                          daily_capacity: t('host_form_daily_max'),
                          daily_capacity_max: t('host_form_daily_max'),
                          booking_open_date: t('host_form_open_date'),
                          booking_close_date: t('host_form_close_date'),
                          registration_open_date: t('host_form_open_date'),
                          registration_close_date: t('host_form_close_date'),
                          allow_children: t('host_form_children'),
                          min_age: t('host_form_min_age'),
                          child_max_age: t('host_form_child_max_age'),
                          child_price: t('host_form_child_discount'),
                          rooms: t('host_form_rooms'),
                          beds: t('host_form_beds'),
                          amenities: t('host_form_amenities'),
                          image: t('host_form_image'),
                          images: t('host_form_gallery'),
                          is_active: t('detail_status') || 'Trạng thái hoạt động',
                        };

                        const formatValue = (key: string, val: any) => {
                          if (val === null || val === undefined || val === '') return t('host_empty');
                          if (typeof val === 'boolean') return val ? t('host_yes') : t('host_no');
                          if (key === 'price') return formatVnd(Number(val) || 0);
                          if (key.includes('date') && val) {
                            try {
                              const dateStr = formatDateVi(val);
                              if (dateStr) return dateStr;
                            } catch (e) { }
                          }
                          if (key === 'amenities' || key === 'images') {
                            try {
                              const parsed = JSON.parse(val);
                              if (Array.isArray(parsed)) return parsed.length > 0 ? parsed.join(', ') : t('host_empty');
                            } catch (e) { }
                          }
                          return String(val);
                        };

                        Object.keys(experience).forEach(key => {
                          if (ignoreKeys.includes(key)) return;
                          const oldVal = (oldState as any)[key];
                          const newVal = (experience as any)[key];
                          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                            const label = fieldLabels[key] || key;
                            changes.push(
                              <li key={key}>
                                {t('host_changed')} <strong>{label}</strong> {t('host_from')} <span className="line-through opacity-70">{formatValue(key, oldVal)}</span> {t('host_to')} <span className="font-semibold text-emerald-700">{formatValue(key, newVal)}</span>
                              </li>
                            );
                          }
                        });
                        if (changes.length === 0) return <li>{t('host_no_changes')}</li>;
                        return changes;
                      } catch (e) {
                        return <li>{t('host_err_old_version')}</li>;
                      }
                    })()}
                  </ul>
                </div>
              </div>
            )}

            {(experience.rooms || experience.beds) ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {experience.rooms ? (
                  <div className={`flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 ${highlightClass('rooms')}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('detail_rooms')}</div>
                      <div className="text-base font-black text-zinc-950 dark:text-slate-50">{experience.rooms} {lang === 'en' ? (experience.rooms > 1 ? t('detail_rooms') : t('detail_room')) : t('detail_rooms')}</div>
                    </div>
                  </div>
                ) : null}
                {experience.beds ? (
                  <div className={`flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 ${highlightClass('beds')}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Bed className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('detail_beds')}</div>
                      <div className="text-base font-black text-zinc-950 dark:text-slate-50">{experience.beds} {lang === 'en' ? (experience.beds > 1 ? t('detail_beds') : t('detail_bed')) : t('detail_beds')}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {parsedAmenities.length > 0 && (
              <div className={`mt-6 ${highlightClass('amenities')}`}>
                <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100 mb-3">{t('detail_amenities')}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {parsedAmenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {tDynamic(amenity)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validSchedules.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100 mb-3">{t('detail_schedules')}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {validSchedules.filter(s => s.remaining_slots > 0).slice(0, 4).map(schedule => (
                    <div key={schedule.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="text-sm font-bold text-emerald-900">
                          {formatDateVi(schedule.start_date)} - {formatDateVi(schedule.end_date)}
                        </div>
                        <div className="text-xs font-semibold text-emerald-700">
                          {t('detail_available')} {schedule.remaining_slots} {t('detail_slots')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsedImages.length > 0 && (
              <div className={`mt-6 ${highlightClass('images')}`}>
                <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100 mb-3">{t('detail_gallery')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {parsedImages.map((img, idx) => (
                    <img key={idx} src={img} alt={`${tDynamic(experience.title)} ${idx}`} className="h-32 w-full object-cover rounded-xl border border-zinc-200 dark:border-slate-700" />
                  ))}
                </div>
              </div>
            )}

            <div className={`mt-6 ${highlightClass('description')}`}>
              <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100 mb-3">{t('detail_description')}</h3>
              <div className="text-zinc-600 dark:text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap">
                {tDynamic(experience.description) || t('host_no_desc')}
              </div>
            </div>

            {experience.host_email && (
              <HostProfileWidget email={experience.host_email} />
            )}

            <div className="mt-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100 mb-3">{t('detail_map')}</h3>
              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-slate-700">
                <iframe
                  title={t('detail_map')}
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(tDynamic(experience.location))}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-zinc-100 dark:border-slate-800 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 dark:border-slate-700 px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-slate-900/50"
              >
                {t('detail_close')}
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
                {isOpen ? t('detail_book_now') : t('detail_tour_closed')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
