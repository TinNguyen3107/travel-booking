/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, BadgeCheck, Calendar, MessageSquare, Phone, User, Users, X, Tag } from 'lucide-react';
import { ExperienceTable, TourScheduleTable, formatDateVi, formatVnd, todayIso } from '../types';

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
      if (!selectedScheduleId) return 'Vui lòng chọn lịch trình';
      const sched = validSchedules.find(s => s.id === selectedScheduleId);
      if (sched && sched.remaining_slots < guests) return `Lịch trình này chỉ còn ${sched.remaining_slots} chỗ`;
    } else {
      if (!isBookableWindow) return 'Tour này đã hết thời gian nhận đặt';
      if (bookingDate < minBookingDate) return 'Ngày đi phải nằm trong thời gian tour đang nhận đặt';
      if (maxBookingDate && bookingDate > maxBookingDate) return 'Ngày đi đã vượt quá ngày đóng nhận đặt của tour';
      if (availability) {
        if (!availability.isAvailable) return 'Tour này đã hết chỗ trong ngày được chọn.';
        if (guests > availability.dailyRemaining) return `Tour này chỉ còn ${availability.dailyRemaining} chỗ trong ngày này.`;
        if (guests > availability.totalRemaining) return `Tour này chỉ còn ${availability.totalRemaining} chỗ tổng cộng.`;
      }
    }

    if (guests > maxGuests) {
      return `Tour này chỉ nhận tối đa ${maxGuests} khách cho một ngày`;
    }

    if (contactName.trim().length < 2) {
      return 'Tên người liên hệ cần tối thiểu 2 ký tự';
    }

    if (!phonePattern.test(contactPhone.trim())) {
      return 'Số điện thoại không hợp lệ';
    }

    if (note.length > 300) {
      return 'Ghi chú tối đa 300 ký tự';
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
        setPromoMessage('Áp dụng mã thành công!');
        setActivePromo(data);
      }
    } catch (e: any) {
      setPromoMessage('Có lỗi xảy ra');
    }
  };

  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_email: userEmail,
          experience_id: experience.id,
          schedule_id: validSchedules.length > 0 ? selectedScheduleId : undefined,
          booking_date: validSchedules.length > 0 ? validSchedules.find(s => s.id === selectedScheduleId)?.start_date : bookingDate,
          guests,
          adults,
          children,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          note: note.trim(),
          promo_code: promoCode.trim()
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đặt tour thất bại, vui lòng thử lại');
      }

      alert('Đặt tour thành công. Đơn của bạn đang chờ xác nhận.');
      onBookingSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 dark:text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-slate-100"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div className="hidden bg-zinc-950 md:block relative overflow-hidden">
            {/* Blurred background */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
              style={{ backgroundImage: `url(${experience.image})` }}
            />
            {/* Main image */}
            <img
              src={experience.image}
              alt={experience.title}
              className="relative h-full min-h-[300px] w-full object-contain"
            />
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-5 pr-8">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                Đặt tour
              </span>
              <h2 className="mt-3 text-2xl font-black leading-tight text-zinc-950 dark:text-slate-50">{experience.title}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
                {experience.location} · {formatVnd(experience.price)} / khách
              </p>
              <div className="mt-3 grid gap-2 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-3 text-xs font-bold text-zinc-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  Tối đa {maxGuests} khách/ngày
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Tối đa {totalMaxGuests} khách toàn tour
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  Nhận đặt: {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
                </span>
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">Ngày đi</span>
                  <span className="relative block">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                    {validSchedules.length > 0 ? (
                      <select
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(Number(e.target.value) || '')}
                        className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                      >
                        <option value="">-- Chọn lịch trình --</option>
                        {validSchedules.filter(s => s.remaining_slots >= guests).map(s => (
                          <option key={s.id} value={s.id}>
                            {formatDateVi(s.start_date)} - {formatDateVi(s.end_date)} (Còn {s.remaining_slots} chỗ)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="date"
                        min={minBookingDate}
                        max={maxBookingDate || undefined}
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                      />
                    )}
                  </span>
                  {validSchedules.length === 0 && availability && (
                    <div className="mt-2 grid gap-1 text-xs font-bold text-zinc-500 dark:text-slate-400">
                      <span className={availability.dailyRemaining > 0 ? 'text-emerald-600' : 'text-rose-500'}>
                        • Còn {availability.dailyRemaining} chỗ trong ngày này
                      </span>
                      <span className={availability.totalRemaining > 0 ? 'text-blue-600' : 'text-rose-500'}>
                        • Còn {availability.totalRemaining} chỗ của toàn tour
                      </span>
                    </div>
                  )}
                </label>

                {experience.allow_children ? (
                  <div className="grid gap-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">Người lớn</span>
                      <span className="flex h-10.5 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-1">
                        <button type="button" onClick={() => setAdultCount(adults - 1)} className="h-8 w-9 rounded-lg bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm font-black text-zinc-700 dark:text-slate-200 shadow-sm">-</button>
                        <input type="number" min={1} max={maxGuests - children} value={adults} onChange={(event) => setAdultCount(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-center text-sm font-black outline-none" />
                        <button type="button" onClick={() => setAdultCount(adults + 1)} className="h-8 w-9 rounded-lg bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm font-black text-zinc-700 dark:text-slate-200 shadow-sm">+</button>
                      </span>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">Trẻ em ({experience.min_age} - {experience.child_max_age} tuổi)</span>
                      <span className="flex h-10.5 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-1">
                        <button type="button" onClick={() => setChildCount(children - 1)} className="h-8 w-9 rounded-lg bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm font-black text-zinc-700 dark:text-slate-200 shadow-sm">-</button>
                        <input type="number" min={0} max={maxGuests - adults} value={children} onChange={(event) => setChildCount(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-center text-sm font-black outline-none" />
                        <button type="button" onClick={() => setChildCount(children + 1)} className="h-8 w-9 rounded-lg bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm font-black text-zinc-700 dark:text-slate-200 shadow-sm">+</button>
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">Số khách</span>
                    <span className="flex h-10.5 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-1">
                      <button type="button" onClick={() => setAdultCount(adults - 1)} className="h-8 w-9 rounded-lg bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm font-black text-zinc-700 dark:text-slate-200 shadow-sm">-</button>
                      <input type="number" min={1} max={maxGuests} value={adults} onChange={(event) => setAdultCount(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-center text-sm font-black outline-none" />
                      <button type="button" onClick={() => setAdultCount(adults + 1)} className="h-8 w-9 rounded-lg bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm font-black text-zinc-700 dark:text-slate-200 shadow-sm">+</button>
                    </span>
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">
                    Người liên hệ
                  </span>
                  <span className="relative block">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                    <input
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                      placeholder="Nguyễn Văn A"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">
                    Số điện thoại
                  </span>
                  <span className="relative block">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                    <input
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                      placeholder="09xx xxx xxx"
                    />
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">
                  Ghi chú
                </span>
                <span className="relative block">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-slate-500" />
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={300}
                    className="w-full resize-none rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                    placeholder="Yêu cầu đón trả, ăn uống, trẻ em đi cùng..."
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600 dark:text-slate-300">
                  Mã giảm giá
                </span>
                <span className="relative flex gap-2">
                  <span className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
                    <input
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                      placeholder="Nhập mã khuyến mãi"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-700"
                  >
                    Áp dụng
                  </button>
                </span>
                {promoMessage && (
                  <div className={`mt-2 text-xs font-bold ${activePromo ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {promoMessage}
                  </div>
                )}
              </label>

              <div className="flex flex-col gap-1 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                {activePromo && (
                  <div className="flex items-center justify-between text-sm font-bold text-zinc-500 dark:text-slate-400">
                    <span>Tạm tính</span>
                    <span className="line-through">{formatVnd(basePrice)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-emerald-900">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    <span>Tổng thanh toán</span>
                  </div>
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
                  Hủy
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
                    <>
                      <BadgeCheck className="h-4 w-4" />
                      Tour đã đóng
                    </>
                  ) : (validSchedules.length === 0 && availability && !availability.isAvailable) ? (
                    <>
                      <X className="h-4 w-4" />
                      Hết chỗ
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="h-4 w-4" />
                      Xác nhận đặt tour
                    </>
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
