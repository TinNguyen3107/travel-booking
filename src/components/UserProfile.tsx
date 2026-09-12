import React, { useEffect, useState } from 'react';
import { User, Calendar, History, Shield, Save, XCircle, Heart, MapPin, Clock, Star, X, LifeBuoy } from 'lucide-react';
import { BookingTable, formatVnd, ExperienceTable, SupportTicketTable } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export default function UserProfile({ user, onClose, onProfileUpdated }: { user: { email: string, fullname: string }, onClose: () => void, onProfileUpdated?: (updatedUser: any) => void }) {
  const { t, tCategory, tDynamic } = useLanguage();
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'cancelled' | 'wishlists' | 'support'>('info');
  const [bookings, setBookings] = useState<BookingTable[]>([]);
  const [wishlistDetails, setWishlistDetails] = useState<ExperienceTable[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketTable[]>([]);
  const [supportForm, setSupportForm] = useState({ booking_id: '', subject: '', message: '', priority: 'normal' });
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    fullname: '',
    phone: '',
    address: '',
    avatar: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/profile', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setProfile(data);
          setForm({
            fullname: data.fullname || '',
            phone: data.phone || '',
            address: data.address || '',
            avatar: data.avatar || ''
          });
        }
      })
      .finally(() => setLoading(false));

    fetch('/api/users/history', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setBookings(data);
      });

    fetch('/api/wishlists/details', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWishlistDetails(data);
      });

    fetch('/api/support-tickets', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      cache: 'no-store'
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSupportTickets(data);
      });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fullname: form.fullname,
          phone: form.phone,
          address: form.address,
          avatar: form.avatar
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user && onProfileUpdated) {
          onProfileUpdated(data.user);
        }
        alert('Cập nhật hồ sơ thành công!');
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra khi cập nhật.');
      }
    } catch {
      alert('Lỗi kết nối mạng, vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn tour này?')) return;
    try {
      const res = await fetch(`/api/users/bookings/${id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi khi hủy đơn');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleRemoveWishlist = async (experienceId: number) => {
    try {
      const res = await fetch('/api/wishlists/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ experience_id: experienceId })
      });
      if (res.ok) {
        setWishlistDetails(wishlistDetails.filter(w => w.id !== experienceId));
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          booking_id: Number(supportForm.booking_id),
          subject: supportForm.subject,
          message: supportForm.message,
          priority: supportForm.priority
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Khong the gui yeu cau ho tro');
        return;
      }
      setSupportTickets([data, ...supportTickets]);
      setSupportForm({ booking_id: '', subject: '', message: '', priority: 'normal' });
      alert('Da gui yeu cau ho tro');
    } catch {
      alert('Loi ket noi khi gui yeu cau ho tro');
    }
  };

  const renderStatus = (status: string) => {
    const map: any = {
      pending: <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">{t('booking_status_pending')}</span>,
      confirmed: <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">{t('booking_status_confirmed')}</span>,
      checked_in: <span className="bg-sky-100 text-sky-800 px-2 py-1 rounded text-xs font-bold">{t('booking_status_checked_in')}</span>,
      completed: <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">{t('booking_status_completed')}</span>,
      no_show: <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">{t('booking_status_no_show')}</span>,
      cancelled: <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">{t('booking_status_cancelled')}</span>
    };
    return map[status] || status;
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 dark:text-slate-400">{t('loading')}</div>;

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm overflow-y-auto py-10">
      <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 overflow-hidden shadow-2xl my-auto">
        <div className="flex border-b border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'info' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-900/50'}`}
          >
            <User className="h-4 w-4" />
            {t('profile_title')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-900/50'}`}
          >
            <History className="h-4 w-4" />
            {t('profile_bookings')} ({activeBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'cancelled' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-900/50'}`}
          >
            <XCircle className="h-4 w-4" />
            {t('profile_cancelled')} ({cancelledBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('wishlists')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'wishlists' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-900/50'}`}
          >
            <Heart className="h-4 w-4" />
            {t('profile_favorites')} ({wishlistDetails.length})
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'support' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-900/50'}`}
          >
            <LifeBuoy className="h-4 w-4" />
            Ho tro ({supportTickets.length})
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center px-6 text-zinc-400 dark:text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <form onSubmit={handleUpdate} className="max-w-xl mx-auto space-y-4">
              <div className="flex justify-center mb-6">
                <img
                  src={form.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || 'User')}&background=10b981&color=fff&size=256`}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 uppercase mb-1">{t('profile_email_fixed')}</label>
                <input type="text" value={user.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 text-zinc-500 dark:text-slate-400" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 uppercase mb-1">{t('profile_fullname')}</label>
                <input type="text" value={form.fullname} onChange={e => setForm({ ...form, fullname: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 focus:border-emerald-500 outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 uppercase mb-1">{t('profile_phone')}</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 uppercase mb-1">{t('profile_avatar')}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        setSaving(true);
                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                          body: formData
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setForm(f => ({ ...f, avatar: data.url }));
                        } else {
                          alert(data.error || 'Lỗi upload ảnh');
                        }
                      } catch {
                        alert('Lỗi kết nối khi upload');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 focus:border-emerald-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 uppercase mb-1">{t('profile_address')}</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 focus:border-emerald-500 outline-none" />
              </div>



              <button type="submit" disabled={saving} className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {saving ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {t('profile_save')}
              </button>
            </form>
          )}

          {(activeTab === 'history' || activeTab === 'cancelled') && (
            <div className="space-y-4">
              {activeTab === 'history' && activeBookings.length === 0 && (
                <div className="text-center py-10 text-zinc-500 dark:text-slate-400">{t('profile_no_cancelled')}</div>
              )}
              {activeTab === 'cancelled' && cancelledBookings.length === 0 && (
                <div className="text-center py-10 text-zinc-500 dark:text-slate-400">{t('profile_no_cancelled')}</div>
              )}

              {(activeTab === 'history' ? activeBookings : cancelledBookings).map(booking => (
                <div key={booking.id} className="border border-zinc-200 dark:border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div>
                    <h4 className="font-black text-lg text-zinc-900 dark:text-slate-100">{tDynamic(booking.experience_title)}</h4>
                    <div className="text-sm font-medium text-zinc-500 dark:text-slate-400 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {t('profile_booking_date')} {booking.booking_date}</span>
                      <span>•</span>
                      <span>{booking.guests} {t('profile_guests')}</span>
                    </div>
                    {booking.payment_status && (
                      <div className="text-xs font-semibold text-zinc-500 dark:text-slate-400 mt-2">
                        {t('profile_payment')} <span className={booking.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{t(booking.payment_status === 'paid' ? 'booking_payment_paid' : 'booking_payment_unpaid').toUpperCase()}</span>
                        {booking.refund_status && booking.refund_status !== 'none' && ` | ${t('booking_payment_refunded').toUpperCase()}`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                    <div className="font-black text-emerald-700 text-xl">{formatVnd(booking.total_price)}</div>
                    <div className="flex items-center gap-3">
                      {renderStatus(booking.status)}
                      {['pending', 'confirmed'].includes(booking.status) && activeTab === 'history' && (
                        <button onClick={() => handleCancelBooking(booking.id)} className="text-xs font-bold text-red-600 hover:underline">{t('booking_cancel')}</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'wishlists' && (
            <div className="space-y-4">
              {wishlistDetails.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 dark:text-slate-400">{t('profile_no_wishlists') || 'Bạn chưa có tour yêu thích nào.'}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {wishlistDetails.map(experience => (
                    <article key={experience.id} className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-sm">
                      <div className="relative">
                        <img
                          src={experience.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'}
                          alt={experience.title}
                          className="h-40 w-full object-cover"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-white/80 backdrop-blur-lg dark:bg-slate-800/95 px-2 py-1 text-xs font-black text-emerald-700">
                          {tCategory(experience.category)}
                        </span>
                        <button
                          onClick={() => handleRemoveWishlist(experience.id)}
                          className="absolute right-3 top-3 rounded-full bg-white/80 backdrop-blur-lg dark:bg-slate-800/90 p-2 text-rose-500 hover:bg-rose-50"
                          title="Bỏ yêu thích"
                        >
                          <Heart className="h-4 w-4 fill-rose-500" />
                        </button>
                      </div>
                      <div className="flex flex-col flex-1 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-600" />{tDynamic(experience.location)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-emerald-600" />{tDynamic(experience.duration)}</span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-black text-zinc-950 dark:text-slate-50">{tDynamic(experience.title)}</h3>
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 dark:border-slate-800 pt-3">
                          <span className="text-sm font-black text-emerald-700">{formatVnd(experience.price)}</span>
                          <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {Number(experience.rating || 0).toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <form onSubmit={handleCreateSupportTicket} className="space-y-4 rounded-xl border border-zinc-200 dark:border-slate-700 p-4">
                <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100">Gui yeu cau ho tro</h3>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">Don tour</span>
                  <select
                    value={supportForm.booking_id}
                    onChange={e => setSupportForm({ ...supportForm, booking_id: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">Chon don can ho tro</option>
                    {bookings.map(booking => (
                      <option key={booking.id} value={booking.id}>#{booking.id} - {booking.experience_title || 'Tour'} - {booking.booking_date}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">Tieu de</span>
                  <input
                    value={supportForm.subject}
                    onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500"
                    placeholder="VD: Can doi gio tap trung"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">Noi dung</span>
                  <textarea
                    value={supportForm.message}
                    onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                    rows={5}
                    className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500"
                    placeholder="Mo ta van de de host/admin nam duoc boi canh..."
                    required
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={supportForm.priority === 'urgent'}
                    onChange={e => setSupportForm({ ...supportForm, priority: e.target.checked ? 'urgent' : 'normal' })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Can xu ly gap
                </label>
                <button className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                  Gui ho tro
                </button>
              </form>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-zinc-900 dark:text-slate-100">Yeu cau da gui</h3>
                {supportTickets.map(ticket => (
                  <div key={ticket.id} className="rounded-xl border border-zinc-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-zinc-900 dark:text-slate-100">#{ticket.id} - {ticket.subject}</div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-slate-400">Don #{ticket.booking_id} - {ticket.experience_title || 'Tour'}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ticket.priority === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {ticket.priority === 'urgent' ? 'Gap' : 'Thuong'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-600 dark:text-slate-300">{ticket.message}</p>
                    <div className="mt-3 text-xs font-bold text-zinc-500 dark:text-slate-400">Trang thai: {ticket.status}</div>
                    {ticket.admin_note && <div className="mt-2 rounded-lg bg-zinc-50 dark:bg-slate-900 p-3 text-sm text-zinc-600 dark:text-slate-300">Admin: {ticket.admin_note}</div>}
                  </div>
                ))}
                {supportTickets.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-300 dark:border-slate-700 p-8 text-center text-sm text-zinc-500 dark:text-slate-400">Chua co yeu cau ho tro nao.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
