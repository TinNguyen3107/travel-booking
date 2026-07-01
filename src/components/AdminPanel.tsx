/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Edit2,
  Eye,
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
  XCircle
} from 'lucide-react';
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

interface AdminPanelProps {
  onExperiencesChange: () => void;
  activeSection: string;
  currentUser?: any;
}

type AdminTab = 'overview' | 'categories' | 'experiences' | 'bookings' | 'users' | 'hosts' | 'promotions';

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

export default function AdminPanel({ onExperiencesChange, activeSection, currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [experiences, setExperiences] = useState<ExperienceTable[]>([]);
  const [bookings, setBookings] = useState<BookingTable[]>([]);
  const [users, setUsers] = useState<UserTable[]>([]);
  const [hosts, setHosts] = useState<HostApplicationTable[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewExperienceDetail, setViewExperienceDetail] = useState<ExperienceTable | null>(null);
  const [scheduleExperience, setScheduleExperience] = useState<ExperienceTable | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', discount_percent: 0, discount_amount: 0, expiry_date: '', experience_id: '', usage_limit: 100, description: '' });
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [rejectTourId, setRejectTourId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isHost = currentUser?.role === 'host';
  const tabs = isHost 
    ? [{ id: 'experiences', label: 'Quản lý Tour' }, { id: 'bookings', label: 'Quản lý Đơn' }]
    : [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'categories', label: 'Danh mục' },
        { id: 'experiences', label: 'Tour' },
        { id: 'bookings', label: 'Đơn đặt' },
        { id: 'promotions', label: 'Khuyến mãi' },
        { id: 'users', label: 'Người dùng' },
        { id: 'hosts', label: 'Host' }
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
      .reduce((sum, booking) => sum + Number(booking.commission_amount || 0), 0);
    const pendingHosts = hosts.filter((host) => host.status === 'pending').length;

    return {
      tours: experiences.length,
      users: users.length,
      pendingBookings,
      pendingHosts,
      confirmedRevenue
    };
  }, [bookings, experiences, hosts, users]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchJson = async <T,>(url: string, options?: RequestInit): Promise<T> => {
    const headers = {
      ...options?.headers,
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.reload();
        throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      }
      throw new Error(data.error || 'Không thể đọc dữ liệu');
    }

    return data;
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [experienceData, bookingData, userData, hostData, categoryData, promoData] = await Promise.all([
        fetchJson<ExperienceTable[]>('/api/experiences'),
        fetchJson<BookingTable[]>(isHost ? `/api/bookings?role=host&email=${encodeURIComponent(currentUser?.email)}` : '/api/bookings?role=admin'),
        fetchJson<UserTable[]>('/api/users'),
        fetchJson<HostApplicationTable[]>('/api/hosts'),
        fetchJson<{ id: number; name: string }[]>('/api/categories'),
        fetchJson<any[]>('/api/promotions')
      ]);

      setExperiences(isHost ? (experienceData || []).filter(e => e.host_email === currentUser?.email) : (experienceData || []));
      setBookings(bookingData || []);
      setUsers(userData || []);
      setHosts(hostData || []);
      setDbCategories(categoryData || []);
      setPromotions(promoData || []);
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

  const savePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!promoForm.code.trim() || !promoForm.expiry_date.trim()) {
      setError('Vui lòng nhập mã và ngày hết hạn');
      return;
    }
    try {
      await fetchJson('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm)
      });
      setShowPromoForm(false);
      setPromoForm({ code: '', discount_percent: 0, discount_amount: 0, expiry_date: '', experience_id: '', usage_limit: 100, description: '' });
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

  const toggleExperienceStatus = async (id: number, currentStatus?: string) => {
    // pending_review: Admin duyệt → active
    // hidden: mở lại → active
    // active/else: ẩn → hidden
    const newStatus = currentStatus === 'pending_review' ? 'active'
                    : currentStatus === 'hidden' ? 'active'
                    : 'hidden';
    try {
      await fetchJson(`/api/experiences/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchAllData();
      onExperiencesChange();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const approveTour = async (id: number) => {
    setConfirmConfig({
      title: 'Duyệt tour',
      message: 'Bạn có muốn duyệt tour này? Tour sẽ được công khai cho khách hàng đặt.',
      confirmText: 'Đồng ý duyệt',
      isDanger: false,
      onConfirm: async () => {
        try {
          await fetchJson(`/api/experiences/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' })
          });
          await fetchAllData();
          onExperiencesChange();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  const rejectTour = async () => {
    if (!rejectTourId) return;
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await fetchJson(`/api/experiences/${rejectTourId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', reason: rejectReason.trim() })
      });
      setRejectTourId(null);
      setRejectReason('');
      await fetchAllData();
      onExperiencesChange();
    } catch (err: any) {
      setError(err.message);
    }
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

  const updateUserRole = async (id: number, role: UserTable['role']) => {
    try {
      await fetchJson<UserTable>(`/api/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      await fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteUser = async (id: number) => {
    setConfirmConfig({
      title: 'Xóa người dùng',
      message: 'Xóa người dùng này? Các dữ liệu liên quan có thể sẽ không thuộc về người dùng này nữa.',
      onConfirm: async () => {
        try {
          await fetchJson(`/api/users/${id}`, { method: 'DELETE' });
          await fetchAllData();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };



  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await fetchJson('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory.trim() })
      });
      setNewCategory('');
      await fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteCategory = async (id: number) => {
    setConfirmConfig({
      title: 'Xóa danh mục',
      message: 'Bạn có chắc chắn muốn xóa danh mục này?',
      onConfirm: async () => {
        try {
          await fetchJson(`/api/categories/${id}`, { method: 'DELETE' });
          await fetchAllData();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
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

  if (activeSection === 'preview') {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-zinc-950 dark:text-slate-50">Tour đang mở bán</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">Xem trước danh sách tour hiển thị với khách hàng.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 lg:flex-row lg:items-center mb-6">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên tour, địa điểm hoặc danh mục"
              className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-zinc-700 dark:text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredExperiences.map((experience) => (
            <article key={experience.id} className="flex overflow-hidden rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-sm">
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
                  <span className="absolute left-3 top-3 rounded-full bg-white/80 backdrop-blur-lg dark:bg-slate-800/95 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
                    {experience.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-600" />{experience.location}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-emerald-600" />{experience.duration}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug text-zinc-950 dark:text-slate-50">{experience.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                    {experience.description || 'Chưa có mô tả cho tour này.'}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-sm font-black text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{Number(experience.rating || 0).toFixed(1)}</span>
                    <span className="font-semibold text-zinc-400 dark:text-slate-500">({experience.reviews_count} đánh giá)</span>
                  </div>
                  <div className="mt-3 grid gap-1 rounded-xl border border-zinc-100 dark:border-slate-800 bg-zinc-50 dark:bg-slate-900/50 p-3 text-xs font-bold text-zinc-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      Tối đa {Number(experience.daily_capacity_max ?? experience.daily_capacity ?? experience.max_guests ?? 50)} khách/ngày
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
                      Nhận đặt: {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 dark:border-slate-800 pt-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase text-zinc-400 dark:text-slate-500">Giá từ</div>
                        <div className="text-lg font-black text-emerald-700">{formatVnd(experience.price)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewExperienceDetail(experience)}
                        className="flex-1 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-2 text-sm font-black text-zinc-600 dark:text-slate-300 hover:bg-zinc-50 dark:bg-slate-900/50 dark:hover:bg dark:hover:bg dark:hover:bg-slate-900/50"
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
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 dark:border-slate-600 bg-white/80 backdrop-blur-lg dark:bg-slate-800 p-10 text-center text-sm font-semibold text-zinc-500 dark:text-slate-400">
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
    <div className="rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 dark:border-slate-700 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Bảng điều khiển</p>
          <h2 className="mt-1 text-2xl font-black text-zinc-950 dark:text-slate-50">Quản trị VietTour</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            Quản lý tour, đơn đặt, host và phân quyền người dùng.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAllData}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2 text-sm font-bold text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:bg-slate-900/50 dark:hover:bg dark:hover:bg dark:hover:bg-slate-900/50"
        >
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="border-b border-zinc-200 dark:border-slate-700 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-200 hover:bg-zinc-200 dark:hover:bg-slate-700'
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
          <div className="py-10 text-center text-sm font-bold text-zinc-500 dark:text-slate-400">Đang tải dữ liệu...</div>
        )}

        {!loading && activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={FileCheck2} label="Tour đang bán" value={stats.tours} tone="emerald" />
              <StatCard icon={Users} label="Người dùng" value={stats.users} tone="zinc" />
              <StatCard icon={Clock3} label="Đơn chờ duyệt" value={stats.pendingBookings} tone="amber" />
              <StatCard icon={ShieldCheck} label="Host chờ duyệt" value={stats.pendingHosts} tone="sky" />
              <StatCard icon={CheckCircle2} label="Doanh thu Admin (Hoa hồng)" value={formatVnd(stats.confirmedRevenue)} tone="emerald" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 dark:border-slate-700">
                <div className="border-b border-zinc-200 dark:border-slate-700 px-4 py-3 font-black text-zinc-950 dark:text-slate-50">Đơn mới</div>
                <div className="divide-y divide-zinc-100">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-slate-100">{booking.experience_title}</div>
                        <div className="text-xs text-zinc-500 dark:text-slate-400">
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

              <div className="rounded-2xl border border-zinc-200 dark:border-slate-700">
                <div className="border-b border-zinc-200 dark:border-slate-700 px-4 py-3 font-black text-zinc-950 dark:text-slate-50">Người dùng mới</div>
                <div className="divide-y divide-zinc-100">
                  {users.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-slate-100">{item.fullname}</div>
                        <div className="text-xs text-zinc-500 dark:text-slate-400">{item.email}</div>
                      </div>
                      <span className="rounded-full border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-slate-200 capitalize">
                        {item.role}
                      </span>
                    </div>
                  ))}
                  {users.length === 0 && <EmptyRow text="Chưa có người dùng." />}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'experiences' && !isHost && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-zinc-950 dark:text-slate-50">Duyệt & Quản lý Tour</h3>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">Chỉ Host mới được tạo tour. Admin có thể ẩn hoặc xóa tour vi phạm.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-slate-900/50 text-xs uppercase text-zinc-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Tour</th>
                    <th className="px-4 py-3 text-left">Host</th>
                    <th className="px-4 py-3 text-left">Giá</th>
                    <th className="px-4 py-3 text-left">Sức chứa</th>
                    <th className="px-4 py-3 text-left">Đánh giá</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {experiences.filter(exp => exp.status !== 'draft').map((item) => (
                    <tr key={item.id} className={['hidden', 'suspended', 'closed'].includes(item.status || '') ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={item.image || FALLBACK_IMAGE} alt={item.title} className="h-12 w-16 rounded-lg object-cover" />
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-slate-100">{item.title}</div>
                            <div className="text-xs text-zinc-500 dark:text-slate-400">{item.location} · {item.duration}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-slate-400">{item.host_email || '—'}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatVnd(item.price)}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                        <div>{Number(item.max_guests || 50)} khách (tổng)</div>
                        <div className="text-xs text-zinc-400 dark:text-slate-500">{Number(item.daily_capacity_max ?? item.daily_capacity ?? item.max_guests ?? 50)}/ngày</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{Number(item.rating || 0).toFixed(1)} ({item.reviews_count})</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                          item.status === 'hidden' ? 'border-zinc-200 dark:border-slate-700 bg-zinc-100 dark:bg-slate-800 text-zinc-500 dark:text-slate-400'
                          : item.status === 'suspended' ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : item.status === 'closed' ? 'border-red-200 bg-red-50 text-red-700'
                          : item.status === 'pending_review' || item.status === 'pending_update' ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.status === 'hidden' ? 'Đã ẩn'
                          : item.status === 'suspended' ? 'Tạm khóa'
                          : item.status === 'closed' ? 'Đã đóng'
                          : item.status === 'pending_review' ? 'Chờ duyệt mới'
                          : item.status === 'pending_update' ? 'Chờ duyệt cập nhật'
                          : 'Đang hiện'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.status === 'pending_review' || item.status === 'pending_update' ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewExperienceDetail(item)}
                              className="rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-600 hover:bg-sky-100"
                              title="Xem chi tiết tour"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => approveTour(item.id)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              Đồng ý
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectTourId(item.id); setRejectReason(''); }}
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewExperienceDetail(item)}
                              className="mr-1 rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-600 hover:bg-sky-100"
                              title="Xem chi tiết tour"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExperienceStatus(item.id, item.status)}
                              className={`mr-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${item.status === 'hidden' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800'}`}
                            >
                              {item.status === 'hidden' ? 'Hiện' : item.status === 'closed' ? 'Đã đóng' : 'Ẩn'}
                            </button>
                            <button type="button" onClick={() => deleteExperience(item.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" aria-label="Xóa tour"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {experiences.length === 0 && (
                    <tr><td colSpan={7}><EmptyRow text="Chưa có tour nào trong hệ thống. Host cần tạo tour trước." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'experiences' && isHost && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-black text-zinc-950 dark:text-slate-50">Quản lý tour của tôi</h3>
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
              <form onSubmit={saveExperience} className="grid gap-3 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-4 lg:grid-cols-6">
                <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Tên tour" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-2" />
                <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Địa điểm" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} placeholder="Thời lượng" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input type="number" min="1000" step="1000" value={form.price} onChange={(event) => updateForm('price', Number(event.target.value))} placeholder="Giá" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  <option value="" disabled>Chọn danh mục</option>
                  {dbCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
                <input type="number" min="1" max="1000" value={form.max_guests} onChange={(event) => updateForm('max_guests', Number(event.target.value))} placeholder="Số khách tối đa (toàn tour)" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input type="number" min="1" max={form.max_guests} value={form.daily_capacity_max} onChange={(event) => updateForm('daily_capacity_max', Number(event.target.value))} placeholder="Khách tối đa mỗi ngày" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-slate-400">Mở đặt từ ngày</span>
                  <input type="date" value={form.booking_open_date} onChange={(event) => updateForm('booking_open_date', event.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-slate-400">Đóng đặt sau ngày</span>
                  <input type="date" min={form.booking_open_date} value={form.booking_close_date} onChange={(event) => updateForm('booking_close_date', event.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <input type="number" min="0" value={form.rooms} onChange={(event) => updateForm('rooms', Number(event.target.value))} placeholder="Số phòng" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input type="number" min="0" value={form.beds} onChange={(event) => updateForm('beds', Number(event.target.value))} placeholder="Số giường" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={form.amenities} onChange={(event) => updateForm('amenities', event.target.value)} placeholder="Tiện ích (cách nhau dấu phẩy)" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-2" />
                <input value={form.image} onChange={(event) => updateForm('image', event.target.value)} placeholder="URL ảnh đại diện" className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-2" />
                <textarea value={form.images} onChange={(event) => updateForm('images', event.target.value)} placeholder="Danh sách ảnh phụ (cách nhau dấu phẩy hoặc khoảng trắng)" rows={3} className="resize-none rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-2" />
                <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Mô tả tour (hiển thị khi khách xem chi tiết)" rows={3} className="resize-none rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-4" />
                <div className="flex gap-2 lg:col-span-2">
                  <button type="submit" className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">Lưu</button>
                  <button type="button" onClick={resetForm} className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm font-bold text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800">Hủy</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-slate-900/50 text-xs uppercase text-zinc-500 dark:text-slate-400">
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
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={item.image || FALLBACK_IMAGE} alt={item.title} className="h-12 w-16 rounded-lg object-cover" />
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-slate-100">{item.title}</div>
                            <div className="text-xs text-zinc-500 dark:text-slate-400">{item.location} · {item.duration}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{item.category}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatVnd(item.price)}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{Number(item.daily_capacity_max ?? item.daily_capacity ?? item.max_guests ?? 50)} khách/ngày</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                        <div className="text-xs font-semibold">{formatDateVi(item.booking_open_date)} - {formatDateVi(item.booking_close_date)}</div>
                        <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${isExperienceOpen(item) ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : item.booking_open_date && item.booking_open_date > todayIso() ? 'border-sky-100 bg-sky-50 text-sky-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                          {isExperienceOpen(item) ? 'Đang mở' : item.booking_open_date && item.booking_open_date > todayIso() ? 'Chưa mở' : 'Đã đóng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{Number(item.rating || 0).toFixed(1)} ({item.reviews_count})</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setScheduleExperience(item)} className="mr-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100" aria-label="Quản lý lịch"><Calendar className="h-4 w-4" /></button>
                        <button type="button" onClick={() => editExperience(item)} className="mr-2 rounded-lg border border-zinc-200 dark:border-slate-700 p-2 text-zinc-600 dark:text-slate-300 hover:bg-zinc-50 dark:bg-slate-900/50 dark:hover:bg dark:hover:bg dark:hover:bg-slate-900/50" aria-label="Sửa tour"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => deleteExperience(item.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" aria-label="Xóa tour"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {experiences.length === 0 && (
                    <tr><td colSpan={7}><EmptyRow text="Bạn chưa có tour nào. Nhấn 'Thêm tour' để tạo mới." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {!loading && activeTab === 'categories' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-zinc-950 dark:text-slate-50">Quản lý danh mục tour</h3>

            <form onSubmit={addCategory} className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Tên danh mục mới..."
                className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Thêm
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-slate-700 mt-4">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-slate-900/50 text-xs uppercase text-zinc-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Tên danh mục</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {dbCategories.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-zinc-500 dark:text-slate-400">#{item.id}</td>
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-slate-100">{item.name}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteCategory(item.id)}
                          className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                          aria-label="Xóa danh mục"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dbCategories.length === 0 && (
                    <tr><td colSpan={3}><EmptyRow text="Chưa có danh mục nào." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'bookings' && (
          <AdminTable title="Quản lý đơn đặt tour">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-slate-900/50 text-xs uppercase text-zinc-500 dark:text-slate-400">
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
                      <div className="font-bold text-zinc-900 dark:text-slate-100">#{booking.id} · {booking.experience_title}</div>
                      <div className="text-xs text-zinc-500 dark:text-slate-400">{booking.user_email} · {booking.guests} khách</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{booking.contact_name}<br /><span className="text-xs">{booking.contact_phone}</span></td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                      {booking.booking_date}
                      {booking.schedule_id && <div className="mt-1 text-xs font-bold text-emerald-600">Lịch ID: #{booking.schedule_id}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-emerald-700">{formatVnd(booking.total_price)}</div>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs">
                        {!isHost && <div className="font-semibold text-amber-600">Hoa hồng: {formatVnd(booking.commission_amount || 0)}</div>}
                        <div className="font-semibold text-sky-600">Thực nhận: {formatVnd(booking.host_earnings || 0)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <div
                          className={`w-full rounded-lg border px-2 py-1.5 text-xs font-bold text-center ${statusClass(booking.status)}`}
                        >
                          {booking.status === 'pending' ? 'Chờ xử lý' : booking.status === 'confirmed' ? 'Đã xác nhận' : 'Đã hủy'}
                        </div>
                        <div
                          className={`w-full rounded-lg border px-2 py-1.5 text-xs font-bold text-center ${booking.payment_status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : booking.payment_status === 'refunded' ? 'border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 text-zinc-600 dark:text-slate-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                        >
                          {booking.payment_status === 'paid' ? 'Đã thanh toán' : booking.payment_status === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán'}
                        </div>

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
                          <div className="mt-2 text-center text-xs font-bold text-zinc-500 dark:text-slate-400 bg-zinc-100 dark:bg-slate-800 py-1 rounded">
                            Đã hoàn tiền
                          </div>
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
          </AdminTable>
        )}

        {!loading && activeTab === 'promotions' && !isHost && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPromoForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Thêm Mã Khuyến Mãi
              </button>
            </div>
            
            {showPromoForm && (
              <form onSubmit={savePromotion} className="mb-8 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/50 p-6">
                <h3 className="mb-6 text-lg font-black text-zinc-900 dark:text-slate-100">Thêm mã mới</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Mã giảm giá</span>
                    <input
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="VD: SUMMER2024"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Ngày hết hạn</span>
                    <input
                      type="date"
                      value={promoForm.expiry_date}
                      onChange={(e) => setPromoForm({ ...promoForm, expiry_date: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Giảm theo %</span>
                    <input
                      type="number"
                      value={promoForm.discount_percent}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_percent: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Hoặc Giảm tiền mặt (VNĐ)</span>
                    <input
                      type="number"
                      value={promoForm.discount_amount}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_amount: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Áp dụng cho Tour (Bỏ trống: Tất cả)</span>
                    <select
                      value={promoForm.experience_id}
                      onChange={(e) => setPromoForm({ ...promoForm, experience_id: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Áp dụng cho tất cả tour --</option>
                      {experiences.map(exp => (
                        <option key={exp.id} value={exp.id}>{exp.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Giới hạn số lượt dùng</span>
                    <input
                      type="number"
                      value={promoForm.usage_limit}
                      onChange={(e) => setPromoForm({ ...promoForm, usage_limit: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-slate-200">Mô tả (hiển thị trên băng rôn)</span>
                    <input
                      value={promoForm.description}
                      onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                      placeholder="VD: Nhập SUMMER2024 giảm 10% khi đặt tour!"
                      className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPromoForm(false)}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-slate-300 hover:bg-zinc-200 dark:hover:bg-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-slate-900/50 font-bold text-zinc-900 dark:text-slate-100">
                  <tr>
                    <th className="p-4">Mã</th>
                    <th className="p-4">Giảm giá</th>
                    <th className="p-4">Giới hạn</th>
                    <th className="p-4">Lượt dùng</th>
                    <th className="p-4">Hết hạn</th>
                    <th className="p-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white/80 backdrop-blur-lg dark:bg-slate-800">
                  {promotions.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:bg-slate-900/50 dark:hover:bg dark:hover:bg dark:hover:bg-slate-900/50">
                      <td className="p-4">
                        <div className="font-bold">{p.code}</div>
                        <div className="text-xs text-zinc-500 dark:text-slate-400">{p.experience_id ? `Áp dụng tour ID: ${p.experience_id}` : 'Mọi tour'}</div>
                        <div className="text-xs text-zinc-400 dark:text-slate-500 mt-1">{p.description}</div>
                      </td>
                      <td className="p-4">{p.discount_percent ? `${p.discount_percent}%` : formatVnd(p.discount_amount)}</td>
                      <td className="p-4">{p.usage_limit || 'Không giới hạn'}</td>
                      <td className="p-4 font-bold text-emerald-600">{p.used_count || 0}</td>
                      <td className="p-4">{new Date(p.expiry_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-300 border-zinc-200 dark:border-slate-700'}`}>
                          {p.is_active ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {promotions.length === 0 && (
                    <tr><td colSpan={4}><EmptyRow text="Chưa có mã khuyến mãi nào." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <AdminTable title="Phân quyền người dùng">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-slate-900/50 text-xs uppercase text-zinc-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Người dùng</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-slate-100">{item.fullname}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">{item.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.role}
                          onChange={(event) => updateUserRole(item.id, event.target.value as UserTable['role'])}
                          className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm font-bold text-zinc-700 dark:text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="host">Host</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteUser(item.id)}
                          className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                          aria-label="Xóa người dùng"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={3}><EmptyRow text="Chưa có người dùng." /></td></tr>
                )}
              </tbody>
            </table>
          </AdminTable>
        )}

        {!loading && activeTab === 'hosts' && (
          <AdminTable title="Duyệt đăng ký Host">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-slate-900/50 text-xs uppercase text-zinc-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Người đăng ký</th>
                  <th className="px-4 py-3 text-left">Liên hệ</th>
                  <th className="px-4 py-3 text-left">Địa chỉ & CCCD</th>
                  <th className="px-4 py-3 text-left">Địa điểm & Mô tả</th>
                  <th className="px-4 py-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {hosts.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900 dark:text-slate-100">{item.name}</div>
                      <div className="mt-1 text-xs text-zinc-400 dark:text-slate-500">#{item.id} · {new Date(item.created_at).toLocaleDateString('vi-VN')}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                      <div>{item.email}</div>
                      <div className="mt-1 font-semibold text-zinc-500 dark:text-slate-400">{item.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300">
                      <div className="text-xs"><span className="font-bold text-zinc-500 dark:text-slate-400">Đ/c:</span> {item.address || 'Chưa cập nhật'}</div>
                      <div className="mt-1 text-xs"><span className="font-bold text-zinc-500 dark:text-slate-400">CCCD:</span> {item.id_number || 'Chưa cập nhật'}</div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-slate-300">
                      <div className="text-xs font-bold text-emerald-600 mb-1">{item.experience_location || 'Chưa cập nhật'}</div>
                      <div className="text-xs line-clamp-2" title={item.description}>{item.description}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.status)}`}>
                          {statusLabels[item.status]}
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {item.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateHostStatus(item.id, 'approved')}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => updateHostStatus(item.id, 'rejected')}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          {item.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => updateHostStatus(item.id, 'suspended')}
                              className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50"
                            >
                              Tạm khóa
                            </button>
                          )}
                          {(item.status === 'rejected' || item.status === 'suspended') && (
                            <button
                              type="button"
                              onClick={() => updateHostStatus(item.id, 'approved')}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Kích hoạt lại
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {hosts.length === 0 && (
                  <tr><td colSpan={5}><EmptyRow text="Chưa có đăng ký host." /></td></tr>
                )}
              </tbody>
            </table>
          </AdminTable>
        )}
      </div>

      {confirmConfig && (
        <ModalConfirm
          {...confirmConfig}
          onClose={() => setConfirmConfig(null)}
        />
      )}

      {viewExperienceDetail && (
        <ModalExperienceDetail
          experience={viewExperienceDetail}
          onClose={() => setViewExperienceDetail(null)}
          onBook={() => {
            setViewExperienceDetail(null);
            alert('Admin chỉ được xem trước, không thể đặt chỗ.');
          }}
        />
      )}

      {scheduleExperience && (
        <ScheduleManager
          experienceId={scheduleExperience.id}
          experienceTitle={scheduleExperience.title}
          onClose={() => setScheduleExperience(null)}
        />
      )}

      {rejectTourId !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-xl font-black text-zinc-950 dark:text-slate-50">Từ chối duyệt tour</h2>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-slate-400">Vui lòng nhập lý do từ chối. Host sẽ nhận được thông báo kèm lý do này.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (bắt buộc)..."
                rows={3}
                className="w-full resize-none rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-red-400"
                autoFocus
              />
            </div>
            <div className="flex gap-2 border-t border-zinc-100 dark:border-slate-800 bg-zinc-50 dark:bg-slate-900/50 p-4">
              <button
                type="button"
                onClick={() => { setRejectTourId(null); setRejectReason(''); }}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={rejectTour}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
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
    zinc: 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-200'
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-slate-700 p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-black text-zinc-950 dark:text-slate-50">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function AdminTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-black text-zinc-950 dark:text-slate-50">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-slate-700">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm font-semibold text-zinc-400 dark:text-slate-500">{text}</div>;
}
