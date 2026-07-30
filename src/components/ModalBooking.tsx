/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, BadgeCheck, Calendar, MessageSquare, Phone, User, Users, X, Tag, Building2, CreditCard, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { ExperienceTable, TourScheduleTable, formatDateVi, formatVnd, todayIso } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ModalBookingProps {
  experience: ExperienceTable;
  userEmail: string;
  onClose: () => void;
  onBookingSuccess: () => void;
}

const phonePattern = /^(0|\+84)[0-9\s.-]{8,13}$/;

export default function ModalBooking({
  experience,
  userEmail,
  onClose,
  onBookingSuccess
}: ModalBookingProps) {
  const { t, tDynamic } = useLanguage();
  const today = todayIso();
  const maxGuests = Number(experience.daily_capacity_max ?? experience.daily_capacity ?? experience.max_guests ?? 50);
  const totalMaxGuests = Number(experience.max_guests || 50);
  const minBookingDate = experience.booking_open_date && experience.booking_open_date > today ? experience.booking_open_date : today;
  const maxBookingDate = experience.booking_close_date || '';
  const isBookableWindow = !maxBookingDate || maxBookingDate >= minBookingDate;
  const [bookingDate, setBookingDate] = useState(minBookingDate);
  const [adults, setAdults] = useState(Math.min(2, maxGuests));
  const [children, setChildren] = useState(0);
  const guests = adults + children;
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<TourScheduleTable[]>([]);
  const validSchedules = schedules.filter(s =>
    s.start_date >= experience.booking_open_date &&
    (!experience.booking_close_date || s.start_date <= experience.booking_close_date)
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | ''>('');
  const [availability, setAvailability] = useState<{ totalRemaining: number, dailyRemaining: number, isAvailable: boolean } | null>(null);

  useEffect(() => {
    if (schedules.length > 0) return;
    const fetchAvailability = async () => {
      try {
        const res = await fetch(`/api/experiences/${experience.id}/availability?date=${bookingDate}`, { cache: 'no-store' });
        const data = await res.json();
        if (!data.error) setAvailability(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAvailability();
  }, [experience.id, bookingDate, schedules.length]);

  useEffect(() => {
    fetch(`/api/schedules?experience_id=${experience.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSchedules(data);
      })
      .catch(console.error);
  }, [experience.id]);

  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [activePromo, setActivePromo] = useState<any>(null);

  const adultPrice = Number(experience.price || 0);
  const childDiscountPercent = experience.child_price !== undefined && experience.child_price !== null ? Number(experience.child_price) : 0;
  const childPrice = adultPrice * (1 - childDiscountPercent / 100);
  const basePrice = adults * adultPrice + children * childPrice;
  let discount = 0;
  if (activePromo) {
    if (activePromo.discount_percent) {
      discount = (basePrice * activePromo.discount_percent) / 100;
    } else if (activePromo.discount_amount) {
      discount = activePromo.discount_amount;
    }
  }
  const finalPrice = Math.max(0, basePrice - discount);

  const setAdultCount = (value: number) => {
    if (Number.isNaN(value)) return;
    setAdults(Math.min(maxGuests - children, Math.max(1, value)));
  };

  const setChildCount = (value: number) => {
    if (Number.isNaN(value)) return;
    setChildren(Math.min(maxGuests - adults, Math.max(0, value)));
  };

  const validate = () => {
    if (validSchedules.length > 0) {
      if (!selectedScheduleId) return t('booking_validate_schedule');
      const sched = validSchedules.find(s => s.id === selectedScheduleId);
      if (sched && sched.remaining_slots < guests) return t('booking_validate_schedule_slots').replace('{count}', String(sched.remaining_slots));
    } else {
      if (!isBookableWindow) return t('booking_validate_window');
      if (bookingDate < minBookingDate) return t('booking_validate_date_min');
      if (maxBookingDate && bookingDate > maxBookingDate) return t('booking_validate_date_max');
      if (availability) {
        if (!availability.isAvailable) return t('booking_validate_day_full');
        if (guests > availability.dailyRemaining) return t('booking_validate_daily_remaining').replace('{count}', String(availability.dailyRemaining));
        if (guests > availability.totalRemaining) return t('booking_validate_total_remaining').replace('{count}', String(availability.totalRemaining));
      }
    }

    if (guests > maxGuests) {
      return t('booking_validate_max_guests').replace('{count}', String(maxGuests));
    }

    if (contactName.trim().length < 2) {
      return t('booking_validate_contact');
    }

    if (!phonePattern.test(contactPhone.trim())) {
      return t('booking_validate_phone');
    }

    if (note.length > 300) {
      return t('booking_validate_note');
    }

    return null;
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoMessage(null);
    try {
      const res = await fetch('/api/promotions/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: promoCode.trim(), experience_id: experience.id })
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoMessage(data.error);
        setActivePromo(null);
      } else {
        setPromoMessage(t('booking_apply_success'));
        setActivePromo(data);
      }
    } catch (e: any) {
      setPromoMessage(t('error_generic'));
    }
  };

  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          user_email: userEmail,
          experience_id: experience.id,
          schedule_id: validSchedules.length > 0 ? selectedScheduleId : undefined,
          booking_date: validSchedules.length > 0 ? validSchedules.find(s => s.id === selectedScheduleId)?.start_date : bookingDate,
          guests, adults, children,
          contact_name: contactName.trim(), contact_phone: contactPhone.trim(),
          note: note.trim(), promo_code: promoCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('booking_submit_error'));
      onBookingSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =================== BOOKING FORM ===================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 dark:text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-slate-100"
          aria-label={t('detail_close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div className="hidden bg-zinc-950 md:block relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
              style={{ backgroundImage: `url(${experience.image})` }}
            />
            <img
              src={experience.image}
              alt={tDynamic(experience.title)}
              className="relative h-full min-h-75 w-full object-contain"
            />
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-5 pr-8">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                {t('exp_book')}
              </span>
              <h2 className="mt-3 text-2xl font-black leading-tight text-zinc-950 dark:text-slate-50">{tDynamic(experience.title)}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
                {tDynamic(experience.location)} · {formatVnd(experience.price)} / {t('booking_per_guest')}
              </p>
              <div className="mt-3 grid gap-2 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-3 text-xs font-bold text-zinc-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  {t('booking_max_daily')} {maxGuests} {t('booking_guests_day')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  {t('booking_max_total')} {totalMaxGuests} {t('booking_guests_total')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  {t('detail_booking_open')}: {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
                </span>
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><User className="inline h-3 w-3" /> {t('booking_contact_name')}</span>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={t('booking_contact_name_ph')}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><Phone className="inline h-3 w-3" /> {t('booking_phone')}</span>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    required
                  />
                </label>
              </div>

              {validSchedules.length > 0 ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><Calendar className="inline h-3 w-3" /> {t('booking_select_schedule')}</span>
                  <select
                    value={selectedScheduleId}
                    onChange={(e) => setSelectedScheduleId(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">{t('booking_select_schedule_ph')}</option>
                    {validSchedules.map(s => (
                      <option key={s.id} value={s.id}>
                        {formatDateVi(s.start_date)} → {formatDateVi(s.end_date)} ({s.remaining_slots} {t('booking_slot_left')})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><Calendar className="inline h-3 w-3" /> {t('booking_departure_date')}</span>
                  <input
                    type="date"
                    value={bookingDate}
                    min={minBookingDate}
                    max={maxBookingDate || undefined}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    required
                  />
                </label>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><Users className="inline h-3 w-3" /> {t('booking_adults')}</span>
                  <input
                    type="number" min="1" max={maxGuests}
                    value={adults}
                    onChange={(e) => setAdultCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
                {experience.allow_children !== false && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><Users className="inline h-3 w-3" /> {t('booking_children')} {experience.child_max_age ? `(${t('booking_children_under')} ${experience.child_max_age} ${t('detail_age_to')})` : ''}</span>
                    <input
                      type="number" min="0" max={maxGuests - adults}
                      value={children}
                      onChange={(e) => setChildCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300"><MessageSquare className="inline h-3 w-3" /> {t('booking_note')}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={t('booking_note_ph')}
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              {/* Promo code */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder={t('booking_promo')}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!promoCode.trim()) return;
                    try {
                      const res = await fetch(`/api/promotions/validate?code=${encodeURIComponent(promoCode.trim())}&experience_id=${experience.id}`);
                      const data = await res.json();
                      if (!res.ok || data.error) {
                        setPromoMessage(data.error || t('booking_invalid_promo'));
                        setActivePromo(null);
                      } else {
                        setPromoMessage(t('booking_apply_success'));
                        setActivePromo(data);
                      }
                    } catch {
                      setPromoMessage(t('error_generic'));
                    }
                  }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  {t('booking_apply')}
                </button>
              </div>
              {promoMessage && (
                <p className={`text-xs font-semibold ${activePromo ? 'text-emerald-600' : 'text-red-500'}`}>{promoMessage}</p>
              )}

              {/* Price summary */}
              <div className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between text-zinc-600 dark:text-slate-300">
                  <span>{adults} {t('booking_adult_unit')} × {formatVnd(adultPrice)}</span>
                  <span>{formatVnd(adults * adultPrice)}</span>
                </div>
                {children > 0 && (
                  <div className="flex justify-between text-zinc-600 dark:text-slate-300">
                    <span>{children} {t('booking_child_unit')} × {formatVnd(childPrice)}</span>
                    <span>{formatVnd(children * childPrice)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{t('booking_discount')}</span>
                    <span>-{formatVnd(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-zinc-900 dark:text-slate-50 border-t border-zinc-200 dark:border-slate-700 pt-1 mt-1">
                  <span>{t('booking_total_due')}</span>
                  <span className="text-xl font-black">{formatVnd(finalPrice)}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-slate-900/50 sm:w-1/3"
                >
                  {t('booking_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !isBookableWindow ||
                    (validSchedules.length === 0 && availability && (!availability.isAvailable || guests > availability.dailyRemaining || guests > availability.totalRemaining))
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400 sm:w-2/3"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (!isBookableWindow && validSchedules.length === 0) ? (
                    <><BadgeCheck className="h-4 w-4" />{t('booking_closed')}</>
                  ) : (validSchedules.length === 0 && availability && !availability.isAvailable) ? (
                    <><X className="h-4 w-4" />{t('exp_full')}</>
                  ) : (
                    <><BadgeCheck className="h-4 w-4" />{t('booking_confirm')}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
