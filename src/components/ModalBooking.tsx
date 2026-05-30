/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertCircle, BadgeCheck, Calendar, MessageSquare, Phone, User, Users, X, Tag } from 'lucide-react';
import { ExperienceTable, formatVnd } from '../types';

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
  const today = new Date().toISOString().slice(0, 10);
  const [bookingDate, setBookingDate] = useState(today);
  const [guests, setGuests] = useState(2);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [activePromo, setActivePromo] = useState<any>(null);

  const basePrice = guests * Number(experience.price || 0);
  let discount = 0;
  if (activePromo) {
    if (activePromo.discount_percent) {
      discount = (basePrice * activePromo.discount_percent) / 100;
    } else if (activePromo.discount_amount) {
      discount = activePromo.discount_amount;
    }
  }
  const finalPrice = Math.max(0, basePrice - discount);

  const setGuestCount = (value: number) => {
    if (Number.isNaN(value)) return;
    setGuests(Math.min(50, Math.max(1, value)));
  };

  const validate = () => {
    if (bookingDate < today) {
      return 'Ngày đặt tour không được ở trong quá khứ';
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() })
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          experience_id: experience.id,
          booking_date: bookingDate,
          guests,
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
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
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
              <h2 className="mt-3 text-2xl font-black leading-tight text-zinc-950">{experience.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {experience.location} · {formatVnd(experience.price)} / khách
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">Ngày đi</span>
                  <span className="relative block">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="date"
                      min={today}
                      value={bookingDate}
                      onChange={(event) => setBookingDate(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">Số khách</span>
                  <span className="flex h-10.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => setGuestCount(guests - 1)}
                      className="h-8 w-9 rounded-lg bg-white text-sm font-black text-zinc-700 shadow-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={guests}
                      onChange={(event) => setGuestCount(Number(event.target.value))}
                      className="min-w-0 flex-1 bg-transparent text-center text-sm font-black outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestCount(guests + 1)}
                      className="h-8 w-9 rounded-lg bg-white text-sm font-black text-zinc-700 shadow-sm"
                    >
                      +
                    </button>
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">
                    Người liên hệ
                  </span>
                  <span className="relative block">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                      placeholder="Nguyễn Văn A"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">
                    Số điện thoại
                  </span>
                  <span className="relative block">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                      placeholder="09xx xxx xxx"
                    />
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">
                  Ghi chú
                </span>
                <span className="relative block">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={300}
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                    placeholder="Yêu cầu đón trả, ăn uống, trẻ em đi cùng..."
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-600">
                  Mã giảm giá
                </span>
                <span className="relative flex gap-2">
                  <span className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
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
                  <div className="flex items-center justify-between text-sm font-bold text-zinc-500">
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
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 sm:w-1/3"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400 sm:w-2/3"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
