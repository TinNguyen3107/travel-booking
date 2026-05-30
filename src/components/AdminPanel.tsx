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
  Users
} from 'lucide-react';
import {
  BookingTable,
  ExperienceTable,
  formatVnd,
  HostApplicationTable,
  UserTable
} from '../types';
import ModalConfirm, { ConfirmConfig } from './ModalConfirm';
import ModalExperienceDetail from './ModalExperienceDetail';

interface AdminPanelProps {
  onExperiencesChange: () => void;
  activeSection: string;
  currentUser?: any;
}

type AdminTab = 'overview' | 'categories' | 'experiences' | 'bookings' | 'users' | 'hosts' | 'promotions';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop';

const EMPTY_FORM = {
  title: '',
  location: '',
  duration: '',
  price: 890000,
  image: '',
  category: 'Thiên nhiên',
  description: '',
  max_guests: 50
};

const statusLabels = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  approved: 'Đã duyệt'
};

const statusClass = (status: string) => {
  if (status === 'confirmed' || status === 'approved') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (status === 'cancelled') {
    return 'bg-red-50 text-red-700 border-red-100';
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
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', discount_percent: 0, discount_amount: 0, expiry_date: '' });
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

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

      return matchesCategory && matchesKeyword;
    });
  }, [experiences, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length;
    const confirmedRevenue = bookings
      .filter((booking) => booking.status === 'confirmed')
      .reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
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
    const res = await fetch(url, options);
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
      max_guests: Number(experience.max_guests) || 50
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

    const payload = {
      title: form.title.trim(),
      location: form.location.trim(),
      duration: form.duration.trim(),
      price,
      image: form.image.trim() || FALLBACK_IMAGE,
      category: form.category.trim(),
      description: form.description.trim(),
      max_guests: Number(form.max_guests) || 50,
      host_email: currentUser?.email || ''
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
      setPromoForm({ code: '', discount_percent: 0, discount_amount: 0, expiry_date: '' });
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
          <h2 className="mt-1 text-2xl font-black text-zinc-950">Quản trị TravelBooking</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quản lý tour, đơn đặt, host và phân quyền người dùng.
          </p>
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

      <div className="border-b border-zinc-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTab)}
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={FileCheck2} label="Tour đang bán" value={stats.tours} tone="emerald" />
              <StatCard icon={Users} label="Người dùng" value={stats.users} tone="zinc" />
              <StatCard icon={Clock3} label="Đơn chờ duyệt" value={stats.pendingBookings} tone="amber" />
              <StatCard icon={ShieldCheck} label="Host chờ duyệt" value={stats.pendingHosts} tone="sky" />
              <StatCard icon={CheckCircle2} label="Doanh thu đã xác nhận" value={formatVnd(stats.confirmedRevenue)} tone="emerald" />
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
                <div className="border-b border-zinc-200 px-4 py-3 font-black text-zinc-950">Người dùng mới</div>
                <div className="divide-y divide-zinc-100">
                  {users.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <div className="font-bold text-zinc-900">{item.fullname}</div>
                        <div className="text-xs text-zinc-500">{item.email}</div>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 capitalize">
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
                <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Tên tour" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-2" />
                <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Địa điểm" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} placeholder="Thời lượng" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input type="number" min="1000" step="1000" value={form.price} onChange={(event) => updateForm('price', Number(event.target.value))} placeholder="Giá" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  <option value="" disabled>Chọn danh mục</option>
                  {dbCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
                <input type="number" min="1" value={form.max_guests} onChange={(event) => updateForm('max_guests', Number(event.target.value))} placeholder="Số chỗ (VD: 50)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={form.image} onChange={(event) => updateForm('image', event.target.value)} placeholder="URL ảnh, có thể để trống" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-2" />
                <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Mô tả tour (hiển thị khi khách xem chi tiết)" rows={3} className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 lg:col-span-4" />
                <div className="flex gap-2 lg:col-span-2">
                  <button type="submit" className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">Lưu</button>
                  <button type="button" onClick={resetForm} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100">Hủy</button>
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
                            <div className="font-bold text-zinc-900">{item.title}</div>
                            <div className="text-xs text-zinc-500">{item.location} · {item.duration}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{item.category}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatVnd(item.price)}</td>
                      <td className="px-4 py-3 text-zinc-600">{Number(item.rating || 0).toFixed(1)} ({item.reviews_count})</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => editExperience(item)} className="mr-2 rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50" aria-label="Sửa tour"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => deleteExperience(item.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" aria-label="Xóa tour"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {experiences.length === 0 && (
                    <tr><td colSpan={5}><EmptyRow text="Chưa có tour trong hệ thống." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'categories' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-zinc-950">Quản lý danh mục tour</h3>

            <form onSubmit={addCategory} className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Tên danh mục mới..."
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Thêm
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 mt-4">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Tên danh mục</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {dbCategories.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-zinc-500">#{item.id}</td>
                      <td className="px-4 py-3 font-bold text-zinc-900">{item.name}</td>
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
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Đơn</th>
                  <th className="px-4 py-3 text-left">Liên hệ</th>
                  <th className="px-4 py-3 text-left">Ngày đi</th>
                  <th className="px-4 py-3 text-left">Tổng tiền</th>
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
                    <td className="px-4 py-3 text-zinc-600">{booking.booking_date}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{formatVnd(booking.total_price)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={booking.status}
                        onChange={(event) => updateBookingStatus(booking.id, event.target.value as BookingTable['status'])}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold outline-none ${statusClass(booking.status)}`}
                      >
                        <option value="pending">Chờ xử lý</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
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
              <form onSubmit={savePromotion} className="mb-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                <h3 className="mb-6 text-lg font-black text-zinc-900">Thêm mã mới</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700">Mã giảm giá</span>
                    <input
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="VD: SUMMER2024"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700">Ngày hết hạn</span>
                    <input
                      type="date"
                      value={promoForm.expiry_date}
                      onChange={(e) => setPromoForm({ ...promoForm, expiry_date: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700">Giảm theo %</span>
                    <input
                      type="number"
                      value={promoForm.discount_percent}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_percent: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-zinc-700">Hoặc Giảm tiền mặt (VNĐ)</span>
                    <input
                      type="number"
                      value={promoForm.discount_amount}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_amount: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPromoForm(false)}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-200"
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

            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 font-bold text-zinc-900">
                  <tr>
                    <th className="p-4">Mã</th>
                    <th className="p-4">Giảm giá</th>
                    <th className="p-4">Hết hạn</th>
                    <th className="p-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {promotions.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className="p-4 font-bold">{p.code}</td>
                      <td className="p-4">{p.discount_percent ? `${p.discount_percent}%` : formatVnd(p.discount_amount)}</td>
                      <td className="p-4">{new Date(p.expiry_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
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
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Người dùng</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-bold text-zinc-900">{item.fullname}</td>
                    <td className="px-4 py-3 text-zinc-600">{item.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.role}
                          onChange={(event) => updateUserRole(item.id, event.target.value as UserTable['role'])}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 outline-none focus:border-emerald-500"
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
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Người đăng ký</th>
                  <th className="px-4 py-3 text-left">Thông tin liên hệ</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {hosts.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-bold text-zinc-900">{item.name}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      <div>{item.email}</div>
                      <div className="mt-1 font-semibold text-zinc-500">{item.phone}</div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-zinc-600 line-clamp-2" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => updateHostStatus(item.id, 'approved')}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Duyệt
                        </button>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          Đã duyệt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {hosts.length === 0 && (
                  <tr><td colSpan={4}><EmptyRow text="Chưa có đăng ký host." /></td></tr>
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

function AdminTable({ title, children }: { title: string; children: React.ReactNode }) {
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
