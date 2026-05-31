/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { db } from './server_db.js';

const PORT = 3000;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1761127138372-cad230082b19?q=80&w=1200&auto=format&fit=crop';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(0|\+84)[0-9\s.-]{8,13}$/;

const cleanText = (value: unknown) => String(value ?? '').trim();

const isValidPrice = (price: number) => Number.isFinite(price) && price >= 1000;

async function initDb() {
  await db.ensureSchema();
}

export const app = express();
app.use(express.json());

// Khởi tạo DB khi chạy trên Vercel hoặc local (tuỳ chọn)
// Ở Vercel có thể gọi initDb() trong middleware hoặc không cần 
// nếu DB đã được setup sẵn trên TiDB.


  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = cleanText(req.body.email).toLowerCase();
      const password = cleanText(req.body.password);

      if (!email || !password) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu' });
        return;
      }

      if (!emailPattern.test(email)) {
        res.status(400).json({ error: 'Email không hợp lệ' });
        return;
      }

      const user = await db.findUser(email);
      if (!user) {
        res.status(401).json({ error: 'Email không tồn tại trên hệ thống' });
        return;
      }

      if (user.password !== password) {
        res.status(401).json({ error: 'Mật khẩu không chính xác' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = cleanText(req.body.email).toLowerCase();
      const password = cleanText(req.body.password);
      const fullname = cleanText(req.body.fullname);

      if (!email || !password || !fullname) {
        res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        return;
      }

      if (!emailPattern.test(email) || password.length < 6 || fullname.length < 2) {
        res.status(400).json({
          error: 'Email không hợp lệ, mật khẩu tối thiểu 6 ký tự và họ tên tối thiểu 2 ký tự'
        });
        return;
      }

      const newUser = await db.registerUser({
        email,
        password,
        fullname,
        role: 'user'
      });

      res.json({
        id: newUser.id,
        email: newUser.email,
        fullname: newUser.fullname,
        role: newUser.role
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/users', async (_req, res) => {
    try {
      res.json(await db.getUsers());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await db.deleteUser(id);

      if (success) {
        res.json({ success: true, message: 'Đã xóa người dùng thành công' });
      } else {
        res.status(404).json({ error: 'Không tìm thấy người dùng để xóa' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/users/:id/role', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const role = cleanText(req.body.role);

      if (!id || !['user', 'admin', 'host'].includes(role)) {
        res.status(400).json({ error: 'Quyền người dùng không hợp lệ' });
        return;
      }

      res.json(await db.updateUserRole(id, role as 'user' | 'admin' | 'host'));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/experiences', async (_req, res) => {
    try {
      res.json(await db.getExperiences());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      res.json(await db.getCategories());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const name = cleanText(req.body.name);
      if (!name) {
        res.status(400).json({ error: 'Tên danh mục không được để trống' });
        return;
      }
      res.status(201).json(await db.addCategory(name));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await db.deleteCategory(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Không tìm thấy danh mục' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/experiences', async (req, res) => {
    try {
      const title = cleanText(req.body.title);
      const location = cleanText(req.body.location);
      const duration = cleanText(req.body.duration);
      const image = cleanText(req.body.image) || FALLBACK_IMAGE;
      const category = cleanText(req.body.category);
      const description = cleanText(req.body.description);
      const max_guests = req.body.max_guests ? Number(req.body.max_guests) : 50;
      const host_email = cleanText(req.body.host_email) || '';
      const price = Number(req.body.price);

      if (!title || !location || !duration || !category || !description) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin trải nghiệm' });
        return;
      }

      if (!isValidPrice(price)) {
        res.status(400).json({ error: 'Giá tour phải từ 1.000 VNĐ trở lên' });
        return;
      }

      const newExp = await db.addExperience({
        title,
        location,
        duration,
        price,
        image,
        category,
        description,
        rating: 0,
        host_count: 1,
        reviews_count: 0,
        max_guests,
        host_email
      });

      res.status(201).json(newExp);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/experiences/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload: Record<string, string | number> = {};

      for (const field of ['title', 'location', 'duration', 'category', 'description', 'host_email'] as const) {
        if (req.body[field] !== undefined) {
          const value = cleanText(req.body[field]);
          if (!value && field !== 'host_email') {
            res.status(400).json({ error: 'Thông tin trải nghiệm không được để trống' });
            return;
          }
          payload[field] = value;
        }
      }
      
      if (req.body.max_guests !== undefined) {
        payload.max_guests = Number(req.body.max_guests);
      }

      if (req.body.image !== undefined) {
        payload.image = cleanText(req.body.image) || FALLBACK_IMAGE;
      }

      if (req.body.price !== undefined) {
        const price = Number(req.body.price);
        if (!isValidPrice(price)) {
          res.status(400).json({ error: 'Giá tour phải từ 1.000 VNĐ trở lên' });
          return;
        }
        payload.price = price;
      }

      res.json(await db.updateExperience(id, payload));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/experiences/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await db.deleteExperience(id);

      if (success) {
        res.json({ success: true, message: 'Đã xóa trải nghiệm thành công' });
      } else {
        res.status(404).json({ error: 'Không tìm thấy trải nghiệm để xóa' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/bookings', async (req, res) => {
    try {
      const email = cleanText(req.query.email).toLowerCase();
      const role = cleanText(req.query.role);

      if (role === 'admin') {
        res.json(await db.getBookings());
      } else if (role === 'host' && email) {
        res.json(await db.getHostBookings(email));
      } else if (email) {
        res.json(await db.getBookings(email));
      } else {
        res.json([]);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bookings', async (req, res) => {
    try {
      const userEmail = cleanText(req.body.user_email).toLowerCase();
      const experienceId = Number(req.body.experience_id);
      const bookingDate = cleanText(req.body.booking_date);
      const guests = Number(req.body.guests);
      const contactName = cleanText(req.body.contact_name);
      const contactPhone = cleanText(req.body.contact_phone);
      const note = cleanText(req.body.note);

      if (!userEmail || !experienceId || !bookingDate || !contactName || !contactPhone) {
        res.status(400).json({ error: 'Thiếu thông tin đặt tour bắt buộc' });
        return;
      }

      if (!emailPattern.test(userEmail) || !phonePattern.test(contactPhone)) {
        res.status(400).json({ error: 'Email hoặc số điện thoại không hợp lệ' });
        return;
      }

      if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
        res.status(400).json({ error: 'Số khách phải nằm trong khoảng 1 đến 50' });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      if (bookingDate < today) {
        res.status(400).json({ error: 'Ngày đặt tour không được ở trong quá khứ' });
        return;
      }

      const experience = (await db.getExperiences()).find((item) => item.id === experienceId);
      if (!experience) {
        res.status(404).json({ error: 'Không tìm thấy tour cần đặt' });
        return;
      }

      const availability = await db.getAvailability(experienceId, bookingDate);
      if (availability.booked + guests > availability.max) {
        res.status(400).json({ error: `Tour này chỉ còn chỗ cho ${Math.max(0, availability.max - availability.booked)} khách vào ngày ${bookingDate}.` });
        return;
      }

      const basePrice = guests * experience.price;
      let totalPrice = basePrice;
      const promoCode = cleanText(req.body.promo_code);

      if (promoCode) {
        const promo = await db.applyPromotion(promoCode);
        if (!promo) {
          res.status(400).json({ error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
          return;
        }
        let discount = 0;
        if (promo.discount_percent) {
          discount = (basePrice * promo.discount_percent) / 100;
        } else if (promo.discount_amount) {
          discount = Number(promo.discount_amount);
        }
        totalPrice = Math.max(0, basePrice - discount);
      } else {
        totalPrice = req.body.total_price !== undefined ? Number(req.body.total_price) : basePrice;
      }

      const newBooking = await db.addBooking({
        user_email: userEmail,
        experience_id: experienceId,
        booking_date: bookingDate,
        guests,
        contact_name: contactName,
        contact_phone: contactPhone,
        note,
        total_price: totalPrice
      });

      res.status(201).json(newBooking);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/bookings/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = cleanText(req.body.status);

      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        return;
      }

      res.json(await db.updateBookingStatus(id, status as 'pending' | 'confirmed' | 'cancelled'));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/hosts', async (_req, res) => {
    try {
      res.json(await db.getHosts());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/hosts', async (req, res) => {
    try {
      const name = cleanText(req.body.name);
      const email = cleanText(req.body.email).toLowerCase();
      const phone = cleanText(req.body.phone);
      const description = cleanText(req.body.description);

      if (!name || !email || !phone || !description) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin đăng ký làm host' });
        return;
      }

      if (!emailPattern.test(email) || !phonePattern.test(phone) || description.length < 20) {
        res.status(400).json({
          error: 'Email, số điện thoại không hợp lệ hoặc phần mô tả chưa đủ 20 ký tự'
        });
        return;
      }

      res.status(201).json(await db.addHostApplication({ name, email, phone, description }));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/hosts/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = cleanText(req.body.status);

      if (!['pending', 'approved'].includes(status)) {
        res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        return;
      }

      const updated = await db.updateHostStatus(id, status as 'pending' | 'approved');
      
      if (status === 'approved') {
        const user = await db.findUser(updated.email);
        if (user) {
          await db.updateUserRole(user.id, 'host');
        }
      }

      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/reviews', async (req, res) => {
    try {
      const experienceId = req.query.experience_id ? Number(req.query.experience_id) : undefined;
      res.json(await db.getReviews(experienceId));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    try {
      const experienceId = Number(req.body.experience_id);
      const userEmail = cleanText(req.body.user_email).toLowerCase();
      const fullname = cleanText(req.body.fullname);
      const rating = Number(req.body.rating);
      const comment = cleanText(req.body.comment);

      if (!experienceId || !userEmail || !fullname || !comment) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ đánh giá và bình luận' });
        return;
      }

      if (!emailPattern.test(userEmail) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Đánh giá phải từ 1 đến 5 sao' });
        return;
      }

      if (comment.length < 5 || comment.length > 500) {
        res.status(400).json({ error: 'Bình luận phải từ 5 đến 500 ký tự' });
        return;
      }

      const experience = (await db.getExperiences()).find((item) => item.id === experienceId);
      if (!experience) {
        res.status(404).json({ error: 'Không tìm thấy tour cần đánh giá' });
        return;
      }

      res.status(201).json(await db.addReview({
        experience_id: experienceId,
        user_email: userEmail,
        fullname,
        rating,
        comment
      }));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/wishlists/toggle', async (req, res) => {
    try {
      const email = cleanText(req.body.user_email).toLowerCase();
      const experienceId = Number(req.body.experience_id);
      if (!email || !experienceId) return res.status(400).json({ error: 'Missing data' });
      res.json({ added: await db.toggleWishlist(email, experienceId) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/wishlists', async (req, res) => {
    try {
      const email = cleanText(req.query.email).toLowerCase();
      res.json(email ? await db.getWishlists(email) : []);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/promotions', async (_req, res) => {
    try { res.json(await db.getPromotions()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/promotions', async (req, res) => {
    try {
      const { code, discount_percent, discount_amount, expiry_date } = req.body;
      if (!code || !expiry_date) return res.status(400).json({ error: 'Missing code or expiry' });
      res.json(await db.addPromotion(cleanText(code), Number(discount_percent), Number(discount_amount), cleanText(expiry_date)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/promotions/apply', async (req, res) => {
    try {
      const code = cleanText(req.body.code);
      const promo = await db.applyPromotion(code);
      if (!promo) return res.status(404).json({ error: 'Mã giảm giá không tồn tại, đã hết hạn hoặc bị khóa' });
      res.json(promo);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/availability', async (req, res) => {
    try {
      const experienceId = Number(req.query.experience_id);
      const date = cleanText(req.query.date);
      if (!experienceId || !date) return res.status(400).json({ error: 'Missing id or date' });
      res.json(await db.getAvailability(experienceId, date));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

async function startLocalServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VietTour] server is running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startLocalServer();
}

export default app;
