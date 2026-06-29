import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const isTiDB = (process.env.DB_HOST || '').includes('tidbcloud.com');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'local_experience_db',
    port: Number(process.env.DB_PORT) || 3306,
    ...(isTiDB ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {})
  });

  try {
    // Add sample tour
    const [expResult] = await connection.execute(`
      INSERT INTO experiences (
        host_email, title, description, location, category, duration,
        price, status, daily_capacity_max, booking_open_date, booking_close_date, image, daily_capacity, max_guests
      ) VALUES (
        'admin@gmail.com', 
        '[Mẫu] Khám phá Vịnh Hạ Long 2N1Đ', 
        'Một hành trình tuyệt vời khám phá kỳ quan thiên nhiên thế giới Vịnh Hạ Long với du thuyền 5 sao, thưởng thức hải sản tươi ngon và tham gia các hoạt động chèo kayak, câu mực đêm.',
        'Hạ Long, Quảng Ninh', 
        'Thiên nhiên', 
        '2 Ngày 1 Đêm', 
        2500000, 
        'active', 
        50, 
        '2026-06-01', 
        '2026-12-31', 
        'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200&auto=format&fit=crop',
        50, 50
      )
    `);
    const expId = (expResult as any).insertId;

    // Add sample review
    await connection.execute(`
      INSERT INTO reviews (
        experience_id, user_email, fullname, rating, comment
      ) VALUES (
        ?, 'user@gmail.com', 'Người Dùng Mẫu', 5, 'Trải nghiệm rất tuyệt vời! Hướng dẫn viên nhiệt tình, cảnh quan đẹp và đồ ăn rất ngon. Chắc chắn sẽ quay lại ủng hộ công ty.'
      )
    `, [expId]);

    // Add sample post
    const [postResult] = await connection.execute(`
      INSERT INTO posts (
        user_email, fullname, role, content, media_url, media_type, status
      ) VALUES (
        'admin@gmail.com', 'Admin', 'admin', 'Chào mừng mọi người đến với cộng đồng Travel Booking! Hãy chia sẻ những chuyến đi tuyệt vời của bạn tại đây nhé. Dưới đây là hình ảnh Vịnh Hạ Long trong chuyến đi khảo sát mới nhất của chúng mình.', 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200&auto=format&fit=crop', 'image', 'active'
      )
    `);
    const postId = (postResult as any).insertId;

    // Add sample comment
    await connection.execute(`
      INSERT INTO post_comments (
        post_id, user_email, fullname, comment
      ) VALUES (
        ?, 'user@gmail.com', 'User', 'Cảnh đẹp quá! Mình đang lên kế hoạch đi vào tháng tới, mong được trải nghiệm dịch vụ tốt như vậy.'
      )
    `, [postId]);

    // Add reaction
    await connection.execute(`
      INSERT INTO post_reactions (
        post_id, user_email, reaction_type
      ) VALUES (?, 'user@gmail.com', 'love')
    `, [postId]);

    // Cập nhật lại số lượng reviews, likes, comments (do code của hệ thống sẽ tự động gọi hoặc đọc qua VIEW, ở đây ta gọi thủ công để đảm bảo hiển thị đúng)
    await connection.execute(`
      UPDATE experiences e SET 
        reviews_count = (SELECT COUNT(*) FROM reviews WHERE experience_id = e.id),
        rating = 5.0
      WHERE id = ?
    `, [expId]);

    console.log('✅ Đã tạo dữ liệu mẫu thành công!');
  } catch (e) {
    console.error('Lỗi:', e);
  } finally {
    await connection.end();
  }
}

seed();
