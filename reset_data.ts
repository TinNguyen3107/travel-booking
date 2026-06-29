import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isTiDB = (process.env.DB_HOST || '').includes('tidbcloud.com');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'local_experience_db',
  port: Number(process.env.DB_PORT) || 3306,
  ...(isTiDB ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function resetData() {
  const connection = await pool.getConnection();
  try {
    console.log('Đang xóa dữ liệu...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Xóa toàn bộ dữ liệu trong các bảng (Trừ danh mục)
    await connection.query('TRUNCATE TABLE host_reviews');
    await connection.query('TRUNCATE TABLE hosts');
    await connection.query('TRUNCATE TABLE post_reactions');
    await connection.query('TRUNCATE TABLE post_comments');
    await connection.query('TRUNCATE TABLE posts');
    await connection.query('TRUNCATE TABLE notifications');
    await connection.query('TRUNCATE TABLE tour_schedules');
    await connection.query('TRUNCATE TABLE experience_daily_quotas');
    await connection.query('TRUNCATE TABLE promotions');
    await connection.query('TRUNCATE TABLE wishlists');
    await connection.query('TRUNCATE TABLE reviews');
    await connection.query('TRUNCATE TABLE bookings');
    await connection.query('TRUNCATE TABLE experiences');
    
    // Xóa toàn bộ user, ngoại trừ tài khoản admin mặc định
    await connection.query('DELETE FROM users WHERE email != "admin@gmail.com"');
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Đã xóa thành công toàn bộ dữ liệu thử nghiệm!');
    console.log('Chỉ còn lại tài khoản: admin@gmail.com');
  } catch (error) {
    console.error('Đã xảy ra lỗi khi xóa dữ liệu:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

resetData();
