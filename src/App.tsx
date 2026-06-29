/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Phone,
  Route,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Heart
} from 'lucide-react';

import AdminPanel from './components/AdminPanel';
import CommunityFeed from './components/CommunityFeed';
import HostDashboard from './components/HostDashboard';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';
import Header from './components/Header';
import ModalBooking from './components/ModalBooking';
import ModalConfirm, { ConfirmConfig } from './components/ModalConfirm';
import ModalExperienceDetail from './components/ModalExperienceDetail';
import ModalLogin from './components/ModalLogin';
import UserProfile from './components/UserProfile';
import { ExperienceTable, formatDateVi, formatVnd, isExperienceOpen, ReviewTable } from './types';

type CurrentUser = { email: string; fullname: string; role: 'user' | 'admin' | 'host' };

const HALONG_IMAGE =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop';
const FALLBACK_IMAGE = HALONG_IMAGE;
const phonePattern = /^(0|\+84)[0-9\s.-]{8,13}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('currentUser');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceTable | null>(null);
  const [viewExperienceDetail, setViewExperienceDetail] = useState<ExperienceTable | null>(null);
  const [experiences, setExperiences] = useState<ExperienceTable[]>([]);
  const [reviews, setReviews] = useState<ReviewTable[]>([]);
  const [activeSection, setActiveSection] = useState('hero');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [reviewExperienceId, setReviewExperienceId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewImage, setReviewImage] = useState('');
  const [hostForm, setHostForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    id_number: '',
    experience_location: '',
    description: ''
  });
  const [hostMessage, setHostMessage] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [wishlists, setWishlists] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    fetchExperiences();
    fetchReviews();
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      setPromotions(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (experiences.length > 0 && reviewExperienceId === null) {
      setReviewExperienceId(experiences[0].id);
    }
  }, [experiences, reviewExperienceId]);

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchWishlists(user.email);
    } else {
      setWishlists([]);
    }
  }, [user]);

  const fetchWishlists = async (email: string) => {
    try {
      const res = await fetch(`/api/wishlists?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          setUser(null);
        }
        setWishlists([]);
        return;
      }
      const data = await res.json();
      setWishlists(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setWishlists([]); }
  };

  const toggleWishlist = async (experienceId: number) => {
    if (!user) {
      alert('Vui lòng đăng nhập để thêm vào danh sách yêu thích');
      setShowLoginModal(true);
      return;
    }
    try {
      const res = await fetch('/api/wishlists/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ user_email: user.email, experience_id: experienceId })
      });
      const data = await res.json();
      if (data.added) setWishlists([...wishlists, experienceId]);
      else setWishlists(wishlists.filter(id => id !== experienceId));
    } catch (e) { console.error(e); }
  };

  const visibleExperiences = useMemo(
    () => experiences.filter((item) => item.status !== 'hidden' && item.status !== 'suspended'),
    [experiences]
  );

  const categories = useMemo(
    () => Array.from(new Set(visibleExperiences.map((item) => item.category).filter(Boolean))),
    [visibleExperiences]
  );

  const filteredExperiences = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : Infinity;

    return visibleExperiences.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesKeyword =
        !keyword ||
        [item.title, item.location, item.category].some((value) =>
          value.toLowerCase().includes(keyword)
        );
      const matchesPrice = item.price >= min && item.price <= max;
      return matchesCategory && matchesKeyword && matchesPrice;
    });
  }, [visibleExperiences, searchTerm, selectedCategory, minPrice, maxPrice]);

  const fetchExperiences = async () => {
    try {
      const res = await fetch('/api/experiences');
      const data = await res.json();
      setExperiences(data || []);
    } catch (err) {
      console.error('Error fetching experiences:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLoginSuccess = (loggedUser: CurrentUser & { token?: string }) => {
    setUser(loggedUser);
    localStorage.setItem('currentUser', JSON.stringify(loggedUser));
    if (loggedUser.token) {
      localStorage.setItem('token', loggedUser.token);
    }
    setShowLoginModal(false);
    setActiveSection(loggedUser.role === 'admin' || loggedUser.role === 'host' ? 'dashboard' : 'hero');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setActiveSection('hero');
    alert('Đăng xuất thành công');
  };

  const handleBookClick = (experience: ExperienceTable) => {
    if (!user) {
      alert('Vui lòng đăng nhập để đặt tour.');
      setShowLoginModal(true);
      return;
    }

    if (!isExperienceOpen(experience)) {
      alert('Tour này chưa mở hoặc đã hết thời gian nhận đặt.');
      return;
    }

    setSelectedExperience(experience);
  };

  const handleViewDetails = (experience: ExperienceTable) => {
    setViewExperienceDetail(experience);
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!reviewExperienceId) {
      setReviewMessage('Vui lòng chọn tour cần đánh giá');
      return;
    }

    if (reviewComment.trim().length < 5) {
      setReviewMessage('Bình luận cần tối thiểu 5 ký tự');
      return;
    }

    setReviewLoading(true);
    setReviewMessage(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          experience_id: reviewExperienceId,
          user_email: user.email,
          fullname: user.fullname,
          rating: reviewRating,
          comment: reviewComment.trim(),
          images: reviewImage.trim() ? [reviewImage.trim()] : []
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi bình luận');
      }

      setReviewComment('');
      setReviewRating(5);
      setReviewImage('');
      setReviewMessage('Đã gửi bình luận thành công');
      await Promise.all([fetchReviews(), fetchExperiences()]);
    } catch (err: any) {
      setReviewMessage(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const submitHostApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    setHostMessage(null);

    if (!hostForm.name.trim() || !hostForm.email.trim() || !hostForm.phone.trim() || !hostForm.address.trim() || !hostForm.id_number.trim() || !hostForm.experience_location.trim() || !hostForm.description.trim()) {
      setHostMessage('Vui lòng nhập đầy đủ thông tin đăng ký host');
      return;
    }

    if (!emailPattern.test(hostForm.email.trim()) || !phonePattern.test(hostForm.phone.trim())) {
      setHostMessage('Email hoặc số điện thoại không hợp lệ');
      return;
    }

    if (!/^\d{12}$/.test(hostForm.id_number.trim())) {
      setHostMessage('Số CCCD/Passport phải gồm đúng 12 chữ số');
      return;
    }

    if (hostForm.description.trim().length < 20) {
      setHostMessage('Mô tả cần tối thiểu 20 ký tự');
      return;
    }

    setHostLoading(true);

    try {
      const res = await fetch('/api/hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: hostForm.name.trim(),
          email: hostForm.email.trim().toLowerCase(),
          phone: hostForm.phone.trim(),
          address: hostForm.address.trim(),
          id_number: hostForm.id_number.trim(),
          experience_location: hostForm.experience_location.trim(),
          description: hostForm.description.trim()
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi đăng ký host');
      }

      setHostForm({ name: '', email: '', phone: '', address: '', id_number: '', experience_location: '', description: '' });
      setHostMessage('Đã gửi đăng ký host thành công! Admin sẽ duyệt đơn của bạn.');
    } catch (err: any) {
      setHostMessage(err.message);
    } finally {
      setHostLoading(false);
    }
  };

  if (user?.role === 'admin' || user?.role === 'host') {
    return (
      <div className="min-h-screen bg-zinc-100 font-sans">
        <Header
          user={user}
          onOpenLogin={() => setShowLoginModal(true)}
          onLogout={handleLogout}
          onNavigate={scrollToSection}
          onOpenProfile={() => setShowUserProfile(true)}
          activeSection={activeSection === 'hero' ? 'dashboard' : activeSection}
          adminMode
        />

        <main id="dashboard" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {activeSection !== 'hero' && user?.role === 'admin' && (
              <AdminPanel onExperiencesChange={fetchExperiences} activeSection={activeSection === 'hero' ? 'dashboard' : activeSection} currentUser={user} />
            )}

            {activeSection !== 'hero' && user?.role === 'host' && (
              <HostDashboard onExperiencesChange={fetchExperiences} activeSection={activeSection === 'hero' ? 'dashboard' : activeSection} currentUser={user} />
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <Header
        user={user}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        onNavigate={scrollToSection}
        onOpenProfile={() => setShowUserProfile(true)}
        activeSection={activeSection}
      />

      {promotions.filter(p => p.is_active && p.description && (!p.usage_limit || p.used_count < p.usage_limit)).length > 0 && (
        <div className="bg-emerald-600 text-white overflow-hidden py-2 whitespace-nowrap">
          <div className="animate-marquee inline-block">
            {promotions.filter(p => p.is_active && p.description && (!p.usage_limit || p.used_count < p.usage_limit)).map(p => (
              <span key={p.id} className="mx-8 font-bold text-sm">
                🎉 {p.description}
              </span>
            ))}
          </div>
        </div>
      )}

      <section id="hero" className="bg-zinc-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Tour địa phương tại Việt Nam
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-zinc-950 sm:text-5xl">
              Đặt tour rõ giá, rõ lịch trình, có đánh giá thật từ người dùng.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              Khám phá Vịnh Hạ Long, Hội An, Bát Tràng, Sa Pa và nhiều trải nghiệm bản địa
              với quy trình đặt tour đơn giản, bình luận minh bạch.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollToSection('experiences')}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700"
              >
                Xem tour
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('host-register')}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-800 hover:bg-zinc-100"
              >
                Đăng ký làm host
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-5 grid grid-cols-2 gap-3 h-40 sm:h-52">
              <img
                src="data:image/jpeg;base64,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"
                alt="Ruộng bậc thang Sa Pa"
                className="h-full w-full rounded-2xl object-cover shadow-sm"
              />
              <img
                src={HALONG_IMAGE}
                alt="Vịnh Hạ Long"
                className="h-full w-full rounded-2xl object-cover shadow-sm"
              />
            </div>
            <img
              src="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1200&auto=format&fit=crop"
              alt="Phố cổ Hội An"
              className="col-span-5 h-32 w-full rounded-2xl object-cover shadow-sm sm:h-44"
            />
            <div className="col-span-5 grid gap-3 sm:grid-cols-3">
              <HeroStat icon={ShieldCheck} label="Bảo đảm an toàn" />
              <HeroStat icon={Star} label="Chất lượng" />
              <HeroStat icon={MessageSquare} label="Đánh giá chân thực" />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Về chúng tôi"
            title="Một quy trình đặt tour gọn, dễ kiểm soát"
            description="Khách xem tour và bình luận trước khi đăng nhập. Người dùng đã đăng nhập được đặt tour, hủy đơn đang chờ và gửi đánh giá."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={Route} title="Tour rõ thông tin" text="Mỗi tour có địa điểm, thời lượng, giá VNĐ, ảnh và danh mục để người dùng lọc nhanh." />
            <FeatureCard icon={HeartHandshake} title="Host cộng đồng" text="Kết nối du khách với các host và hướng dẫn viên địa phương đã được xác minh để mang lại trải nghiệm chân thực hơn." />
            <FeatureCard icon={CheckCircle2} title="Thông tin đặt tour chính xác" text="Email, số điện thoại, ngày khởi hành và số lượng khách được kiểm tra tự động để hạn chế sai sót khi đặt tour." />
          </div>
        </div>
      </section>

      <section id="experiences" className="bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Trải nghiệm"
            title="Tour đang mở bán"
            description="Chi phí tour được niêm yết theo VNĐ và cập nhật trực tiếp trên hệ thống. Tour chưa có đánh giá sẽ hiển thị 0.0 sao."
          />

          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên tour, địa điểm hoặc danh mục"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Giá từ..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 w-32"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Đến giá..."
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 w-32"
            />
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-bold text-zinc-700 outline-none focus:border-emerald-500"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(experience.id); }}
                      className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-zinc-400 hover:text-rose-500 shadow-sm"
                    >
                      <Heart className={`h-4 w-4 ${wishlists.includes(experience.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-600" />{experience.location}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-emerald-600" />{experience.duration}</span>
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
                        Tối đa {Number(experience.daily_capacity_max ?? experience.daily_capacity ?? experience.max_guests ?? 50)} khách/ngày
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        Nhận đặt: {formatDateVi(experience.booking_open_date)} - {formatDateVi(experience.booking_close_date)}
                      </span>
                      {(experience.rooms || experience.beds) ? (
                        <span className="inline-flex items-center gap-1.5 text-zinc-500">
                          {experience.rooms ? `${experience.rooms} phòng` : ''}
                          {(experience.rooms && experience.beds) ? ' · ' : ''}
                          {experience.beds ? `${experience.beds} giường` : ''}
                        </span>
                      ) : null}
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
                          onClick={() => handleViewDetails(experience)}
                          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-600 hover:bg-zinc-50"
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBookClick(experience)}
                          disabled={!isExperienceOpen(experience)}
                          className={`flex-1 rounded-xl px-4 py-2 text-sm font-black text-white ${isExperienceOpen(experience) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-zinc-400 cursor-not-allowed'}`}
                        >
                          {isExperienceOpen(experience) ? 'Đặt ngay' : 'Chờ mở lại'}
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
        </div>
      </section>

      <section id="reviews" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeader
              eyebrow="Bình luận"
              title="Đánh giá từ người dùng"
              description="Người dùng đã đăng nhập có thể gửi đánh giá bằng số sao và bình luận. Điểm đánh giá trung bình của tour được cập nhật tự động dựa trên phản hồi từ khách hàng."
            />

            <form onSubmit={submitReview} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <select
                value={reviewExperienceId ?? ''}
                onChange={(event) => setReviewExperienceId(Number(event.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-700 outline-none focus:border-emerald-500"
              >
                {experiences.map((experience) => (
                  <option key={experience.id} value={experience.id}>{experience.title}</option>
                ))}
              </select>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewRating(value)}
                    className={`rounded-lg border p-2 ${reviewRating >= value ? 'border-amber-200 bg-amber-50 text-amber-500' : 'border-zinc-200 bg-white text-zinc-300'}`}
                    aria-label={`${value} sao`}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder={user ? 'Chia sẻ cảm nhận của bạn...' : 'Đăng nhập để gửi bình luận'}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />

              <input
                type="url"
                value={reviewImage}
                onChange={(event) => setReviewImage(event.target.value)}
                placeholder="Đường dẫn hình ảnh minh họa (không bắt buộc)"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />

              {reviewMessage && (
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-700">
                  {reviewMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={reviewLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
              >
                <Send className="h-4 w-4" />
                {user ? 'Gửi bình luận' : 'Đăng nhập để bình luận'}
              </button>
            </form>
          </div>

          <div className="grid gap-3">
            {reviews.slice(0, 6).map((review) => {
              const tour = experiences.find((item) => item.id === review.experience_id);

              return (
                <div key={review.id} className="rounded-2xl border border-zinc-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-zinc-950">{review.fullname}</div>
                      <div className="text-xs font-semibold text-zinc-500">{tour?.title || 'Tour đã đánh giá'}</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-black text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      {review.rating}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{review.comment}</p>

                  {review.images && JSON.parse(review.images).length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                      {JSON.parse(review.images).map((imgUrl: string, idx: number) => (
                        <img key={idx} src={imgUrl} alt="Review" className="h-20 w-20 rounded-lg object-cover border border-zinc-200 shrink-0" />
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-xs font-semibold text-zinc-400">
                    {new Date(review.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              );
            })}
            {reviews.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm font-semibold text-zinc-500">
                Chưa có bình luận nào. Hãy là người đầu tiên đánh giá tour.
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Cách hoạt động"
            title="Ba bước để hoàn tất đặt tour"
            description="Quy trình được giữ ngắn để người dùng mới cũng thao tác nhanh."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StepCard step="1" title="Chọn tour" text="Khám phá các tour theo địa điểm, danh mục và ngân sách phù hợp với nhu cầu của bạn." />
            <StepCard step="2" title="Đăng nhập và đặt" text="Chọn ngày khởi hành, số lượng khách và hoàn tất thông tin liên hệ để gửi yêu cầu đặt tour." />
            <StepCard step="3" title="Chờ phản hồi" text="Yêu cầu của bạn sẽ được xem xét và xác nhận trong thời gian sớm nhất qua email hoặc hệ thống." />
          </div>
        </div>
      </section>

      <section id="host-register" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeader
              eyebrow="Cộng đồng"
              title="Đăng ký trở thành host địa phương"
              description="Gửi thông tin của bạn và chờ duyệt. Host được duyệt có thể được liên hệ để mở tour mới."
            />

            <form onSubmit={submitHostApplication} className="mt-6 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <input value={hostForm.name} onChange={(event) => setHostForm((current) => ({ ...current, name: event.target.value }))} placeholder="Họ tên" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={hostForm.email} onChange={(event) => setHostForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                <input value={hostForm.phone} onChange={(event) => setHostForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Số điện thoại" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              </div>
              <input value={hostForm.address} onChange={(event) => setHostForm((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ (VD: 123 Nguyễn Văn Cừ, Q.5, TP.HCM)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={hostForm.id_number} onChange={(event) => setHostForm((current) => ({ ...current, id_number: event.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="Số CCCD/Passport (12 số)" maxLength={12} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                <input value={hostForm.experience_location} onChange={(event) => setHostForm((current) => ({ ...current, experience_location: event.target.value }))} placeholder="Địa điểm trải nghiệm (VD: Vịnh Hạ Long, Hội An)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              </div>
              <textarea value={hostForm.description} onChange={(event) => setHostForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Bạn muốn tổ chức trải nghiệm gì? Mô tả tối thiểu 20 ký tự." className="resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              {hostMessage && (
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-700">
                  {hostMessage}
                </div>
              )}
              <button
                type="submit"
                disabled={hostLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
              >
                <UserPlus className="h-4 w-4" />
                Gửi đăng ký host
              </button>
            </form>
          </div>

          <div className="rounded-2xl">
            <div className="rounded-2xl border border-zinc-200 p-5 bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Chuyến đi của tôi</p>
                  <h3 className="mt-1 text-xl font-black text-zinc-950">Đơn đã đặt</h3>
                </div>
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="mt-5 rounded-xl border border-dashed border-zinc-300 p-6 text-sm font-semibold text-zinc-500">
                {user ? 'Truy cập trang cá nhân của bạn ở góc trên bên phải để xem đơn đã đặt.' : 'Đăng nhập để xem hồ sơ và các đơn tour đã đặt.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 7: Community Feed Section */}
      <section
        id="community"
        className="bg-zinc-50 py-16"
      >
        <CommunityFeed
          currentUser={user}
          onLogin={() => setShowLoginModal(true)}
        />
      </section>

      <FAQSection />
      <Footer onNavigate={scrollToSection} />

      {showLoginModal && (
        <ModalLogin
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showUserProfile && user && (
        <UserProfile
          user={{ email: user.email, fullname: user.fullname }}
          onClose={() => setShowUserProfile(false)}
        />
      )}

      {selectedExperience && user && (
        <ModalBooking
          experience={selectedExperience}
          userEmail={user.email}
          onClose={() => setSelectedExperience(null)}
          onBookingSuccess={() => {
            fetchExperiences();
            scrollToSection('community');
          }}
        />
      )}

      {viewExperienceDetail && (
        <ModalExperienceDetail
          experience={viewExperienceDetail}
          onClose={() => setViewExperienceDetail(null)}
          onBook={() => {
            setViewExperienceDetail(null);
            handleBookClick(viewExperienceDetail);
          }}
        />
      )}

      {confirmConfig && (
        <ModalConfirm
          {...confirmConfig}
          onClose={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-black text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p>
    </div>
  );
}

function StepCard({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-sm font-black text-white">
        {step}
      </div>
      <h3 className="font-black text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-black text-zinc-800">
      <Icon className="h-4 w-4 text-emerald-600" />
      {label}
    </div>
  );
}


