/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';
import {
  BookingTable,
  ExperienceTable,
  HostApplicationTable,
  ReviewTable,
  UserTable
} from './src/types';

dotenv.config();

type UserRow = UserTable & RowDataPacket;
type ExperienceRow = ExperienceTable & RowDataPacket;
type BookingRow = BookingTable & RowDataPacket;
type HostApplicationRow = HostApplicationTable & RowDataPacket;
type ReviewRow = ReviewTable & RowDataPacket;
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

  return {
    ...row,
    id: toNumber(row.id),
    price: toNumber(row.price),
    rating: reviewsCount > 0 ? toNumber(row.rating) : 0,
    host_count: toNumber(row.host_count),
    reviews_count: reviewsCount
  };
};

const normalizeBooking = (row: BookingRow): BookingTable => ({
  ...row,
  id: toNumber(row.id),
  experience_id: toNumber(row.experience_id),
  guests: toNumber(row.guests),
  total_price: toNumber(row.total_price),
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
  created_at: toDateTimeString(row.created_at)
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
        reviews_count INT NOT NULL DEFAULT 0
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

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
        description TEXT NOT NULL,
        status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

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
        UNIQUE KEY user_exp (user_email, experience_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

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
    try { await pool.query('ALTER TABLE experiences ADD COLUMN host_email VARCHAR(255)'); } catch (e: any) { }
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

    const [result] = await pool.query<mysql.ResultSetHeader>(
      'INSERT INTO users (email, password, role, fullname) VALUES (?, ?, ?, ?)',
      [normalizedEmail, user.password, user.role, user.fullname.trim()]
    );

    return {
      ...user,
      email: normalizedEmail,
      fullname: user.fullname.trim(),
      id: result.insertId
    };
  }

  public async getExperiences(): Promise<ExperienceTable[]> {
    const [rows] = await pool.query<ExperienceRow[]>(
      'SELECT * FROM experiences ORDER BY id DESC'
    );
    return rows.map(normalizeExperience);
  }

  public async addExperience(exp: Omit<ExperienceTable, 'id'>): Promise<ExperienceTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO experiences
        (title, location, duration, price, image, category, description, rating, host_count, reviews_count, max_guests, host_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        exp.host_email ?? null
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
      'host_email'
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
      'DELETE FROM experiences WHERE id = ?',
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
    booking: Omit<BookingTable, 'id' | 'created_at' | 'status'>
  ): Promise<BookingTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO bookings
        (user_email, experience_id, booking_date, guests, contact_name, contact_phone, note, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        booking.user_email,
        booking.experience_id,
        booking.booking_date,
        booking.guests,
        booking.contact_name,
        booking.contact_phone,
        booking.note,
        booking.total_price
      ]
    );

    const created = await this.findBookingById(result.insertId);
    if (!created) {
      throw new Error('Không thể tạo đơn đặt tour mới');
    }
    return created;
  }

  public async updateBookingStatus(
    id: number,
    status: 'pending' | 'confirmed' | 'cancelled'
  ): Promise<BookingTable> {
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

  public async getHosts(): Promise<HostApplicationTable[]> {
    const [rows] = await pool.query<HostApplicationRow[]>(
      'SELECT * FROM hosts ORDER BY created_at DESC'
    );
    return rows.map(normalizeHost);
  }

  public async addHostApplication(
    app: Omit<HostApplicationTable, 'id' | 'created_at' | 'status'>
  ): Promise<HostApplicationTable> {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO hosts (name, email, phone, description, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [app.name, app.email, app.phone, app.description]
    );

    const created = await this.findHostById(result.insertId);
    if (!created) {
      throw new Error('Không thể tạo đơn đăng ký host');
    }
    return created;
  }

  public async updateHostStatus(
    id: number,
    status: 'pending' | 'approved'
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

  private async findExperienceById(id: number): Promise<ExperienceTable | undefined> {
    const [rows] = await pool.query<ExperienceRow[]>(
      'SELECT * FROM experiences WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ? normalizeExperience(rows[0]) : undefined;
  }

  private async findBookingById(id: number): Promise<BookingTable | undefined> {
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

  public async toggleWishlist(userEmail: string, experienceId: number): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM wishlists WHERE user_email = ? AND experience_id = ?',
      [userEmail, experienceId]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM wishlists WHERE id = ?', [existing[0].id]);
      return false; // Removed
    } else {
      await pool.query('INSERT INTO wishlists (user_email, experience_id) VALUES (?, ?)', [userEmail, experienceId]);
      return true; // Added
    }
  }

  public async getWishlists(userEmail: string): Promise<number[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT experience_id FROM wishlists WHERE user_email = ?', [userEmail]);
    return rows.map(r => Number(r.experience_id));
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

  public async getAvailability(experienceId: number, date: string): Promise<{ booked: number, max: number }> {
    const exp = await this.findExperienceById(experienceId);
    if (!exp) return { booked: 0, max: 0 };
    
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT SUM(guests) as total FROM bookings WHERE experience_id = ? AND booking_date = ? AND status != "cancelled"',
      [experienceId, date]
    );
    const booked = Number(rows[0]?.total || 0);
    return { booked, max: exp.max_guests || 50 };
  }
}

export const db = new RelationalDatabase();
