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
  rating: number;
  host_count: number;
  reviews_count: number;
  max_guests?: number;
  host_email?: string;
}

export interface BookingTable {
  id: number;
  user_email: string;
  experience_id: number;
  booking_date: string;
  guests: number;
  contact_name: string;
  contact_phone: string;
  note: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  experience_title?: string;
  host_email?: string;
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
}

export interface HostApplicationTable {
  id: number;
  name: string;
  email: string;
  phone: string;
  description: string;
  status: 'pending' | 'approved';
  created_at: string;
}

export interface ReviewTable {
  id: number;
  experience_id: number;
  user_email: string;
  fullname: string;
  rating: number;
  comment: string;
  created_at: string;
}

export const formatVnd = (value: number) =>
  `${Number(value || 0).toLocaleString('vi-VN')} VN\u0110`;
