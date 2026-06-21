/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';
import {
  BookingTable,
  ExperienceTable,
  HostApplicationTable,
  HostReviewTable,
  PostCommentTable,
  PostReactionTable,
  PostTable,
  ReviewTable,
  TourScheduleTable,
  UserTable
} from './src/types.js';

dotenv.config();

type UserRow = UserTable & RowDataPacket;
type ExperienceRow = ExperienceTable & RowDataPacket;
type BookingRow = BookingTable & RowDataPacket;
type HostApplicationRow = HostApplicationTable & RowDataPacket;
type HostReviewRow = HostReviewTable & RowDataPacket;
type ReviewRow = ReviewTable & RowDataPacket;
type ScheduleRow = TourScheduleTable & RowDataPacket;
type PostRow = PostTable & RowDataPacket;
type PostCommentRow = PostCommentTable & RowDataPacket;
type PostReactionRow = PostReactionTable & RowDataPacket;
type ColumnCountRow = RowDataPacket & { count: number };

const dbName = process.env.DB_DATABASE || 'local_experience_db';
const HALONG_IMAGE =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop';
const DEFAULT_DESCRIPTION =
  'Tour trải nghiệm địa phương được thiết kế để du khách hiểu rõ văn hóa, cảnh quan và nhịp sống bản địa. Lịch trình phù hợp cho nhóm nhỏ, có host hướng dẫn và thông tin chi phí minh bạch.';
const HALONG_DESCRIPTION =
  'Khám phá Vịnh Hạ Long bằng du thuyền trong ngày, đi qua các cụm đảo đá vôi, làng chài và những điểm ngắm cảnh nổi bật. Tour phù hợp cho du khách muốn có một lịch trình gọn, dễ đặt và nhiều thời gian chụp ảnh.';
const COOKING_DESCRIPTION =
  'Cùng host địa phương đi chợ, chọn nguyên liệu và học nấu các món Việt quen thuộc. Trải nghiệm tập trung vào kỹ thuật nấu ăn, câu chuyện ẩm thực vùng miền và bữa ăn chung cuối buổi.';
const CRAFT_DESCRIPTION =
  'Tìm hiểu quy trình làm gốm thủ công, thử tạo hình sản phẩm và nghe nghệ nhân chia sẻ về làng nghề. Hoạt động phù hợp cho gia đình, nhóm bạn hoặc du khách thích trải nghiệm sáng tạo.';
const TREKKING_DESCRIPTION =
  'Đi bộ qua ruộng bậc thang, bản làng và các cung đường núi ở Sa Pa cùng người dẫn địa phương. Lịch trình cân bằng giữa vận động, ngắm cảnh và tìm hiểu đời sống cộng đồng.';
const isTiDB = (process.env.DB_HOST || '').includes('tidbcloud.com');

const baseConnection: mysql.ConnectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 3306,
  ...(isTiDB ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {})
};

const pool = mysql.createPool({
  ...baseConnection,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

const toNumber = (value: unknown) => Number(value ?? 0);

const toDateString = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? '');
};

const toDateTimeString = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value ?? '');
};

const normalizeExperience = (row: ExperienceRow): ExperienceTable => {
  const reviewsCount = toNumber(row.reviews_count);
  const maxGuests = toNumber(row.max_guests) || 50;
  // daily_capacity_max: new explicit field; fallback to daily_capacity then max_guests
  const dailyCapacityMax = toNumber(row.daily_capacity_max) || toNumber(row.daily_capacity) || maxGuests;

  return {
    ...row,
    id: toNumber(row.id),
    price: toNumber(row.price),
    rating: reviewsCount > 0 ? toNumber(row.rating) : 0,
    host_count: toNumber(row.host_count),
    reviews_count: reviewsCount,
    max_guests: maxGuests,
    daily_capacity: dailyCapacityMax, // keep for backward compat
    daily_capacity_max: dailyCapacityMax,
    booking_open_date: toDateString(row.booking_open_date),
    booking_close_date: toDateString(row.booking_close_date),
    registration_open_date: toDateString(row.registration_open_date),
    registration_close_date: toDateString(row.registration_close_date),
    rooms: toNumber(row.rooms),
    beds: toNumber(row.beds),
    amenities: row.amenities ?? '[]',
    images: row.images ?? '[]'
  };
};

const normalizeSchedule = (row: ScheduleRow): TourScheduleTable => ({
  ...row,
  id: toNumber(row.id),
  experience_id: toNumber(row.experience_id),
  max_slots: toNumber(row.max_slots),
  remaining_slots: toNumber(row.remaining_slots),
  start_date: toDateString(row.start_date),
  end_date: toDateString(row.end_date),
  created_at: toDateTimeString(row.created_at)
});

const normalizeBooking = (row: BookingRow): BookingTable => ({
  ...row,
  id: toNumber(row.id),
  experience_id: toNumber(row.experience_id),
  guests: toNumber(row.guests),
  total_price: toNumber(row.total_price),
  schedule_id: row.schedule_id ? toNumber(row.schedule_id) : undefined,
  commission_amount: toNumber(row.commission_amount),
  host_earnings: toNumber(row.host_earnings),
  refund_status: row.refund_status as 'none' | 'pending' | 'completed' | undefined,
  booking_date: toDateString(row.booking_date),
  created_at: toDateTimeString(row.created_at)
});

const normalizeHost = (row: HostApplicationRow): HostApplicationTable => ({
  ...row,
  id: toNumber(row.id),
  created_at: toDateTimeString(row.created_at)
});

const normalizeReview = (row: ReviewRow): ReviewTable => ({
  ...row,
  id: toNumber(row.id),
  experience_id: toNumber(row.experience_id),
  rating: toNumber(row.rating),
  images: row.images ?? '[]',
  created_at: toDateTimeString(row.created_at)
});

const normalizeHostReview = (row: HostReviewRow): HostReviewTable => ({
  ...row,
  id: toNumber(row.id),
  booking_id: toNumber(row.booking_id),
  rating: toNumber(row.rating),
  created_at: toDateTimeString(row.created_at)
});

