/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Edit2,
  FileCheck2,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  Calendar,
  TrendingUp,
  Bell,
  X,
  Eye
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import {
  BookingTable,
  ExperienceTable,
  formatDateVi,
  formatVnd,
  HostApplicationTable,
  isExperienceOpen,
  todayIso,
  UserTable
} from '../types';
import ModalConfirm, { ConfirmConfig } from './ModalConfirm';
import ModalExperienceDetail from './ModalExperienceDetail';
import ScheduleManager from './ScheduleManager';

interface HostDashboardProps {
  onExperiencesChange: () => void;
  activeSection: string;
  currentUser?: any;
}

type HostTab = 'overview' | 'experiences' | 'bookings' | 'profile' | 'reviews';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop';

const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const EMPTY_FORM = {
  title: '',
  location: '',
  duration: '',
  price: 890000,
  image: '',
  category: 'Thiên nhiên',
  description: '',
  max_guests: 50,
  daily_capacity_max: 50,
  booking_open_date: todayIso(),
  booking_close_date: addDaysIso(90),
  rooms: 0,
  beds: 0,
  amenities: '',
  images: ''
};

const statusLabels: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  suspended: 'Đã tạm khóa'
};

const statusClass = (status: string) => {
  if (status === 'confirmed' || status === 'approved') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (status === 'cancelled' || status === 'rejected') {
    return 'bg-red-50 text-red-700 border-red-100';
  }
  if (status === 'suspended') {
    return 'bg-orange-50 text-orange-700 border-orange-100';
  }
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

export default function HostDashboard({ onExperiencesChange, activeSection, currentUser }: HostDashboardProps) {
  const [activeTab, setActiveTab] = useState<HostTab>('overview');
  const [experiences, setExperiences] = useState<ExperienceTable[]>([]);
  const [bookings, setBookings] = useState<BookingTable[]>([]);
  const [hosts, setHosts] = useState<HostApplicationTable[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewExperienceDetail, setViewExperienceDetail] = useState<ExperienceTable | null>(null);
  const [scheduleExperience, setScheduleExperience] = useState<ExperienceTable | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', id_number: '', experience_location: '', description: '' });
  const [isProfileInitialized, setIsProfileInitialized] = useState(false);
  const [evaluatingBooking, setEvaluatingBooking] = useState<BookingTable | null>(null);
  const [hostReviewForm, setHostReviewForm] = useState({ rating: 5, comment: '' });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'experiences', label: 'Quản lý Tour' },
    { id: 'bookings', label: 'Đơn đặt tour' },
    { id: 'reviews', label: 'Đánh giá' },
    { id: 'profile', label: 'Hồ sơ cá nhân' }
  ];

  const categories = useMemo(
    () => Array.from(new Set(dbCategories.map(c => c.name))),
    [dbCategories]
  );

  const filteredExperiences = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return experiences.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesKeyword =
        !keyword ||
        [item.title, item.location, item.category].some((value) =>
          value.toLowerCase().includes(keyword)
        );

      return matchesCategory && matchesKeyword && isExperienceOpen(item);
    });
  }, [experiences, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length;
    const confirmedRevenue = bookings
      .filter((booking) => booking.status === 'confirmed')
      .reduce((sum, booking) => sum + Number(booking.host_earnings || 0), 0);

    // Prepare revenue data for the chart (daily revenue)
    const revenueByDate: Record<string, number> = {};
    bookings
      .filter(b => b.status === 'confirmed')
      .forEach(b => {
        const date = new Date(b.created_at || new Date()).toISOString().split('T')[0];
        if (!revenueByDate[date]) revenueByDate[date] = 0;
        revenueByDate[date] += Number(b.host_earnings || 0);
      });

    // Get last 7 days including days with 0 revenue
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
      chartData.push({
        name: displayDate,
        revenue: revenueByDate[dateStr] || 0
      });
    }

    return {
      tours: experiences.length,
      reviews: reviews.length,
      pendingBookings,
      confirmedRevenue,
      chartData
    };
  }, [bookings, experiences, reviews]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!isProfileInitialized && hosts.length > 0 && currentUser) {
      const currentHost = hosts.find(h => h.email === currentUser.email);
      if (currentHost) {
        setProfileForm({
          name: currentHost.name,
          phone: currentHost.phone,
          address: currentHost.address,
          id_number: currentHost.id_number,
          experience_location: currentHost.experience_location,
          description: currentHost.description
        });
        setIsProfileInitialized(true);
      }
    }
  }, [hosts, currentUser, isProfileInitialized]);

  const fetchJson = async <T,>(url: string, options?: RequestInit): Promise<T> => {
    const headers = {
      ...options?.headers,
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Không thể đọc dữ liệu');
    }

    return data;
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const isAdmin = currentUser?.role === 'admin';
      const [experienceData, bookingsData, categoryData, reviewsData, hostsData] = await Promise.all([
        fetchJson<ExperienceTable[]>('/api/experiences'),
        fetchJson<BookingTable[]>(`/api/bookings?role=${currentUser?.role}&email=${encodeURIComponent(currentUser?.email)}`),
        fetchJson<{ id: number; name: string }[]>('/api/categories'),
        fetchJson<any[]>('/api/reviews'),
        isAdmin ? fetchJson<HostApplicationTable[]>('/api/hosts') : Promise.resolve([])
      ]);

      const hostExperiences = isAdmin ? (experienceData || []) : (experienceData || []).filter(e => e.host_email === currentUser?.email);
      setExperiences(hostExperiences);
      setBookings(bookingsData || []);
      setHosts(hostsData || []);
      setDbCategories(categoryData || []);
      setReviews((reviewsData || []).filter((r: any) => hostExperiences.some(e => e.id === r.experience_id)));

      // Fetch notifications
      try {
        const notiData = await fetchJson<any[]>('/api/notifications');
        setNotifications(notiData || []);
      } catch { /* ignore if no notifications */ }
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'images') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh.');
        continue;
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (field === 'image') {
            updateForm('image', data.url);
          } else {
            setForm(prev => ({ ...prev, images: prev.images ? prev.images + '\\n' + data.url : data.url }));
          }
        } else {
          alert('Lỗi tải ảnh lên');
        }
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  const editExperience = (experience: ExperienceTable) => {
    setEditingId(experience.id);
    setForm({
      title: experience.title,
      location: experience.location,
      duration: experience.duration,
      price: Number(experience.price),
      image: experience.image || '',
      category: experience.category,
      description: experience.description || '',
      max_guests: Number(experience.max_guests) || 50,
      daily_capacity_max: Number(experience.daily_capacity_max ?? experience.daily_capacity ?? experience.max_guests) || 50,
      booking_open_date: experience.booking_open_date || todayIso(),
      booking_close_date: experience.booking_close_date || addDaysIso(90),
      rooms: experience.rooms || 0,
      beds: experience.beds || 0,
      amenities: typeof experience.amenities === 'string' && experience.amenities !== '[]' && experience.amenities !== '' 
        ? JSON.parse(experience.amenities).join(', ') 
        : '',
      images: typeof experience.images === 'string' && experience.images !== '[]' && experience.images !== '' 
        ? JSON.parse(experience.images).join(', ') 
        : ''
    });
    setShowForm(true);
    setActiveTab('experiences');
  };

  const saveExperience = async (event: React.FormEvent) => {
    event.preventDefault();

    const price = Number(form.price);
    if (!form.title.trim() || !form.location.trim() || !form.duration.trim() || !form.category.trim() || !form.description.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin tour');
      return;
    }

    if (!Number.isFinite(price) || price < 1000) {
      setError('Giá tour phải từ 1.000 VNĐ trở lên');
      return;
    }

    const maxGuests = Number(form.max_guests);
    if (!Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 1000) {
      setError('Số khách tối đa phải từ 1 đến 1000');
      return;
    }

    if (!form.booking_open_date || !form.booking_close_date || form.booking_close_date < form.booking_open_date) {
      setError('Ngày đóng tour phải sau hoặc bằng ngày mở tour');
      return;
    }

    const payload = {
      title: form.title.trim(),
      location: form.location.trim(),
      duration: form.duration.trim(),
      price,
      image: form.image.trim() || FALLBACK_IMAGE,
      category: form.category.trim(),
      description: form.description.trim(),
      max_guests: maxGuests,
      daily_capacity_max: Number(form.daily_capacity_max) || maxGuests,
      booking_open_date: form.booking_open_date,
      booking_close_date: form.booking_close_date,
      host_email: currentUser?.email || '',
      rooms: form.rooms,
      beds: form.beds,
      amenities: form.amenities ? form.amenities.split(',').map(s => s.trim()).filter(Boolean) : [],
      images: form.images ? form.images.split(/[\s,]+/).map(s => s.trim()).filter(Boolean) : []
    };
    const endpoint = editingId ? `/api/experiences/${editingId}` : '/api/experiences';
    const method = editingId ? 'PUT' : 'POST';

    try {
      await fetchJson<ExperienceTable>(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      resetForm();
      await fetchAllData();
      onExperiencesChange();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/api/hosts/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser?.email, ...profileForm })
      });
      alert('Cập nhật hồ sơ thành công!');
      await fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };


  const deleteExperience = async (id: number) => {
    setConfirmConfig({
      title: 'Xóa tour',
      message: 'Bạn có chắc chắn muốn xóa tour này không? Mọi dữ liệu liên quan sẽ bị mất.',
      onConfirm: async () => {
        try {
          await fetchJson(`/api/experiences/${id}`, { method: 'DELETE' });
          await fetchAllData();
          onExperiencesChange();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  const requestReopen = async (id: number) => {
    setConfirmConfig({
      title: 'Yêu cầu duyệt tour',
      message: 'Tour sẽ được gửi cho Admin duyệt. Bạn sẽ nhận được thông báo sau khi Admin phản hồi.',
      confirmText: 'Gửi duyệt',
      isDanger: false,
      onConfirm: async () => {
        try {
          await fetchJson(`/api/experiences/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending_review' })
          });
          await fetchAllData();
          onExperiencesChange();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  const updateBookingStatus = async (
    id: number,
    status: BookingTable['status']
  ) => {
    try {
      await fetchJson<BookingTable>(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateBookingPaymentStatus = async (
    id: number,
    payment_status: BookingTable['payment_status']
  ) => {
    try {
      await fetchJson<BookingTable>(`/api/bookings/${id}/payment_status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status })
      });
      await fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRefundComplete = async (id: number) => {
    if (!confirm('Xác nhận bạn đã hoàn tiền cho khách hàng?')) return;
    try {
      await fetchJson(`/api/bookings/${id}/refund_complete`, { method: 'PUT' });
      await fetchAllData();
      alert('Đã cập nhật trạng thái hoàn tiền thành công.');
    } catch (err: any) {
      alert(err.message || 'Lỗi xử lý hoàn tiền');
    }
  };

  const updateHostStatus = async (
    id: number,
    status: HostApplicationTable['status']
  ) => {
    try {
      await fetchJson<HostApplicationTable>(`/api/hosts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitHostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingBooking) return;
    
    if (hostReviewForm.comment.trim().length < 5) {
      alert('Bình luận cần tối thiểu 5 ký tự');
      return;
    }

    try {
      await fetchJson('/api/host_reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: evaluatingBooking.id,
          host_email: currentUser?.email,
          guest_email: evaluatingBooking.user_email,
          rating: hostReviewForm.rating,
          comment: hostReviewForm.comment.trim()
        })
      });

      alert('Đã gửi đánh giá khách hàng thành công');
      setEvaluatingBooking(null);
      setHostReviewForm({ rating: 5, comment: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };


  if (activeSection === 'preview') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-zinc-950">Tour đang mở bán</h3>
          <p className="mt-1 text-sm text-zinc-500">Xem trước danh sách tour hiển thị với khách hàng.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-center mb-6">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên tour, địa điểm hoặc danh mục"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-700 outline-none focus:border-emerald-500"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredExperiences.map((experience) => (
            <article key={experience.id} className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex w-full flex-col">
                <div className="relative">
                  <img
                    src={experience.image || FALLBACK_IMAGE}
                    alt={experience.title}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                    className="h-48 w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
                    {experience.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-600" />{experience.location}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-emerald-600" />{experience.duration}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug text-zinc-950">{experience.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                    {experience.description || 'Chưa có mô tả cho tour này.'}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-sm font-black text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{Number(experience.rating || 0).toFixed(1)}</span>
                    <span className="font-semibold text-zinc-400">({experience.reviews_count} đánh giá)</span>
                  </div>
                  <div className="mt-3 grid gap-1 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs font-bold text-zinc-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      Tối đa {Number(experience.max_guests || 50)} khách/ngày
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
                      Nhận đặt: {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 pt-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase text-zinc-400">Giá từ</div>
                        <div className="text-lg font-black text-emerald-700">{formatVnd(experience.price)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewExperienceDetail(experience)}
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-600 hover:bg-zinc-50"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {filteredExperiences.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm font-semibold text-zinc-500">
              Không tìm thấy tour phù hợp.
            </div>
          )}
        </div>

        {viewExperienceDetail && (
          <ModalExperienceDetail
            experience={viewExperienceDetail}
            onClose={() => setViewExperienceDetail(null)}
            onBook={() => {
              setViewExperienceDetail(null);
              alert('Quản trị viên không cần đặt tour trong chế độ xem trước!');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Bảng điều khiển</p>
          <h2 className="mt-1 text-2xl font-black text-zinc-950">Quản trị VietTour</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quản lý tour, đơn đặt, host và phân quyền người dùng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative inline-flex items-center justify-center rounded-xl border border-zinc-200 p-2.5 text-zinc-700 hover:bg-zinc-50"
              title="Thông báo"
            >
              <Bell className="h-5 w-5" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-100 p-4">
                  <h4 className="text-sm font-black text-zinc-900">Thông báo</h4>
                  <button type="button" onClick={() => setShowNotifications(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-400">Chưa có thông báo nào</div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {notifications.map((noti) => (
                      <div
                        key={noti.id}
                        className={`p-3 text-sm cursor-pointer hover:bg-zinc-50 transition ${!noti.is_read ? 'bg-blue-50/50' : ''}`}
                        onClick={async () => {
                          if (!noti.is_read) {
                            try {
                              await fetchJson(`/api/notifications/${noti.id}/read`, { method: 'PUT' });
                              setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
                            } catch {}
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                            noti.type === 'success' ? 'bg-emerald-500'
                            : noti.type === 'error' ? 'bg-red-500'
                            : noti.type === 'warning' ? 'bg-yellow-500'
                            : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-zinc-800">{noti.title}</div>
                            <div className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{noti.message}</div>
                            <div className="mt-1 text-[10px] text-zinc-400">
                              {new Date(noti.created_at).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="border-b border-zinc-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as HostTab)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-sm font-bold text-zinc-500">Đang tải dữ liệu...</div>
        )}

        {!loading && activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FileCheck2} label="Tour đang bán" value={stats.tours} tone="emerald" />
              <StatCard icon={Star} label="Đánh giá" value={stats.reviews} tone="sky" />
              <StatCard icon={Clock3} label="Đơn chờ duyệt" value={stats.pendingBookings} tone="amber" />
              <StatCard icon={TrendingUp} label="Thực nhận dự kiến" value={formatVnd(stats.confirmedRevenue)} tone="emerald" />
            </div>

            <div className="rounded-2xl border border-zinc-200 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-zinc-950">Biểu đồ doanh thu</h3>
                  <p className="mt-1 text-sm text-zinc-500">Thống kê thực nhận trong 7 ngày gần nhất</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">Tổng 7 ngày</div>
                  <div className="text-xl font-black text-emerald-700">
                    {formatVnd(stats.chartData.reduce((acc, item) => acc + item.revenue, 0))}
                  </div>
                </div>
              </div>
              
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }}
                      width={60}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatVnd(value), 'Thực nhận']}
                      labelStyle={{ fontWeight: 'bold', color: '#18181b' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#059669" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200">
                <div className="border-b border-zinc-200 px-4 py-3 font-black text-zinc-950">Đơn mới</div>
                <div className="divide-y divide-zinc-100">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <div className="font-bold text-zinc-900">{booking.experience_title}</div>
                        <div className="text-xs text-zinc-500">
                          {booking.contact_name} · {booking.guests} khách · {formatVnd(booking.total_price)}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(booking.status)}`}>
                        {statusLabels[booking.status]}
                      </span>
                    </div>
                  ))}
                  {bookings.length === 0 && <EmptyRow text="Chưa có đơn đặt tour." />}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200">
                <div className="border-b border-zinc-200 px-4 py-3 font-black text-zinc-950">Đánh giá mới</div>
                <div className="divide-y divide-zinc-100">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex items-start justify-between gap-4 p-4 text-sm">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-zinc-900">{review.fullname}</div>
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-xs font-bold">{review.rating}</span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{review.comment}</div>
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && <EmptyRow text="Chưa có đánh giá nào." />}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'experiences' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-black text-zinc-950">Quản lý tour</h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm((value) => !value);
                  if (showForm) resetForm();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                {editingId ? 'Đang sửa tour' : 'Thêm tour'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={saveExperience} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-6">
                <label className="block lg:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Tên tour</span>
                  <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Nhập tên tour" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Địa điểm</span>
                  <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Nhập địa điểm" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Thời lượng</span>
                  <input value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} placeholder="VD: 2 ngày 1 đêm" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Giá (VND)</span>
                  <input type="number" min="1000" step="1000" value={form.price} onChange={(event) => updateForm('price', Number(event.target.value))} placeholder="Nhập giá" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Danh mục</span>
                  <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
                    <option value="" disabled>Chọn danh mục</option>
                    {dbCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Tổng khách tối đa (toàn tour)</span>
                  <input type="number" min="1" max="1000" value={form.max_guests} onChange={(event) => updateForm('max_guests', Number(event.target.value))} placeholder="Số lượng" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Khách tối đa mỗi ngày</span>
                  <input type="number" min="1" max={form.max_guests} value={form.daily_capacity_max} onChange={(event) => updateForm('daily_capacity_max', Number(event.target.value))} placeholder="Khách/ngày" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Mở đặt từ ngày</span>
                  <input type="date" value={form.booking_open_date} onChange={(event) => updateForm('booking_open_date', event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Đóng đặt sau ngày</span>
                  <input type="date" min={form.booking_open_date} value={form.booking_close_date} onChange={(event) => updateForm('booking_close_date', event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Số phòng</span>
                  <input type="number" min="0" value={form.rooms} onChange={(event) => updateForm('rooms', Number(event.target.value))} placeholder="Phòng" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Số giường</span>
                  <input type="number" min="0" value={form.beds} onChange={(event) => updateForm('beds', Number(event.target.value))} placeholder="Giường" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Tiện ích</span>
                  <input value={form.amenities} onChange={(event) => updateForm('amenities', event.target.value)} placeholder="Nhập các tiện ích (cách nhau bằng dấu phẩy)" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <div className="lg:col-span-2 space-y-1">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Ảnh đại diện</span>
                  <div className="flex gap-2">
                    <input value={form.image} onChange={(event) => updateForm('image', event.target.value)} placeholder="URL hoặc tải lên" className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                    <label className="flex cursor-pointer items-center justify-center rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200">
                      Tải lên
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} />
                    </label>
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-1">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Danh sách ảnh phụ</span>
                  <div className="flex gap-2 items-start">
                    <textarea value={form.images} onChange={(event) => updateForm('images', event.target.value)} placeholder="Các link cách nhau bằng dấu phẩy hoặc khoảng trắng" rows={3} className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                    <label className="flex cursor-pointer items-center justify-center rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200 h-9">
                      Tải lên
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'images')} />
                    </label>
                  </div>
                </div>
                <label className="block lg:col-span-4">
                  <span className="mb-1 block text-xs font-bold text-zinc-500">Mô tả chi tiết</span>
                  <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Nhập mô tả chi tiết về tour để thu hút khách hàng" rows={3} className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <div className="flex items-end justify-end gap-2 lg:col-span-6">
                  <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Lưu</button>
                  <button type="button" onClick={resetForm} className="rounded-xl border border-zinc-200 bg-white px-5 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100">Hủy</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Tour</th>
                    <th className="px-4 py-3 text-left">Danh mục</th>
                    <th className="px-4 py-3 text-left">Giá</th>
                    <th className="px-4 py-3 text-left">Sức chứa</th>
                    <th className="px-4 py-3 text-left">Thời gian mở</th>
                    <th className="px-4 py-3 text-left">Đánh giá</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {experiences.map((item) => (
                    <tr key={item.id} className={['closed', 'hidden', 'suspended', 'pending_review', 'draft'].includes(item.status || '') ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={item.image || FALLBACK_IMAGE} alt={item.title} className="h-12 w-16 rounded-lg object-cover" />
                          <div>
                            <div className="font-bold text-zinc-900">{item.title}</div>
                            <div className="text-xs text-zinc-500">{item.location} · {item.duration}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{item.category}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatVnd(item.price)}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div>{Number(item.max_guests || 50)} khách (tổng)</div>
                        <div className="text-xs text-zinc-400">{Number(item.daily_capacity_max ?? item.daily_capacity ?? item.max_guests ?? 50)}/ngày</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="text-xs font-semibold">{formatDateVi(item.booking_open_date)} - {formatDateVi(item.booking_close_date)}</div>
                        <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${
                          item.status === 'closed' ? 'border-red-200 bg-red-50 text-red-700'
                          : item.status === 'pending_review' ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                          : item.status === 'hidden' ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                          : item.status === 'draft' ? 'border-gray-200 bg-gray-100 text-gray-500'
                          : isExperienceOpen(item) ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : item.booking_open_date && item.booking_open_date > todayIso() ? 'border-sky-100 bg-sky-50 text-sky-700'
                          : 'border-red-100 bg-red-50 text-red-700'
                        }`}>
                          {item.status === 'closed' ? 'Đã đóng (đủ khách)'
                          : item.status === 'pending_review' ? 'Chờ Admin duyệt'
                          : item.status === 'hidden' ? 'Đã ẩn'
                          : item.status === 'draft' ? 'Bản nháp'
                          : isExperienceOpen(item) ? 'Đang mở'
                          : item.booking_open_date && item.booking_open_date > todayIso() ? 'Chưa mở'
                          : 'Đã đóng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{Number(item.rating || 0).toFixed(1)} ({item.reviews_count})</td>
                      <td className="px-4 py-3 text-right">
                        {item.status === 'closed' && (
                          <button type="button" onClick={() => requestReopen(item.id)} className="mr-2 rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-xs font-bold text-yellow-700 hover:bg-yellow-100" title="Gửi yêu cầu mở lại tour cho Admin duyệt">Mở lại</button>
                        )}
                        {item.status === 'draft' && (
                          <button type="button" onClick={() => requestReopen(item.id)} className="mr-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100" title="Gửi yêu cầu duyệt tour cho Admin">Gửi duyệt</button>
                        )}
                        {item.status === 'pending_review' && (
                          <span className="mr-2 inline-flex rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-xs font-bold text-yellow-600">Đang chờ...</span>
                        )}
                        <button type="button" onClick={() => setViewExperienceDetail(item)} className="mr-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-600 hover:bg-sky-100" aria-label="Xem chi tiết tour"><Eye className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setScheduleExperience(item)} className="mr-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100" aria-label="Quản lý lịch"><Calendar className="h-4 w-4" /></button>
                        <button type="button" onClick={() => editExperience(item)} className="mr-2 rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50" aria-label="Sửa tour"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => deleteExperience(item.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" aria-label="Xóa tour"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {experiences.length === 0 && (
                    <tr><td colSpan={7}><EmptyRow text="Chưa có tour trong hệ thống." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'bookings' && (
          <HostTable title="Quản lý đơn đặt tour">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Đơn</th>
                  <th className="px-4 py-3 text-left">Liên hệ</th>
                  <th className="px-4 py-3 text-left">Ngày/Lịch đi</th>
                  <th className="px-4 py-3 text-left">Tài chính</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">#{booking.id} · {booking.experience_title}</div>
                      <div className="text-xs text-zinc-500">{booking.user_email} · {booking.guests} khách</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{booking.contact_name}<br /><span className="text-xs">{booking.contact_phone}</span></td>
                    <td className="px-4 py-3 text-zinc-600">
                      {booking.booking_date}
                      {booking.schedule_id && <div className="mt-1 text-xs font-bold text-emerald-600">Lịch ID: #{booking.schedule_id}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-emerald-700">{formatVnd(booking.total_price)}</div>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs">
                        <div className="font-semibold text-sky-600">Thực nhận: {formatVnd(booking.host_earnings || 0)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <select
                          value={booking.status}
                          onChange={(event) => updateBookingStatus(booking.id, event.target.value as BookingTable['status'])}
                          className={`w-full rounded-lg border px-2 py-1.5 text-xs font-bold outline-none ${statusClass(booking.status)}`}
                        >
                          <option value="pending">Chờ xử lý</option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                        <select
                          value={booking.payment_status || 'unpaid'}
                          onChange={(event) => updateBookingPaymentStatus(booking.id, event.target.value as BookingTable['payment_status'])}
                          className={`w-full rounded-lg border px-2 py-1.5 text-xs font-bold outline-none ${booking.payment_status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : booking.payment_status === 'refunded' ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                        >
                          <option value="unpaid">Chưa thanh toán</option>
                          <option value="paid">Đã thanh toán</option>
                          <option value="refunded">Đã hoàn tiền</option>
                        </select>

                        {booking.refund_status === 'pending' && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-center">
                            <span className="block text-xs font-bold text-amber-700 mb-1">Yêu cầu hoàn tiền</span>
                            <button
                              onClick={() => handleRefundComplete(booking.id)}
                              className="w-full rounded bg-amber-600 py-1 text-xs font-bold text-white hover:bg-amber-700"
                            >
                              Đã hoàn tiền
                            </button>
                          </div>
                        )}

                        {booking.refund_status === 'completed' && (
                          <div className="mt-2 text-center text-xs font-bold text-zinc-500 bg-zinc-100 py-1 rounded">
                            Đã hoàn tiền
                          </div>
                        )}
                        
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => {
                              setEvaluatingBooking(booking);
                              setHostReviewForm({ rating: 5, comment: '' });
                            }}
                            className="mt-2 w-full rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            Đánh giá khách
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={5}><EmptyRow text="Chưa có đơn đặt tour." /></td></tr>
                )}
              </tbody>
            </table>
          </HostTable>
        )}

        {!loading && activeTab === 'reviews' && (
          <HostTable title="Đánh giá từ khách hàng">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tour</th>
                  <th className="px-4 py-3 text-left">Khách hàng</th>
                  <th className="px-4 py-3 text-left">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {reviews.map((review) => {
                  const experience = experiences.find(e => e.id === review.experience_id);
                  return (
                    <tr key={review.id}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900 line-clamp-1">{experience?.title || 'Tour đã xóa'}</div>
                        <div className="text-xs text-zinc-500">{new Date(review.created_at).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{review.fullname}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-amber-500 mb-1">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">{review.rating}</span>
                        </div>
                        <p className="text-zinc-600 line-clamp-2">{review.comment}</p>
                      </td>
                    </tr>
                  );
                })}
                {reviews.length === 0 && (
                  <tr><td colSpan={3}><EmptyRow text="Chưa có đánh giá nào." /></td></tr>
                )}
              </tbody>
            </table>
          </HostTable>
        )}

        {!loading && activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-zinc-950">Hồ sơ cá nhân</h3>
            <form onSubmit={updateProfile} className="max-w-2xl rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">Tên hiển thị</span>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">Số điện thoại</span>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">CMND/CCCD</span>
                  <input
                    value={profileForm.id_number}
                    onChange={(e) => setProfileForm({ ...profileForm, id_number: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">Địa chỉ</span>
                  <input
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">Khu vực hoạt động</span>
                  <input
                    value={profileForm.experience_location}
                    onChange={(e) => setProfileForm({ ...profileForm, experience_location: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">Mô tả bản thân</span>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Cập nhật hồ sơ
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {confirmConfig && (
        <ModalConfirm
          {...confirmConfig}
          onClose={() => setConfirmConfig(null)}
        />
      )}

      {evaluatingBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-black text-zinc-900">Đánh giá khách hàng</h3>
            <div className="mb-4 rounded-lg bg-zinc-50 p-3 text-sm">
              Đánh giá khách hàng <span className="font-bold">{evaluatingBooking.contact_name}</span> cho đơn hàng <span className="font-bold">#{evaluatingBooking.id}</span>
            </div>
            <form onSubmit={submitHostReview} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-700">Chất lượng (sao)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHostReviewForm({ ...hostReviewForm, rating: value })}
                      className={`rounded-lg border p-2 ${hostReviewForm.rating >= value ? 'border-amber-200 bg-amber-50 text-amber-500' : 'border-zinc-200 bg-white text-zinc-300'}`}
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-700">Nhận xét của bạn</label>
                <textarea
                  value={hostReviewForm.comment}
                  onChange={(e) => setHostReviewForm({ ...hostReviewForm, comment: e.target.value })}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="Khách hàng đã trải nghiệm như thế nào..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEvaluatingBooking(null)}
                  className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scheduleExperience && (
        <ScheduleManager
          experienceId={scheduleExperience.id}
          experienceTitle={scheduleExperience.title}
          onClose={() => setScheduleExperience(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: 'emerald' | 'amber' | 'sky' | 'zinc';
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    zinc: 'bg-zinc-100 text-zinc-700'
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-200 p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-black text-zinc-950">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function HostTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-black text-zinc-950">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm font-semibold text-zinc-400">{text}</div>;
}
