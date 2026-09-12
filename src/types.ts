/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared schema models mirroring MySQL relational tables
export interface UserTable {
  id: number;
  email: string;
  password?: string;
  role: 'user' | 'admin' | 'host';
  fullname: string;
  avatar?: string;
  phone?: string;
  address?: string;
}

export interface ExperienceTable {
  id: number;
  title: string;
  location: string;
  duration: string;
  price: number;
  image: string;
  category: string;
  description: string;
  meeting_point?: string;
  itinerary?: string;
  included?: string;
  excluded?: string;
  cancellation_policy?: string;
  cancellation_cutoff_hours?: number;
  no_show_policy?: string;
  rating: number;
  host_count: number;
  reviews_count: number;
  max_guests?: number;         // tổng số khách tối đa cho toàn bộ tour
  daily_capacity?: number;     // số khách tối đa trong 1 ngày (deprecated - will be removed)
  daily_capacity_max?: number; // số khách tối đa nhận mỗi ngày (field mới rõ nghĩa)
  booking_open_date?: string;
  booking_close_date?: string;
  host_email?: string;
  rooms?: number;
  beds?: number;
  amenities?: string;
  images?: string;
  registration_open_date?: string;
  registration_close_date?: string;
  status?: 'active' | 'hidden' | 'suspended' | 'closed' | 'pending_review' | 'draft' | 'pending_update';
  allow_children?: boolean;
  min_age?: number;
  child_max_age?: number;
  child_price?: number;
  previous_state?: string;
}

export interface TourScheduleTable {
  id: number;
  experience_id: number;
  start_date: string;
  end_date: string;
  meeting_time: string;
  max_slots: number;
  remaining_slots: number;
  created_at: string;
}

export interface BookingTable {
  id: number;
  user_email: string;
  experience_id: number;
  booking_date: string;
  guests: number;
  adults?: number;
  children?: number;
  contact_name: string;
  contact_phone: string;
  note: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'no_show' | 'cancelled';
  created_at: string;
  schedule_id?: number;
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  refund_status?: 'none' | 'pending' | 'completed';
  commission_amount?: number;
  host_earnings?: number;
  experience_title?: string;
  host_email?: string;
}

export interface SupportTicketTable {
  id: number;
  booking_id: number;
  user_email: string;
  host_email?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'normal' | 'urgent';
  admin_note?: string;
  created_at: string;
  updated_at: string;
  experience_title?: string;
  contact_name?: string;
  booking_status?: BookingTable['status'];
}

export interface WishlistTable {
  id: number;
  user_email: string;
  experience_id: number;
}

export interface PromotionTable {
  id: number;
  code: string;
  discount_percent: number;
  discount_amount: number;
  expiry_date: string;
  is_active: boolean;
  experience_id?: number | null;
  usage_limit?: number;
  used_count?: number;
  description?: string;
}

export interface HostApplicationTable {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  id_number: string;
  experience_location: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  avatar?: string;
  created_at: string;
}

export interface ReviewTable {
  id: number;
  experience_id: number;
  user_email: string;
  fullname: string;
  rating: number;
  comment: string;
  images?: string;
  created_at: string;
}

export interface HostReviewTable {
  id: number;
  booking_id: number;
  host_email: string;
  guest_email: string;
  guest_name?: string;
  experience_title?: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Phase 7: Community Feed
export interface PostTable {
  id: number;
  user_email: string;
  fullname: string;
  user_avatar?: string;
  role: 'user' | 'admin' | 'host';
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  status: 'active' | 'hidden' | 'deleted';
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  experience_id?: number;
}

export interface PostCommentTable {
  id: number;
  post_id: number;
  user_email: string;
  fullname: string;
  user_avatar?: string;
  comment: string;
  parent_id?: number;
  created_at: string;
}

export interface PostReactionTable {
  id: number;
  post_id: number;
  user_email: string;
  reaction_type: 'like' | 'love' | 'wow' | 'haha' | 'sad' | 'angry';
}

export interface CommentReactionTable {
  id: number;
  comment_id: number;
  user_email: string;
  reaction_type: 'like' | 'love' | 'wow' | 'haha' | 'sad' | 'angry';
}

export const formatVnd = (value: number) => {
  const lang = localStorage.getItem('lang') || 'vi';
  if (lang === 'en') {
    const gbp = Number(value || 0) / 32000;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(gbp);
  }
  return `${Number(value || 0).toLocaleString('vi-VN')} VN\u0110`;
};

export const todayIso = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export const isScheduleBookable = (schedule: TourScheduleTable) => {
  const now = new Date();
  const vietnamDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
  if (schedule.start_date !== vietnamDate) return schedule.start_date > vietnamDate;
  const vietnamTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now);
  return (schedule.meeting_time || '08:00') > vietnamTime;
};

export const formatDateVi = (value?: string) => {
  if (!value) return 'Chưa cập nhật';
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
};

export const isExperienceOpen = (exp: ExperienceTable) => {
  const today = new Date().toISOString().split('T')[0];
  if (exp.status === 'pending_update') return false; // Hiện nhưng không cho đặt
  return exp.status === 'active' &&
    (!exp.booking_open_date || exp.booking_open_date <= today) &&
    (!exp.booking_close_date || exp.booking_close_date >= today);
};