const normalizePost = (row: PostRow): PostTable => ({
  ...row,
  id: toNumber(row.id),
  likes_count: toNumber(row.likes_count),
  comments_count: toNumber(row.comments_count),
  created_at: toDateTimeString(row.created_at)
});

const normalizePostComment = (row: PostCommentRow): PostCommentTable => ({
  ...row,
  id: toNumber(row.id),
  post_id: toNumber(row.post_id),
  created_at: toDateTimeString(row.created_at)
});

const normalizePostReaction = (row: PostReactionRow): PostReactionTable => ({
  ...row,
  id: toNumber(row.id),
  post_id: toNumber(row.post_id)
});

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection(baseConnection);
  const safeDbName = dbName.replace(/`/g, '``');
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${safeDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

class RelationalDatabase {
  public async ensureSchema(): Promise<void> {
    await ensureDatabaseExists();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'host') NOT NULL DEFAULT 'user',
        fullname VARCHAR(255) NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    try { await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'host') NOT NULL DEFAULT 'user'"); } catch (e: any) { }

    await pool.query(`
      INSERT INTO users (email, password, role, fullname)
      SELECT * FROM (
        SELECT 'admin@gmail.com' AS email, '${bcrypt.hashSync('admin123', 10)}' AS password, 'admin' AS role, 'Admin' AS fullname
        UNION ALL
        SELECT 'user@gmail.com' AS email, '${bcrypt.hashSync('user123', 10)}' AS password, 'user' AS role, 'User' AS fullname
      ) seed
      WHERE NOT EXISTS (SELECT 1 FROM users)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      INSERT INTO categories (name)
      SELECT * FROM (
        SELECT 'Thiên nhiên' UNION ALL
        SELECT 'Ẩm thực' UNION ALL
        SELECT 'Văn hóa' UNION ALL
        SELECT 'Phiêu lưu'
      ) seed
      WHERE NOT EXISTS (SELECT 1 FROM categories)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS experiences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        duration VARCHAR(120) NOT NULL,
        price DECIMAL(12, 0) NOT NULL DEFAULT 0,
        image TEXT NOT NULL,
        category VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        rating DECIMAL(3, 1) NOT NULL DEFAULT 0,
        host_count INT NOT NULL DEFAULT 1,
        reviews_count INT NOT NULL DEFAULT 0,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    try {
      await pool.query('ALTER TABLE experiences ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE');
    } catch (e: any) {
      // Ignore if exists
    }

    try {
      await pool.query('ALTER TABLE experiences ADD COLUMN description TEXT NOT NULL AFTER category');
    } catch (e: any) {
      // Ignore error if column already exists
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        experience_id INT NOT NULL,
        booking_date DATE NOT NULL,
        guests INT NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(30) NOT NULL,
        note TEXT,
        total_price DECIMAL(12, 0) NOT NULL DEFAULT 0,
        status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hosts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        address VARCHAR(500) NOT NULL DEFAULT '',
        id_number VARCHAR(20) NOT NULL DEFAULT '',
        experience_location VARCHAR(500) NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Migration: add new host columns for existing databases
    try { await pool.query("ALTER TABLE hosts ADD COLUMN address VARCHAR(500) NOT NULL DEFAULT '' AFTER phone"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE hosts ADD COLUMN id_number VARCHAR(20) NOT NULL DEFAULT '' AFTER address"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE hosts ADD COLUMN experience_location VARCHAR(500) NOT NULL DEFAULT '' AFTER id_number"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE hosts MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending'"); } catch (e: any) { }

    // Migration: add new booking columns for Phase 3
    try { await pool.query("ALTER TABLE bookings ADD COLUMN schedule_id INT DEFAULT NULL AFTER experience_id"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE bookings ADD COLUMN payment_status ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid' AFTER status"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE bookings ADD COLUMN commission_amount DECIMAL(12, 0) NOT NULL DEFAULT 0 AFTER total_price"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE bookings ADD COLUMN host_earnings DECIMAL(12, 0) NOT NULL DEFAULT 0 AFTER commission_amount"); } catch (e: any) { }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        experience_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        experience_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_exp (user_email, experience_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    try { await pool.query('ALTER TABLE wishlists ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'); } catch (e: any) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_percent INT DEFAULT 0,
        discount_amount DECIMAL(12, 0) DEFAULT 0,
        expiry_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    try { await pool.query('ALTER TABLE experiences ADD COLUMN max_guests INT NOT NULL DEFAULT 50'); } catch (e: any) { }
    try { await pool.query('ALTER TABLE experiences ADD COLUMN booking_open_date DATE NULL'); } catch (e: any) { }
    try { await pool.query('ALTER TABLE experiences ADD COLUMN booking_close_date DATE NULL'); } catch (e: any) { }
    try { await pool.query('ALTER TABLE experiences ADD COLUMN host_email VARCHAR(255)'); } catch (e: any) { }
    // Phase 2: new experience columns
    try { await pool.query('ALTER TABLE experiences ADD COLUMN rooms INT NOT NULL DEFAULT 0'); } catch (e: any) { }
    try { await pool.query('ALTER TABLE experiences ADD COLUMN beds INT NOT NULL DEFAULT 0'); } catch (e: any) { }
    try { await pool.query("ALTER TABLE experiences ADD COLUMN amenities TEXT"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE experiences ADD COLUMN images TEXT"); } catch (e: any) { }
    await pool.query("UPDATE experiences SET amenities = '[]' WHERE amenities IS NULL");
    await pool.query("UPDATE experiences SET images = '[]' WHERE images IS NULL");
    try { await pool.query("ALTER TABLE experiences ADD COLUMN allow_children BOOLEAN DEFAULT TRUE"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE experiences ADD COLUMN min_age INT DEFAULT 0"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE experiences ADD COLUMN child_max_age INT DEFAULT 12"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE experiences ADD COLUMN child_price DECIMAL(12, 0) DEFAULT NULL"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE bookings ADD COLUMN adults INT"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE bookings ADD COLUMN children INT"); } catch (e: any) { }

    // Phase 1: Migration cho Daily Quota và Refund
    try { await pool.query('ALTER TABLE experiences ADD COLUMN daily_capacity INT NOT NULL DEFAULT 0 AFTER max_guests'); } catch (e: any) { }
    try { await pool.query('ALTER TABLE experiences ADD COLUMN registration_open_date DATE NULL AFTER booking_close_date'); } catch (e: any) { }
    try { await pool.query('ALTER TABLE experiences ADD COLUMN registration_close_date DATE NULL AFTER registration_open_date'); } catch (e: any) { }
    try { await pool.query("ALTER TABLE experiences ADD COLUMN status ENUM('active', 'hidden', 'suspended', 'closed', 'pending_review', 'draft', 'pending_update') NOT NULL DEFAULT 'draft' AFTER is_deleted"); } catch (e: any) { }
    // Phase new: add daily_capacity_max as a distinct field from total max_guests
    try { await pool.query('ALTER TABLE experiences ADD COLUMN daily_capacity_max INT NOT NULL DEFAULT 0 AFTER daily_capacity'); } catch (e: any) { }
    // Modify status enum to include new values if needed
    try { await pool.query("ALTER TABLE experiences MODIFY COLUMN status ENUM('active', 'hidden', 'suspended', 'closed', 'pending_review', 'draft', 'pending_update') NOT NULL DEFAULT 'draft'"); } catch (e: any) { }
    await pool.query("UPDATE experiences SET daily_capacity = max_guests, registration_open_date = booking_open_date, registration_close_date = booking_close_date WHERE daily_capacity = 0");
    await pool.query("UPDATE experiences SET daily_capacity_max = daily_capacity WHERE daily_capacity_max = 0");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS experience_daily_quotas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        experience_id INT NOT NULL,
        booking_date DATE NOT NULL,
        max_capacity INT NOT NULL,
        booked_count INT NOT NULL DEFAULT 0,
        UNIQUE KEY unique_exp_date (experience_id, booking_date),
        CONSTRAINT fk_quota_exp FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    try {
      await pool.query(`
        INSERT INTO experience_daily_quotas (experience_id, booking_date, max_capacity, booked_count)
        SELECT b.experience_id, b.booking_date, e.daily_capacity, SUM(b.guests) as booked_count
        FROM bookings b JOIN experiences e ON b.experience_id = e.id
        WHERE b.status != 'cancelled' AND b.schedule_id IS NULL
        GROUP BY b.experience_id, b.booking_date, e.daily_capacity
        ON DUPLICATE KEY UPDATE booked_count = VALUES(booked_count)
      `);
    } catch (e: any) { }

    try { await pool.query("ALTER TABLE bookings ADD COLUMN refund_status ENUM('none', 'pending', 'completed') NOT NULL DEFAULT 'none' AFTER payment_status"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NULL"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE users ADD COLUMN address TEXT NULL"); } catch (e: any) { }
    try { await pool.query("ALTER TABLE hosts ADD COLUMN avatar VARCHAR(500) NULL"); } catch (e: any) { }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('success', 'error', 'info', 'warning') NOT NULL DEFAULT 'info',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (user_email)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);


    // Phase 2: tour_schedules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tour_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        experience_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        max_slots INT NOT NULL DEFAULT 20,
        remaining_slots INT NOT NULL DEFAULT 20,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_experience (experience_id),
        CONSTRAINT fk_schedule_experience FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    // Phase 6: host_reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS host_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL UNIQUE,
        host_email VARCHAR(255) NOT NULL,
        guest_email VARCHAR(255) NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_host (host_email),
        INDEX idx_guest (guest_email)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Phase 7: Community Feed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'host') NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        media_url VARCHAR(1000),
        media_type ENUM('image', 'video'),
        status ENUM('active', 'hidden', 'deleted') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_post_email (user_email),
        INDEX idx_post_status (status)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        reaction_type ENUM('like', 'love', 'wow', 'haha', 'sad', 'angry') NOT NULL,
        UNIQUE KEY unique_user_reaction (post_id, user_email),
        CONSTRAINT fk_reaction_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      UPDATE experiences
      SET
        booking_open_date = COALESCE(booking_open_date, CURDATE()),
        booking_close_date = COALESCE(booking_close_date, DATE_ADD(CURDATE(), INTERVAL 90 DAY))
    `);
    await pool.query(`
      INSERT INTO experiences
        (title, location, duration, price, image, category, description, rating, host_count, reviews_count)
      SELECT *
      FROM (
        SELECT
          'Du thuyền Vịnh Hạ Long' AS title,
          'Quảng Ninh' AS location,
          '1 ngày' AS duration,
          890000 AS price,
          '${HALONG_IMAGE}' AS image,
          'Thiên nhiên' AS category,
          '${HALONG_DESCRIPTION}' AS description,
          0 AS rating,
          3 AS host_count,
          0 AS reviews_count
        UNION ALL
        SELECT
          'Lớp nấu món Việt cùng người bản địa',
          'Hội An',
          '4 giờ',
          450000,
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200&auto=format&fit=crop',
          'Ẩm thực',
          '${COOKING_DESCRIPTION}',
          0,
          2,
          0
        UNION ALL
        SELECT
          'Trải nghiệm làm gốm thủ công',
          'Bát Tràng',
          '3 giờ',
          320000,
          'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=1200&auto=format&fit=crop',
          'Văn hóa',
          '${CRAFT_DESCRIPTION}',
          0,
          4,
          0
        UNION ALL
        SELECT
          'Trekking ruộng bậc thang',
          'Sa Pa',
          '2 ngày 1 đêm',
          1250000,
          'https://images.unsplash.com/photo-1542318047-9572565651c3?q=80&w=1200&auto=format&fit=crop',
          'Phiêu lưu',
          '${TREKKING_DESCRIPTION}',
          0,
          5,
          0
      ) seed
      WHERE NOT EXISTS (SELECT 1 FROM experiences)
    `);

    await pool.query(`
      UPDATE experiences
      SET
        booking_open_date = COALESCE(booking_open_date, CURDATE()),
        booking_close_date = COALESCE(booking_close_date, DATE_ADD(CURDATE(), INTERVAL 90 DAY))
    `);

    await pool.query(
      `UPDATE experiences
       SET image = ?
       WHERE title LIKE ?
          OR title LIKE ?
          OR title LIKE ?
          OR location LIKE ?
          OR location LIKE ?
          OR location LIKE ?`,
      [HALONG_IMAGE, '%Hạ Long%', '%Ha Long%', '%Halong%', '%Hạ Long%', '%Ha Long%', '%Halong%']
    );

    // Replace old broken fallback image
    await pool.query(
      `UPDATE experiences SET image = ? WHERE image LIKE '%photo-1761127138372-cad230082b19%'`,
      [HALONG_IMAGE]
    );

    await pool.query(`
      UPDATE experiences e
      SET
        reviews_count = (SELECT COUNT(*) FROM reviews r WHERE r.experience_id = e.id),
        rating = COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.experience_id = e.id), 0)
    `);
  }

  public async findUser(email: string): Promise<UserTable | undefined> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email.trim()]
    );
    return rows[0];
  }

  public async getUsers(): Promise<UserTable[]> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, email, role, fullname FROM users ORDER BY id DESC'
    );
    return rows;
  }

  public async deleteUser(id: number): Promise<boolean> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  public async updateUserRole(id: number, role: 'user' | 'admin' | 'host'): Promise<UserTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy người dùng');
    }

    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, email, role, fullname FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0];
  }

  public async registerUser(user: Omit<UserTable, 'id'>): Promise<UserTable> {
    const normalizedEmail = user.email.trim().toLowerCase();
    const existing = await this.findUser(normalizedEmail);

    if (existing) {
      throw new Error('Email đã được đăng ký trên hệ thống');
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO users (email, password, role, fullname) VALUES (?, ?, ?, ?)',
      [normalizedEmail, hashedPassword, user.role, user.fullname.trim()]
    );

    return {
      ...user,
      email: normalizedEmail,
      fullname: user.fullname.trim(),
      id: result.insertId
    };
  }

  public async updateUserProfile(email: string, payload: any): Promise<boolean> {
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const allowedFields = ['fullname', 'password', 'avatar', 'phone', 'address'] as const;
    const entries = allowedFields
      .filter((field) => payload[field] !== undefined)
      .map((field) => [field, payload[field]] as const);

    if (entries.length === 0) return false;

    const setClause = entries.map(([field]) => `${field} = ?`).join(', ');
    const values = entries.map(([, value]) => value);

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `UPDATE users SET ${setClause} WHERE LOWER(email) = LOWER(?)`,
      [...values, email.trim()]
    );

    return result.affectedRows > 0;
  }

  public async getExperiences(): Promise<ExperienceTable[]> {
    const [rows] = await pool.query<ExperienceRow[]>(
      'SELECT * FROM experiences WHERE is_deleted = FALSE ORDER BY id DESC'
    );
    return rows.map(normalizeExperience);
  }

  public async addExperience(exp: Omit<ExperienceTable, 'id'>): Promise<ExperienceTable> {
    const dailyCapMax = exp.daily_capacity_max ?? exp.daily_capacity ?? exp.max_guests ?? 50;
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO experiences
        (title, location, duration, price, image, category, description, rating, host_count, reviews_count, max_guests, daily_capacity, daily_capacity_max, booking_open_date, booking_close_date, host_email, rooms, beds, amenities, images, status, allow_children, min_age, child_max_age, child_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exp.title,
        exp.location,
        exp.duration,
        exp.price,
        exp.image,
        exp.category,
        exp.description || DEFAULT_DESCRIPTION,
        exp.rating,
        exp.host_count,
        exp.reviews_count,
        exp.max_guests ?? 50,
        dailyCapMax,
        dailyCapMax,
        exp.booking_open_date ?? null,
        exp.booking_close_date ?? null,
        exp.host_email ?? null,
        exp.rooms ?? 0,
        exp.beds ?? 0,
        exp.amenities ?? '[]',
        exp.images ?? '[]',
        exp.status ?? 'draft',
        exp.allow_children ?? true,
        exp.min_age ?? 0,
        exp.child_max_age ?? 12,
        exp.child_price ?? null
      ]
    );

    return {
      ...exp,
      id: result.insertId
    };
  }

  public async updateExperience(
    id: number,
    updatedFields: Partial<Omit<ExperienceTable, 'id'>>
  ): Promise<ExperienceTable> {
    const allowedFields = [
      'title',
      'location',
      'duration',
      'price',
      'image',
      'category',
      'description',
      'rating',
      'host_count',
      'reviews_count',
      'max_guests',
      'booking_open_date',
      'booking_close_date',
      'host_email',
      'rooms',
      'beds',
      'amenities',
      'images',
      'daily_capacity',
      'daily_capacity_max',
      'registration_open_date',
      'registration_close_date',
      'status',
      'allow_children',
      'min_age',
      'child_max_age',
      'child_price'
    ] as const;

    const entries = allowedFields
      .filter((field) => updatedFields[field] !== undefined)
      .map((field) => [field, updatedFields[field]] as const);

    if (entries.length === 0) {
      const current = await this.findExperienceById(id);
      if (!current) {
        throw new Error('Không tìm thấy trải nghiệm này');
      }
      return current;
    }

    const setClause = entries.map(([field]) => `${field} = ?`).join(', ');
    const values = entries.map(([, value]) => value);

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `UPDATE experiences SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy trải nghiệm này');
    }

    const updated = await this.findExperienceById(id);
    if (!updated) {
      throw new Error('Không tìm thấy trải nghiệm này');
    }
    return updated;
  }

  public async deleteExperience(id: number): Promise<boolean> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE experiences SET is_deleted = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  public async getBookings(email?: string): Promise<BookingTable[]> {
    const sql = `
      SELECT b.*, COALESCE(e.title, 'Trải nghiệm không tên') AS experience_title
      FROM bookings b
      LEFT JOIN experiences e ON e.id = b.experience_id
      ${email ? 'WHERE LOWER(b.user_email) = LOWER(?)' : ''}
      ORDER BY b.created_at DESC
    `;
    const [rows] = await pool.query<BookingRow[]>(sql, email ? [email] : []);
    return rows.map(normalizeBooking);
  }

  public async getHostBookings(hostEmail: string): Promise<BookingTable[]> {
    const sql = `
      SELECT b.*, COALESCE(e.title, 'Trải nghiệm không tên') AS experience_title
      FROM bookings b
      INNER JOIN experiences e ON e.id = b.experience_id
      WHERE LOWER(e.host_email) = LOWER(?)
      ORDER BY b.created_at DESC
    `;
    const [rows] = await pool.query<BookingRow[]>(sql, [hostEmail.trim()]);
    return rows.map(normalizeBooking);
  }

  public async addBooking(
    booking: Omit<BookingTable, 'id' | 'created_at' | 'status' | 'payment_status' | 'commission_amount' | 'host_earnings' | 'refund_status'>
  ): Promise<BookingTable> {
    const commission_amount = booking.total_price * 0.3;
    const host_earnings = booking.total_price * 0.7;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const exp = await this.findExperienceById(booking.experience_id);
      if (!exp) throw new Error('Không tìm thấy tour cần đặt');

      const [totalRows] = await connection.query<RowDataPacket[]>(
        'SELECT SUM(guests) as total FROM bookings WHERE experience_id = ? AND status != "cancelled"',
        [booking.experience_id]
      );
      const totalBooked = Number(totalRows[0]?.total || 0);
      if (totalBooked + booking.guests > (exp.max_guests || 50)) {
        throw new Error('Đã vượt quá tổng số khách cho phép của tour này.');
      }

      await connection.query(
        'INSERT IGNORE INTO experience_daily_quotas (experience_id, booking_date, max_capacity, booked_count) VALUES (?, ?, ?, 0)',
        [booking.experience_id, booking.booking_date, exp.daily_capacity_max || exp.daily_capacity || exp.max_guests || 50]
      );

      const [dailyRows] = await connection.query<RowDataPacket[]>(
        'SELECT max_capacity, booked_count FROM experience_daily_quotas WHERE experience_id = ? AND booking_date = ? FOR UPDATE',
        [booking.experience_id, booking.booking_date]
      );

      const dailyQuota = dailyRows[0];
      if (!dailyQuota || dailyQuota.booked_count + booking.guests > dailyQuota.max_capacity) {
        throw new Error(`Tour này chỉ còn chỗ cho ${Math.max(0, (dailyQuota?.max_capacity || 0) - (dailyQuota?.booked_count || 0))} khách vào ngày ${booking.booking_date}.`);
      }

      await connection.query(
        'UPDATE experience_daily_quotas SET booked_count = booked_count + ? WHERE experience_id = ? AND booking_date = ?',
        [booking.guests, booking.experience_id, booking.booking_date]
      );

      const [result] = await connection.query<mysql.ResultSetHeader>(
        `INSERT INTO bookings
          (user_email, experience_id, schedule_id, booking_date, guests, adults, children, contact_name, contact_phone, note, total_price, commission_amount, host_earnings, status, payment_status, refund_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', 'none')`,
        [
          booking.user_email,
          booking.experience_id,
          booking.schedule_id ?? null,
          booking.booking_date,
          booking.guests,
          booking.adults ?? booking.guests,
          booking.children ?? 0,
          booking.contact_name,
          booking.contact_phone,
          booking.note,
          booking.total_price,
          commission_amount,
          host_earnings
        ]
      );

      if (booking.schedule_id) {
        const [updateResult] = await connection.query<mysql.ResultSetHeader>(
          'UPDATE tour_schedules SET remaining_slots = remaining_slots - ? WHERE id = ? AND remaining_slots >= ?',
          [booking.guests, booking.schedule_id, booking.guests]
        );
        if (updateResult.affectedRows === 0) {
          throw new Error('Lịch khởi hành này đã hết chỗ hoặc không đủ số lượng bạn cần.');
        }
      }

      await connection.commit();

      // ── Auto-close tour khi đủ tổng khách ──
      const [totalAfterRows] = await pool.query<RowDataPacket[]>(
        'SELECT SUM(guests) as total FROM bookings WHERE experience_id = ? AND status != "cancelled"',
        [booking.experience_id]
      );
      const totalAfterBooked = Number(totalAfterRows[0]?.total || 0);
      const refreshed = await this.findExperienceById(booking.experience_id);
      if (refreshed && totalAfterBooked >= (refreshed.max_guests || 50)) {
        await pool.query(
          "UPDATE experiences SET status = 'closed' WHERE id = ? AND status = 'active'",
          [booking.experience_id]
        );
      }

      const created = await this.findBookingById(result.insertId);
      if (!created) throw new Error('Không thể tạo đơn đặt tour mới');
      return created;
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  public async updateBookingStatus(
    id: number,
    status: 'pending' | 'confirmed' | 'cancelled'
  ): Promise<BookingTable> {
    const current = await this.findBookingById(id);
    if (!current) throw new Error('Không tìm thấy đơn đặt tour này');

    if (current.status !== status) {
      if (current.schedule_id) {
        if (status === 'cancelled' && current.status !== 'cancelled') {
          await pool.query('UPDATE tour_schedules SET remaining_slots = remaining_slots + ? WHERE id = ?', [current.guests, current.schedule_id]);
        } else if (current.status === 'cancelled' && status !== 'cancelled') {
          await pool.query('UPDATE tour_schedules SET remaining_slots = remaining_slots - ? WHERE id = ?', [current.guests, current.schedule_id]);
        }
      } else {
        if (status === 'cancelled' && current.status !== 'cancelled') {
          await pool.query('UPDATE experience_daily_quotas SET booked_count = GREATEST(0, booked_count - ?) WHERE experience_id = ? AND booking_date = ?', [current.guests, current.experience_id, current.booking_date]);
        } else if (current.status === 'cancelled' && status !== 'cancelled') {
          await pool.query('UPDATE experience_daily_quotas SET booked_count = booked_count + ? WHERE experience_id = ? AND booking_date = ?', [current.guests, current.experience_id, current.booking_date]);
        }
      }
      
      if (status === 'cancelled' && current.status !== 'cancelled' && current.payment_status === 'paid') {
        await pool.query('UPDATE bookings SET refund_status = "pending" WHERE id = ?', [id]);
      }
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy đơn đặt tour này');
    }

    const updated = await this.findBookingById(id);
    if (!updated) {
      throw new Error('Không tìm thấy đơn đặt tour này');
    }
    return updated;
  }

  public async updateBookingPaymentStatus(
    id: number,
    payment_status: 'unpaid' | 'paid' | 'refunded'
  ): Promise<BookingTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE bookings SET payment_status = ? WHERE id = ?',
      [payment_status, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy đơn đặt tour này');
    }

    const updated = await this.findBookingById(id);
    if (!updated) {
      throw new Error('Không tìm thấy đơn đặt tour này');
    }
    return updated;
  }

  public async completeRefund(id: number): Promise<BookingTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE bookings SET payment_status = "refunded", refund_status = "completed" WHERE id = ? AND refund_status = "pending"',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy yêu cầu hoàn tiền hợp lệ hoặc đơn đã được hoàn tiền');
    }

    const updated = await this.findBookingById(id);
    if (!updated) {
      throw new Error('Lỗi truy xuất đơn đặt tour');
    }
    return updated;
  }

  public async getHosts(): Promise<HostApplicationTable[]> {
    const [rows] = await pool.query<HostApplicationRow[]>(
      'SELECT * FROM hosts ORDER BY created_at DESC'
    );
    return rows.map(normalizeHost);
  }

  public async getHostProfileByEmail(email: string): Promise<any> {
    const normalizedEmail = email.trim().toLowerCase();
    const [hostRows] = await pool.query<RowDataPacket[]>(
      'SELECT name, description, avatar FROM hosts WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
    );
    const [statsRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(*) as total_experiences, 
         SUM(reviews_count) as total_reviews,
         AVG(NULLIF(rating, 0)) as average_rating
       FROM experiences 
       WHERE LOWER(host_email) = ? AND is_deleted = FALSE`,
      [normalizedEmail]
    );

    const host = hostRows.length > 0 ? hostRows[0] : null;
    const stats = statsRows[0];

    return {
      host_name: host?.name || email.split('@')[0],
      description: host?.description || '',
      avatar: host?.avatar || '',
      total_experiences: toNumber(stats?.total_experiences),
      total_reviews: toNumber(stats?.total_reviews),
      average_rating: Math.round((toNumber(stats?.average_rating) || 0) * 10) / 10
    };
  }

  public async getWishlists(email: string): Promise<number[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT experience_id FROM wishlists WHERE LOWER(user_email) = LOWER(?)',
      [email]
    );
    return rows.map(r => Number(r.experience_id));
  }

  public async toggleWishlist(email: string, experienceId: number): Promise<{ added: boolean }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM wishlists WHERE LOWER(user_email) = LOWER(?) AND experience_id = ? LIMIT 1',
      [email, experienceId]
    );

    if (rows.length > 0) {
      await pool.query('DELETE FROM wishlists WHERE id = ?', [rows[0].id]);
      return { added: false };
    } else {
      await pool.query(
        'INSERT INTO wishlists (user_email, experience_id) VALUES (?, ?)',
        [email.toLowerCase(), experienceId]
      );
      return { added: true };
    }
  }

  public async getWishlistDetails(email: string): Promise<ExperienceTable[]> {
    const [rows] = await pool.query<ExperienceRow[]>(
      `SELECT e.* FROM experiences e
       JOIN wishlists w ON e.id = w.experience_id
       WHERE LOWER(w.user_email) = LOWER(?) AND e.is_deleted = FALSE
       ORDER BY w.created_at DESC`,
      [email]
    );
    return rows.map(normalizeExperience);
  }

  public async addHostApplication(
    app: Omit<HostApplicationTable, 'id' | 'created_at' | 'status'>
  ): Promise<HostApplicationTable> {
    const [existing] = await pool.query<HostApplicationRow[]>(
      'SELECT id FROM hosts WHERE email = ? OR id_number = ?',
      [app.email, app.id_number]
    );
    if (existing.length > 0) {
      throw new Error('Email hoặc số CCCD/Passport này đã được đăng ký làm host');
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO hosts (name, email, phone, address, id_number, experience_location, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [app.name, app.email, app.phone, app.address, app.id_number, app.experience_location, app.description]
    );

    const created = await this.findHostById(result.insertId);
    if (!created) {
      throw new Error('Không thể tạo đơn đăng ký host');
    }
    return created;
  }

  public async updateHostStatus(
    id: number,
    status: 'pending' | 'approved' | 'rejected' | 'suspended'
  ): Promise<HostApplicationTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE hosts SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy đơn đăng ký làm host');
    }

    const updated = await this.findHostById(id);
    if (!updated) {
      throw new Error('Không tìm thấy đơn đăng ký làm host');
    }
    return updated;
  }

  public async updateHostProfile(
    email: string,
    profile: {
      name: string;
      phone: string;
      address: string;
      id_number: string;
      experience_location: string;
      description: string;
    }
  ): Promise<HostApplicationTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `UPDATE hosts 
       SET name = ?, phone = ?, address = ?, id_number = ?, experience_location = ?, description = ?
       WHERE email = ?`,
      [profile.name, profile.phone, profile.address, profile.id_number, profile.experience_location, profile.description, email]
    );

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy host để cập nhật');
    }

    const [rows] = await pool.query<HostApplicationRow[]>('SELECT * FROM hosts WHERE email = ?', [email]);
    if (rows.length === 0) {
      throw new Error('Lỗi khi lấy thông tin host sau khi cập nhật');
    }
    return normalizeHost(rows[0]);
  }

  public async getReviews(experienceId?: number): Promise<ReviewTable[]> {
    const sql = `
      SELECT *
      FROM reviews
      ${experienceId ? 'WHERE experience_id = ?' : ''}
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.query<ReviewRow[]>(sql, experienceId ? [experienceId] : []);
    return rows.map(normalizeReview);
  }

  public async addReview(
    review: Omit<ReviewTable, 'id' | 'created_at'>
  ): Promise<ReviewTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO reviews (experience_id, user_email, fullname, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [review.experience_id, review.user_email, review.fullname, review.rating, review.comment]
    );

    await pool.query(
      `UPDATE experiences e
       SET
        reviews_count = (SELECT COUNT(*) FROM reviews r WHERE r.experience_id = e.id),
        rating = COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.experience_id = e.id), 0)
       WHERE e.id = ?`,
      [review.experience_id]
    );

    const [rows] = await pool.query<ReviewRow[]>(
      'SELECT * FROM reviews WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    if (!rows[0]) {
      throw new Error('Không thể tạo bình luận mới');
    }

    return normalizeReview(rows[0]);
  }

  public async getCategories(): Promise<{ id: number; name: string }[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name FROM categories ORDER BY id ASC');
    return rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
  }

  public async addCategory(name: string): Promise<{ id: number; name: string }> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO categories (name) VALUES (?)',
      [name.trim()]
    );
    return { id: result.insertId, name: name.trim() };
  }

  public async deleteCategory(id: number): Promise<boolean> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  public async findExperienceById(id: number): Promise<ExperienceTable | undefined> {
    const [rows] = await pool.query<ExperienceRow[]>(
      'SELECT * FROM experiences WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ? normalizeExperience(rows[0]) : undefined;
  }

  public async findScheduleById(id: number): Promise<TourScheduleTable | undefined> {
    const [rows] = await pool.query<ScheduleRow[]>(
      'SELECT * FROM tour_schedules WHERE id = ? LIMIT 1', [id]
    );
    return rows[0] ? normalizeSchedule(rows[0]) : undefined;
  }

  public async findBookingById(id: number): Promise<BookingTable | undefined> {
    const [rows] = await pool.query<BookingRow[]>(
      `SELECT b.*, COALESCE(e.title, 'Trải nghiệm không tên') AS experience_title
       FROM bookings b
       LEFT JOIN experiences e ON e.id = b.experience_id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ? normalizeBooking(rows[0]) : undefined;
  }

  private async findHostById(id: number): Promise<HostApplicationTable | undefined> {
    const [rows] = await pool.query<HostApplicationRow[]>(
      'SELECT * FROM hosts WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ? normalizeHost(rows[0]) : undefined;
  }


  public async getPromotions(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM promotions ORDER BY id DESC');
    return rows;
  }

  public async applyPromotion(code: string): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM promotions WHERE code = ? AND is_active = TRUE AND expiry_date >= CURDATE() LIMIT 1',
      [code]
    );
    return rows[0] || null;
  }

  public async addPromotion(code: string, discount_percent: number, discount_amount: number, expiry_date: string): Promise<any> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO promotions (code, discount_percent, discount_amount, expiry_date) VALUES (?, ?, ?, ?)',
      [code, discount_percent, discount_amount, expiry_date]
    );
    return { id: result.insertId, code, discount_percent, discount_amount, expiry_date, is_active: true };
  }

  public async getExperienceAvailability(experienceId: number, date: string): Promise<{ totalRemaining: number, dailyRemaining: number, isAvailable: boolean }> {
    const exp = await this.findExperienceById(experienceId);
    if (!exp) return { totalRemaining: 0, dailyRemaining: 0, isAvailable: false };

    const [totalRows] = await pool.query<RowDataPacket[]>(
      'SELECT SUM(guests) as total FROM bookings WHERE experience_id = ? AND status != "cancelled"',
      [experienceId]
    );
    const totalBooked = Number(totalRows[0]?.total || 0);
    const totalRemaining = Math.max(0, (exp.max_guests || 50) - totalBooked);

    const [dailyRows] = await pool.query<RowDataPacket[]>(
      'SELECT booked_count FROM experience_daily_quotas WHERE experience_id = ? AND booking_date = ?',
      [experienceId, date]
    );
    const dailyBooked = Number(dailyRows[0]?.booked_count || 0);
    const dailyRemaining = Math.max(0, (exp.daily_capacity_max || exp.daily_capacity || exp.max_guests || 50) - dailyBooked);

    return {
      totalRemaining,
      dailyRemaining,
      isAvailable: totalRemaining > 0 && dailyRemaining > 0
    };
  }

  // ─── Tour Schedules ───────────────────────────────────────────

  public async getSchedules(experienceId?: number): Promise<TourScheduleTable[]> {
    const sql = `
      SELECT * FROM tour_schedules
      ${experienceId ? 'WHERE experience_id = ?' : ''}
      ORDER BY start_date ASC
    `;
    const [rows] = await pool.query<ScheduleRow[]>(sql, experienceId ? [experienceId] : []);
    return rows.map(normalizeSchedule);
  }

  public async addSchedule(
    schedule: Omit<TourScheduleTable, 'id' | 'created_at' | 'remaining_slots'>
  ): Promise<TourScheduleTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO tour_schedules (experience_id, start_date, end_date, max_slots, remaining_slots)
       VALUES (?, ?, ?, ?, ?)`,
      [schedule.experience_id, schedule.start_date, schedule.end_date, schedule.max_slots, schedule.max_slots]
    );
    const scheduleId = result.insertId;

    const exp = await this.findExperienceById(schedule.experience_id);
    if (exp) {
      const [bookings] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT id, user_email, guests FROM bookings WHERE experience_id = ? AND status != 'cancelled' AND schedule_id IS NULL",
        [schedule.experience_id]
      );
      
      let assignedCount = 0;
      for (const b of bookings) {
        await pool.query("UPDATE bookings SET schedule_id = ? WHERE id = ?", [scheduleId, b.id]);
        assignedCount += b.guests;
        
        await this.createNotification(
          b.user_email,
          'Đã có lịch khởi hành tour',
          `Tour "${exp.title}" bạn đặt đã được chốt lịch khởi hành từ ngày ${schedule.start_date} đến ${schedule.end_date}. Vui lòng chuẩn bị!`,
          'info'
        );
      }
      
      if (assignedCount > 0) {
        await pool.query("UPDATE tour_schedules SET remaining_slots = max_slots - ? WHERE id = ?", [assignedCount, scheduleId]);
      }
    }

    const created = await this.findScheduleById(scheduleId);
    if (!created) throw new Error('Không thể tạo lịch khởi hành');
    return created;
  }

  public async updateSchedule(
    id: number,
    fields: Partial<Pick<TourScheduleTable, 'start_date' | 'end_date' | 'max_slots' | 'remaining_slots'>>
  ): Promise<TourScheduleTable> {
    const allowed = ['start_date', 'end_date', 'max_slots', 'remaining_slots'] as const;
    const entries = allowed
      .filter(f => fields[f] !== undefined)
      .map(f => [f, fields[f]] as const);

    if (entries.length === 0) {
      const current = await this.findScheduleById(id);
      if (!current) throw new Error('Không tìm thấy lịch khởi hành');
      return current;
    }

    const setClause = entries.map(([f]) => `${f} = ?`).join(', ');
    const values = entries.map(([, v]) => v);
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `UPDATE tour_schedules SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    if (result.affectedRows === 0) throw new Error('Không tìm thấy lịch khởi hành');
    const updated = await this.findScheduleById(id);
    if (!updated) throw new Error('Không tìm thấy lịch khởi hành');
    return updated;
  }

  public async deleteSchedule(id: number): Promise<boolean> {
    const [bookings] = await pool.query<RowDataPacket[]>('SELECT id FROM bookings WHERE schedule_id = ? AND status != "cancelled"', [id]);
    if (bookings.length > 0) {
      throw new Error('Không thể xóa lịch này vì đã có khách đặt. Vui lòng hủy các đơn đặt trước.');
    }
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'DELETE FROM tour_schedules WHERE id = ?', [id]
    );
    return result.affectedRows > 0;
  }

  // --- Phase 6: Host Reviews ---
  public async addHostReview(review: Omit<HostReviewTable, 'id' | 'created_at'>): Promise<HostReviewTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO host_reviews (booking_id, host_email, guest_email, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [review.booking_id, review.host_email, review.guest_email, review.rating, review.comment]
    );
    const [rows] = await pool.query<HostReviewRow[]>('SELECT * FROM host_reviews WHERE id = ?', [result.insertId]);
    return normalizeHostReview(rows[0]);
  }

  public async getHostReviews(email: string, role: 'host' | 'guest'): Promise<HostReviewTable[]> {
    const column = role === 'host' ? 'host_email' : 'guest_email';
    const [rows] = await pool.query<HostReviewRow[]>(
      `SELECT r.*, u.fullname as guest_name, e.title as experience_title
       FROM host_reviews r
       JOIN bookings b ON r.booking_id = b.id
       JOIN experiences e ON b.experience_id = e.id
       LEFT JOIN users u ON r.guest_email = u.email
       WHERE r.${column} = ? ORDER BY r.created_at DESC`,
      [email]
    );
    return rows.map(row => ({
      ...normalizeHostReview(row),
      guest_name: row.guest_name,
      experience_title: row.experience_title
    }));
  }

  // --- Phase 7: Community Feed ---
  public async getPosts(): Promise<PostTable[]> {
    const [rows] = await pool.query<PostRow[]>(`
      SELECT p.*,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
      FROM posts p
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
    `);
    return rows.map(normalizePost);
  }

  public async addPost(post: Omit<PostTable, 'id' | 'status' | 'created_at' | 'likes_count' | 'comments_count'>): Promise<PostTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO posts (user_email, fullname, role, content, media_url, media_type) VALUES (?, ?, ?, ?, ?, ?)',
      [post.user_email, post.fullname, post.role, post.content, post.media_url || null, post.media_type || null]
    );
    const [rows] = await pool.query<PostRow[]>('SELECT * FROM posts WHERE id = ?', [result.insertId]);
    return normalizePost(rows[0]);
  }

  public async updatePostStatus(id: number, status: 'active' | 'hidden' | 'deleted'): Promise<boolean> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'UPDATE posts SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  public async addPostComment(comment: Omit<PostCommentTable, 'id' | 'created_at'>): Promise<PostCommentTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO post_comments (post_id, user_email, fullname, comment) VALUES (?, ?, ?, ?)',
      [comment.post_id, comment.user_email, comment.fullname, comment.comment]
    );
    const [rows] = await pool.query<PostCommentRow[]>('SELECT * FROM post_comments WHERE id = ?', [result.insertId]);
    return normalizePostComment(rows[0]);
  }

  public async getPostComments(postId: number): Promise<PostCommentTable[]> {
    const [rows] = await pool.query<PostCommentRow[]>(
      'SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC',
      [postId]
    );
    return rows.map(normalizePostComment);
  }

  public async togglePostReaction(reaction: Omit<PostReactionTable, 'id'>): Promise<boolean> {
    // Check if exists
    const [existing] = await pool.query<PostReactionRow[]>(
      'SELECT * FROM post_reactions WHERE post_id = ? AND user_email = ?',
      [reaction.post_id, reaction.user_email]
    );

    if (existing.length > 0) {
      if (existing[0].reaction_type === reaction.reaction_type) {
        // Toggle off (delete)
        await pool.query('DELETE FROM post_reactions WHERE id = ?', [existing[0].id]);
        return false; // Not added, but removed
      } else {
        // Update reaction
        await pool.query('UPDATE post_reactions SET reaction_type = ? WHERE id = ?', [reaction.reaction_type, existing[0].id]);
        return true;
      }
    } else {
      // Add new
      await pool.query(
        'INSERT INTO post_reactions (post_id, user_email, reaction_type) VALUES (?, ?, ?)',
        [reaction.post_id, reaction.user_email, reaction.reaction_type]
      );
      return true;
    }
  }

  public async getPostReactions(postId: number): Promise<PostReactionTable[]> {
    const [rows] = await pool.query<PostReactionRow[]>(
      'SELECT * FROM post_reactions WHERE post_id = ?',
      [postId]
    );
    return rows.map(normalizePostReaction);
  }

  // ─── Notifications ──────────────────────────────────────────────

  public async createNotification(userEmail: string, title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): Promise<void> {
    await pool.query(
      'INSERT INTO notifications (user_email, title, message, type) VALUES (?, ?, ?, ?)',
      [userEmail, title, message, type]
    );
  }

  public async getNotifications(userEmail: string): Promise<any[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 50',
      [userEmail]
    );
    return rows;
  }

  public async markNotificationAsRead(id: number, userEmail: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_email = ?',
      [id, userEmail]
    );
  }
}

export const db = new RelationalDatabase();

