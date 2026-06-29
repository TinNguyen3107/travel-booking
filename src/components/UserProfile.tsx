import React, { useEffect, useState } from 'react';
import { User, Calendar, History, Shield, Save, XCircle, Heart, MapPin, Clock, Star, X } from 'lucide-react';
import { BookingTable, formatVnd, ExperienceTable } from '../types';

export default function UserProfile({ user, onClose }: { user: { email: string, fullname: string }, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'cancelled' | 'wishlists'>('info');
  const [bookings, setBookings] = useState<BookingTable[]>([]);
  const [wishlistDetails, setWishlistDetails] = useState<ExperienceTable[]>([]);
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
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setBookings(data);
      });

    fetch('/api/wishlists/details', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWishlistDetails(data);
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
        alert('Cập nhật hồ sơ thành công!');
      } else {
        alert('Có lỗi xảy ra khi cập nhật.');
      }
    } catch {
      alert('Lỗi kết nối.');
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

  const renderStatus = (status: string) => {
    const map: any = {
      pending: <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">Chờ duyệt</span>,
      confirmed: <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">Đã xác nhận</span>,
      cancelled: <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Đã hủy</span>
    };
    return map[status] || status;
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Đang tải...</div>;

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm overflow-y-auto py-10">
      <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xl my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-zinc-600 shadow-sm backdrop-blur-md hover:bg-white hover:text-zinc-950"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      <div className="flex border-b border-zinc-200 mt-12 sm:mt-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'info' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 hover:bg-zinc-50'}`}
        >
          <User className="h-4 w-4" />
          Thông tin cá nhân
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 hover:bg-zinc-50'}`}
        >
          <History className="h-4 w-4" />
          Đơn đã đặt ({activeBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'cancelled' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 hover:bg-zinc-50'}`}
        >
          <XCircle className="h-4 w-4" />
          Đơn đã hủy ({cancelledBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('wishlists')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'wishlists' ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'text-zinc-500 hover:bg-zinc-50'}`}
        >
          <Heart className="h-4 w-4" />
          Yêu thích ({wishlistDetails.length})
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
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Email (Không đổi)</label>
              <input type="text" value={user.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Họ tên</label>
              <input type="text" value={form.fullname} onChange={e => setForm({...form, fullname: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 outline-none" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Số điện thoại</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Tải ảnh đại diện</label>
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
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-emerald-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Địa chỉ</label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 outline-none" />
            </div>



            <button type="submit" disabled={saving} className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
              <Save className="h-5 w-5" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        )}

        {(activeTab === 'history' || activeTab === 'cancelled') && (
          <div className="space-y-4">
            {activeTab === 'history' && activeBookings.length === 0 && (
              <div className="text-center py-10 text-zinc-500">Bạn chưa có đơn đặt tour nào.</div>
            )}
            {activeTab === 'cancelled' && cancelledBookings.length === 0 && (
              <div className="text-center py-10 text-zinc-500">Bạn chưa hủy đơn tour nào.</div>
            )}
            
            {(activeTab === 'history' ? activeBookings : cancelledBookings).map(booking => (
              <div key={booking.id} className="border border-zinc-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                  <h4 className="font-black text-lg text-zinc-900">{booking.experience_title}</h4>
                  <div className="text-sm font-medium text-zinc-500 mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Ngày đặt: {booking.booking_date}</span>
                    <span>•</span>
                    <span>{booking.guests} khách</span>
                  </div>
                  {booking.payment_status && (
                     <div className="text-xs font-semibold text-zinc-500 mt-2">
                       Thanh toán: <span className={booking.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{booking.payment_status.toUpperCase()}</span>
                       {booking.refund_status && booking.refund_status !== 'none' && ` | Hoàn tiền: ${booking.refund_status.toUpperCase()}`}
                     </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <div className="font-black text-emerald-700 text-xl">{formatVnd(booking.total_price)}</div>
                  <div className="flex items-center gap-3">
                    {renderStatus(booking.status)}
                    {booking.status === 'pending' && activeTab === 'history' && (
                      <button onClick={() => handleCancelBooking(booking.id)} className="text-xs font-bold text-red-600 hover:underline">Hủy đơn</button>
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
              <div className="text-center py-10 text-zinc-500">Bạn chưa có tour yêu thích nào.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wishlistDetails.map(experience => (
                  <article key={experience.id} className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="relative">
                      <img
                        src={experience.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'}
                        alt={experience.title}
                        className="h-40 w-full object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 text-xs font-black text-emerald-700">
                        {experience.category}
                      </span>
                      <button
                        onClick={() => handleRemoveWishlist(experience.id)}
                        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-rose-500 hover:bg-rose-50"
                        title="Bỏ yêu thích"
                      >
                        <Heart className="h-4 w-4 fill-rose-500" />
                      </button>
                    </div>
                    <div className="flex flex-col flex-1 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-600" />{experience.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-emerald-600" />{experience.duration}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-black text-zinc-950">{experience.title}</h3>
                      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
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
      </div>
    </div>
    </div>
  );
}
