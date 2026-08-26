/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { db } from './server_db.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import bcrypt from 'bcryptjs';

import crypto from 'crypto';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: JWT_SECRET is not defined. Tokens will be invalidated on restart.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'viet_tour_secret_key_2024';

const PORT = 3000;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1761127138372-cad230082b19?q=80&w=1200&auto=format&fit=crop';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(0|\+84)[0-9\s.-]{8,13}$/;

const cleanText = (value: unknown) => String(value ?? '').trim();

const isValidPrice = (price: number) => Number.isFinite(price) && price >= 1000;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isValidMaxGuests = (value: number) => Number.isInteger(value) && value >= 1 && value <= 1000;

const isTourOpenOn = (experience: { booking_open_date?: string; booking_close_date?: string }, date: string) => {
  const openDate = experience.booking_open_date || date;
  const closeDate = experience.booking_close_date || '9999-12-31';
  return openDate <= date && date <= closeDate;
};

const isRegistrationOpen = (experience: { registration_open_date?: string; registration_close_date?: string }, today: string) => {
  const regOpen = experience.registration_open_date;
  const regClose = experience.registration_close_date;
  if (!regOpen && !regClose) return true;
  const openDate = regOpen || '0000-01-01';
  const closeDate = regClose || '9999-12-31';
  return openDate <= today && today <= closeDate;
};

const todayInVietnamIso = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

async function initDb() {
  await db.ensureSchema();
}

const handleError = (res: express.Response, e: any) => {
  const msg = e.message || '';
  if (msg.includes('Không tìm thấy') || msg.includes('đã tồn tại') || msg.includes('Không thể') || msg.includes('đã được đăng ký')) {
    res.status(400).json({ error: msg });
  } else {
    console.error(e);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.' });
  }
};

const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (e) {
    console.warn('[Warning] Không thể tạo thư mục upload:', e);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên file hình ảnh hoặc video!'));
  }
};

const upload = multer({ storage, fileFilter });

export const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Prevent browser caching for all API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/uploads', express.static(uploadDir));

// Khởi tạo DB khi chạy trên Vercel hoặc local
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDb();
      dbInitialized = true;
    } catch (err) {
      console.error('Failed to init DB', err);
    }
  }
  next();
});


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

      // Google-registered users must use Google sign-in
      if (!user.password) {
        res.status(401).json({ error: 'Tài khoản này được đăng ký qua Google. Vui lòng đăng nhập bằng Google.' });
        return;
      }

      // Hỗ trợ migration: nếu password độ dài bình thường và chưa hash, so sánh trực tiếp, sau đó hash lại nếu đúng
      let passwordMatch = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
        passwordMatch = await bcrypt.compare(password, user.password);
      } else {
        // Plain text fallback (cho data cũ)
        passwordMatch = user.password === password;
        if (passwordMatch) {
          // Auto migrate: hash the password for future
          await db.updateUserProfile(email, { password });
        }
      }

      if (!passwordMatch) {
        res.status(401).json({ error: 'Mật khẩu không chính xác' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        avatar: user.avatar || '',
        token
      });
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: 'Token is required' });
      }

      // Verify token with Google's endpoint
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!response.ok) {
        return res.status(401).json({ error: 'Google OAuth failed or token is invalid' });
      }

      const payload = await response.json();
      const email = payload.email?.toLowerCase();
      const fullname = payload.name;
      const avatar = payload.picture;

      if (!email) {
        return res.status(400).json({ error: 'Không thể lấy email từ tài khoản Google' });
      }

      let user = await db.findUser(email);
      let isNewUser = false;

      if (!user) {
        // Register new Google user
        user = await db.registerGoogleUser(email, fullname, avatar || '');
        isNewUser = true;
      } else {
        // Update avatar and name if user exists but missing
        if (avatar && !user.avatar) {
          await db.updateUserProfile(email, { avatar, fullname: user.fullname || fullname });
          user = await db.findUser(email) || user;
        }
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        avatar: user.avatar,
        token
      });

    } catch (e: any) { handleError(res, e); }
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

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        id: newUser.id,
        email: newUser.email,
        fullname: newUser.fullname,
        role: newUser.role,
        token
      });
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const email = cleanText(req.body.email).toLowerCase();
      const newPassword = cleanText(req.body.newPassword);

      if (!email || !newPassword) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu mới' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Mật khẩu mới cần tối thiểu 6 ký tự' });
        return;
      }
      const user = await db.findUser(email);
      if (!user) {
        res.status(404).json({ error: 'Email không tồn tại trên hệ thống' });
        return;
      }

      await db.updateUserProfile(email, { password: newPassword });
      res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (e: any) { handleError(res, e); }
  });
  // Auth Middleware
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Chưa xác thực. Vui lòng đăng nhập.' });
      return;
    }
    
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
        return;
      }
      (req as any).user = user;
      next();
    });
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Chỉ Admin mới có quyền truy cập' });
      return;
    }
    next();
  };

  const requireHostOrAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'host')) {
      res.status(403).json({ error: 'Chỉ Host hoặc Admin mới có quyền truy cập' });
      return;
    }
    next();
  };

  app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Không có file được tải lên' });
      }
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      const base64Image = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype;
      const fileUrl = `data:${mimeType};base64,${base64Image}`;
      
      // Dọn dẹp file tạm ở thư mục uploads
      try { fs.unlinkSync(filePath); } catch (e) {}

      res.json({ url: fileUrl });
    } catch (e: any) { handleError(res, e); }
  });


  const verifyExperienceOwnership = async (req: express.Request, res: express.Response, experienceId: number) => {
    const user = (req as any).user;
    if (user.role === 'admin') return true;
    const exp = await db.findExperienceById(experienceId);
    if (!exp || exp.host_email?.toLowerCase() !== user.email.toLowerCase()) {
      res.status(403).json({ error: 'Bạn không có quyền thao tác trên trải nghiệm của host khác' });
      return false;
    }
    return true;
  };


  app.get('/api/wishlists', authenticateToken, async (req, res) => {
    try {
      const email = cleanText(req.query.email) || (req as any).user.email;
      if (email !== (req as any).user.email && (req as any).user.role !== 'admin') {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }
      res.json(await db.getWishlists(email));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/wishlists/toggle', authenticateToken, async (req, res) => {
    try {
      const experienceId = Number(req.body.experience_id);
      if (!experienceId) return res.status(400).json({ error: 'Missing experience_id' });
      res.json(await db.toggleWishlist((req as any).user.email, experienceId));
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/wishlists/details', authenticateToken, async (req, res) => {
    try {
      res.json(await db.getWishlistDetails((req as any).user.email));
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
      const user = await db.findUser((req as any).user.email);
      if (!user) {
        res.status(404).json({ error: 'Không tìm thấy người dùng' });
        return;
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
      const email = (req as any).user.email;
      const payload: any = {};
      if (req.body.fullname !== undefined) payload.fullname = cleanText(req.body.fullname);
      if (req.body.password !== undefined) payload.password = cleanText(req.body.password);
      if (req.body.avatar !== undefined) payload.avatar = req.body.avatar;
      if (req.body.phone !== undefined) payload.phone = cleanText(req.body.phone);
      if (req.body.address !== undefined) payload.address = cleanText(req.body.address);
      
      const success = await db.updateUserProfile(email, payload);
      if (success) {
        const updatedUser = await db.findUser(email);
        if (updatedUser) {
          const { password, ...userWithoutPassword } = updatedUser;
          res.json({ success: true, user: userWithoutPassword });
        } else {
          res.json({ success: true });
        }
      } else {
        res.status(400).json({ error: 'Không thể cập nhật hồ sơ' });
      }
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/users/history', authenticateToken, async (req, res) => {
    try {
      res.json(await db.getBookings((req as any).user.email));
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/hosts/profile', async (req, res) => {
    try {
      let email = '';
      const authHeader = req.headers['authorization'];
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded?.email) {
            email = cleanText(decoded.email);
          }
        } catch {
          // Ignore invalid token and allow fallback to query email
        }
      }

      if (!email) {
        email = cleanText(req.query.email);
      }

      if (!email) {
        res.status(400).json({ error: 'Email host không hợp lệ' });
        return;
      }

      const profile = await db.getHostProfileByEmail(email.toLowerCase());
      res.json(profile);
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/hosts/profile/:email', async (req, res) => {
    try {
      const email = cleanText(req.params.email);
      const profile = await db.getHostProfileByEmail(email);
      if (!profile) {
        res.status(404).json({ error: 'Không tìm thấy thông tin host' });
        return;
      }
      res.json(profile);
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID người dùng không hợp lệ' });
        return;
      }

      const user = await db.getUserById(id);
      if (!user) {
        res.status(404).json({ error: 'Không tìm thấy người dùng' });
        return;
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/users', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      res.json(await db.getUsers());
    } catch (e: any) { handleError(res, e); }
  });

  app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await db.deleteUser(id);

      if (success) {
        res.json({ success: true, message: 'Đã xóa người dùng thành công' });
      } else {
        res.status(404).json({ error: 'Không tìm thấy người dùng để xóa' });
      }
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const role = cleanText(req.body.role);

      if (!id || !['user', 'admin', 'host'].includes(role)) {
        res.status(400).json({ error: 'Quyền người dùng không hợp lệ' });
        return;
      }

      res.json(await db.updateUserRole(id, role as 'user' | 'admin' | 'host'));
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/experiences', async (_req, res) => {
    try {
      res.json(await db.getExperiences());
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      res.json(await db.getCategories());
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/experiences/:id/availability', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const date = cleanText(req.query.date);
      if (!date || !isoDatePattern.test(date)) {
        res.status(400).json({ error: 'Ngày không hợp lệ' });
        return;
      }
      res.json(await db.getExperienceAvailability(id, date));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const name = cleanText(req.body.name);
      if (!name) {
        res.status(400).json({ error: 'Tên danh mục không được để trống' });
        return;
      }
      res.status(201).json(await db.addCategory(name));
    } catch (e: any) { handleError(res, e); }
  });

  app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await db.deleteCategory(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Không tìm thấy danh mục' });
      }
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/experiences', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const title = cleanText(req.body.title);
      const location = cleanText(req.body.location);
      const duration = cleanText(req.body.duration);
      const image = cleanText(req.body.image) || FALLBACK_IMAGE;
      const category = cleanText(req.body.category);
      const description = cleanText(req.body.description);
      const max_guests = req.body.max_guests ? Number(req.body.max_guests) : 50;
      const daily_capacity_max = req.body.daily_capacity_max ? Number(req.body.daily_capacity_max) : max_guests;
      const booking_open_date = cleanText(req.body.booking_open_date);
      const booking_close_date = cleanText(req.body.booking_close_date);
      const host_email = cleanText(req.body.host_email) || '';
      const rooms = req.body.rooms !== undefined ? Number(req.body.rooms) : 0;
      const beds = req.body.beds !== undefined ? Number(req.body.beds) : 0;
      const amenities = Array.isArray(req.body.amenities) ? JSON.stringify(req.body.amenities) : (cleanText(req.body.amenities) || '[]');
      const images = Array.isArray(req.body.images) ? JSON.stringify(req.body.images) : (cleanText(req.body.images) || '[]');
      const price = Number(req.body.price);

      if (!title || !location || !duration || !category || !description) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin trải nghiệm' });
        return;
      }

      if (host_email) {
        const user = await db.findUser(host_email);
        if (!user || (user.role !== 'host' && user.role !== 'admin')) {
          res.status(403).json({ error: 'Chỉ Admin hoặc Host đã được phê duyệt mới được tạo tour' });
          return;
        }
      }

      if (!isValidPrice(price)) {
        res.status(400).json({ error: 'Giá tour phải từ 1.000 VNĐ trở lên' });
        return;
      }

      if (!booking_open_date || !booking_close_date || !isoDatePattern.test(booking_open_date) || !isoDatePattern.test(booking_close_date) || booking_close_date < booking_open_date) {
        res.status(400).json({ error: 'Thá»i gian má»Ÿ tour khÃ´ng há»£p lá»‡' });
        return;
      }

      if (!isValidMaxGuests(max_guests)) {
        res.status(400).json({ error: 'Số khách tối đa phải từ 1 đến 1000' });
        return;
      }

      if (daily_capacity_max < 1 || daily_capacity_max > max_guests) {
        res.status(400).json({ error: `Số khách tối đa mỗi ngày phải từ 1 đến ${max_guests} (tổng tour)` });
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
        daily_capacity: daily_capacity_max,
        daily_capacity_max,
        booking_open_date,
        booking_close_date,
        host_email,
        rooms,
        beds,
        amenities,
        images
      });

      res.status(201).json(newExp);
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/experiences/:id', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!(await verifyExperienceOwnership(req, res, id))) return;
      
      const currentExperience = (await db.getExperiences()).find((item) => item.id === id);
      if (!currentExperience) {
        res.status(404).json({ error: 'Không tìm thấy tour cần cập nhật' });
        return;
      }

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

      if (req.body.amenities !== undefined) {
        payload.amenities = Array.isArray(req.body.amenities) ? JSON.stringify(req.body.amenities) : (cleanText(req.body.amenities) || '[]');
      }
      if (req.body.images !== undefined) {
        payload.images = Array.isArray(req.body.images) ? JSON.stringify(req.body.images) : (cleanText(req.body.images) || '[]');
      }
      
      if (req.body.max_guests !== undefined) {
        const maxGuests = Number(req.body.max_guests);
        if (!isValidMaxGuests(maxGuests)) {
          res.status(400).json({ error: 'Số khách tối đa phải từ 1 đến 1000' });
          return;
        }
        payload.max_guests = maxGuests;
      }

      if (req.body.daily_capacity_max !== undefined) {
        const dcMax = Number(req.body.daily_capacity_max);
        const totalMax = Number(payload.max_guests ?? ((await db.getExperiences()).find(e => e.id === Number(req.params.id))?.max_guests ?? 50));
        if (dcMax < 1 || dcMax > totalMax) {
          res.status(400).json({ error: `Số khách tối đa mỗi ngày phải từ 1 đến ${totalMax}` });
          return;
        }
        payload.daily_capacity_max = dcMax;
        payload.daily_capacity = dcMax; // keep in sync with legacy field
      }

      for (const field of ['rooms', 'beds'] as const) {
        if (req.body[field] !== undefined) {
          payload[field] = Number(req.body[field]);
        }
      }

      for (const field of ['booking_open_date', 'booking_close_date'] as const) {
        if (req.body[field] !== undefined) {
          const value = cleanText(req.body[field]);
          if (!isoDatePattern.test(value)) {
            res.status(400).json({ error: 'Thá»i gian má»Ÿ tour khÃ´ng há»£p lá»‡' });
            return;
          }
          payload[field] = value;
          if (field === 'booking_open_date') payload.registration_open_date = value;
          if (field === 'booking_close_date') payload.registration_close_date = value;
        }
      }

      if (payload.booking_open_date !== undefined || payload.booking_close_date !== undefined) {
        const openDate = String(payload.booking_open_date ?? currentExperience.booking_open_date ?? '');
        const closeDate = String(payload.booking_close_date ?? currentExperience.booking_close_date ?? '');
        if (openDate && closeDate && closeDate < openDate) {
          res.status(400).json({ error: 'Ngày đóng tour phải sau hoặc bằng ngày mở tour' });
          return;
        }
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

      if (req.body.allow_children !== undefined) {
        payload.allow_children = req.body.allow_children ? 1 : 0;
      }
      for (const field of ['min_age', 'child_max_age', 'child_price'] as const) {
        if (req.body[field] !== undefined) {
          payload[field] = Number(req.body[field]);
        }
      }

      // Tự động chuyển trạng thái sang pending_update nếu tour đã được duyệt trước đó
      const user = (req as any).user;
      if (user.role === 'host' && ['active', 'hidden', 'closed'].includes(currentExperience.status || '')) {
        payload.status = 'pending_update';
        // Chỉ lưu previous_state lần đầu tiên (nếu host update nhiều lần khi đang pending_update thì không ghi đè)
        if (!currentExperience.previous_state) {
          payload.previous_state = JSON.stringify(currentExperience);
        }
      }

      res.json(await db.updateExperience(id, payload));
    } catch (e: any) { handleError(res, e); }
  });

  // Admin-only: toggle experience status
  // Admin: active / hidden / suspended / closed
  // Host: pending_review (yêu cầu admin duyệt lại)
  app.patch('/api/experiences/:id/status', authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const id = Number(req.params.id);
      const status = cleanText(req.body.status);

      if (user.role === 'host') {
        // Host chỉ được gửi lại yêu cầu duyệt khi tour đang closed
        if (status !== 'pending_review') {
          res.status(403).json({ error: 'Host chỉ có thể gửi yêu cầu mở lại tour (pending_review)' });
          return;
        }
        const exp = (await db.getExperiences()).find(e => e.id === id);
        if (!exp) { res.status(404).json({ error: 'Không tìm thấy tour' }); return; }
        if (exp.host_email?.toLowerCase() !== user.email.toLowerCase()) {
          res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa tour này' }); return;
        }
        if (exp.status !== 'closed' && exp.status !== 'draft') {
          res.status(400).json({ error: 'Chỉ có thể gửi yêu cầu khi tour đang Đóng hoặc Nháp' }); return;
        }
        res.json(await db.updateExperience(id, { status: 'pending_review' }));
        return;
      }

      // Admin
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Không có quyền' }); return;
      }
      if (!['active', 'hidden', 'suspended', 'closed', 'pending_review', 'draft'].includes(status)) {
        res.status(400).json({ error: 'Trạng thái không hợp lệ' }); return;
      }
      
      const exp = (await db.getExperiences()).find(e => e.id === id);
      if (!exp) { res.status(404).json({ error: 'Không tìm thấy tour' }); return; }

      const reason = cleanText(req.body.reason || '');
      if (status === 'draft' && (exp.status === 'pending_review' || exp.status === 'pending_update')) { // Rejected
        if (exp.host_email) {
          await db.createNotification(exp.host_email, 'Tour bị từ chối', `Tour "${exp.title}" đã bị từ chối. Lý do: ${reason || 'Không có lý do'}`, 'error');
        }
      } else if (status === 'active' && (exp.status === 'pending_review' || exp.status === 'pending_update')) { // Approved
        if (exp.host_email) {
          await db.createNotification(exp.host_email, 'Tour đã được duyệt', `Tour "${exp.title}" đã được admin phê duyệt và hiện có thể nhận khách.`, 'success');
        }
      }

      const updatePayload: any = { status: status as 'active' | 'hidden' | 'suspended' | 'closed' | 'pending_review' | 'draft' | 'pending_update' };
      if (status !== 'pending_update') {
        updatePayload.previous_state = null;
      }

      res.json(await db.updateExperience(id, updatePayload));
    } catch (e: any) { handleError(res, e); }
  });


  app.get('/api/schedules', async (req, res) => {
    try {
      const experienceId = req.query.experience_id ? Number(req.query.experience_id) : undefined;
      res.json(await db.getSchedules(experienceId));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/schedules', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const experience_id = Number(req.body.experience_id);
      if (!(await verifyExperienceOwnership(req, res, experience_id))) return;
      const start_date = cleanText(req.body.start_date);
      const end_date = cleanText(req.body.end_date);
      const max_slots = Number(req.body.max_slots);

      if (!experience_id || !start_date || !end_date || !max_slots) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin lịch khởi hành' });
        return;
      }
      if (end_date < start_date) {
        res.status(400).json({ error: 'Ngày kết thúc không hợp lệ' });
        return;
      }
      res.status(201).json(await db.addSchedule({ experience_id, start_date, end_date, max_slots }));
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/schedules/:id', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const schedule = await db.findScheduleById(id);
      if (!schedule || !(await verifyExperienceOwnership(req, res, schedule.experience_id))) return;
      const payload: any = {};
      if (req.body.start_date !== undefined) payload.start_date = cleanText(req.body.start_date);
      if (req.body.end_date !== undefined) payload.end_date = cleanText(req.body.end_date);
      if (req.body.max_slots !== undefined) payload.max_slots = Number(req.body.max_slots);
      if (req.body.remaining_slots !== undefined) payload.remaining_slots = Number(req.body.remaining_slots);

      res.json(await db.updateSchedule(id, payload));
    } catch (e: any) { handleError(res, e); }
  });

  app.delete('/api/schedules/:id', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const schedule = await db.findScheduleById(id);
      if (!schedule || !(await verifyExperienceOwnership(req, res, schedule.experience_id))) return;
      const success = await db.deleteSchedule(id);
      if (success) {
        res.json({ success: true, message: 'Đã xóa lịch khởi hành' });
      } else {
        res.status(404).json({ error: 'Không tìm thấy lịch khởi hành' });
      }
    } catch (e: any) { handleError(res, e); }
  });

  app.delete('/api/experiences/:id', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!(await verifyExperienceOwnership(req, res, id))) return;
      const success = await db.deleteExperience(id);

      if (success) {
        res.json({ success: true, message: 'Đã xóa trải nghiệm thành công' });
      } else {
        res.status(404).json({ error: 'Không tìm thấy trải nghiệm để xóa' });
      }
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/bookings', authenticateToken, async (req, res) => {
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
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/bookings', authenticateToken, async (req, res) => {
    try {
      const userEmail = (req as any).user.email;
      const experienceId = Number(req.body.experience_id);
      const scheduleId = req.body.schedule_id ? Number(req.body.schedule_id) : undefined;
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

      if (!Number.isInteger(guests) || guests < 1) {
        res.status(400).json({ error: 'Số khách phải từ 1 trở lên' });
        return;
      }

      const today = todayInVietnamIso();
      const bookingDateTime = new Date(bookingDate).getTime();
      const todayTime = new Date(today).getTime();
      if (bookingDateTime < todayTime) {
        res.status(400).json({ error: 'Ngày đặt tour không được ở trong quá khứ' });
        return;
      }

      const experience = (await db.getExperiences()).find((item) => item.id === experienceId);
      if (!experience) {
        res.status(404).json({ error: 'Không tìm thấy tour cần đặt' });
        return;
      }

      if (experience.status && experience.status !== 'active') {
        res.status(400).json({ error: 'Tour này hiện đang tạm ẩn và không thể đặt.' });
        return;
      }

      if (!isTourOpenOn(experience, bookingDate)) {
        res.status(400).json({ error: 'Tour này chưa mở hoặc đã hết thời gian đặt.' });
        return;
      }

      if (!isRegistrationOpen(experience, today)) {
        res.status(400).json({ error: 'Tour này chưa mở đăng ký hoặc đã hết thời gian đăng ký.' });
        return;
      }

      const maxGuests = Number(experience.max_guests || 50);
      if (guests > maxGuests) {
        res.status(400).json({ error: `Tour nÃ y chá»‰ nháº­n tá»‘i Ä‘a ${maxGuests} khÃ¡ch cho má»™t ngÃ y.` });
        return;
      }

      if (scheduleId) {
        const schedules = await db.getSchedules(experienceId);
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) {
          res.status(404).json({ error: 'Không tìm thấy lịch khởi hành.' });
          return;
        }
        if (schedule.remaining_slots < guests) {
          res.status(400).json({ error: `Lịch này chỉ còn ${schedule.remaining_slots} chỗ trống.` });
          return;
        }
      } else {
        const availability = await db.getExperienceAvailability(experienceId, bookingDate);
        if (!availability.isAvailable || availability.dailyRemaining < guests || availability.totalRemaining < guests) {
          res.status(400).json({ error: `Tour này chỉ còn chỗ cho ${Math.min(availability.dailyRemaining, availability.totalRemaining)} khách vào ngày ${bookingDate}.` });
          return;
        }
      }

      const basePrice = guests * experience.price;
      let totalPrice = basePrice;
      const promoCode = cleanText(req.body.promo_code);

      if (promoCode) {
        const promo = await db.applyPromotion(promoCode, experienceId);
        if (!promo) {
          res.status(400).json({ error: 'Mã giảm giá không hợp lệ, đã hết hạn, hoặc không áp dụng cho tour này' });
          return;
        }
        let discount = 0;
        if (promo.discount_percent) {
          discount = (basePrice * promo.discount_percent) / 100;
        } else if (promo.discount_amount) {
          discount = Number(promo.discount_amount);
        }
        totalPrice = Math.max(0, basePrice - discount);
        // Tăng lượt sử dụng
        await db.incrementPromotionUsage(promo.id);
      } else {
        totalPrice = basePrice;
      }

      const newBooking = await db.addBooking({
        user_email: userEmail,
        experience_id: experienceId,
        schedule_id: scheduleId,
        booking_date: bookingDate,
        guests,
        contact_name: contactName,
        contact_phone: contactPhone,
        note,
        total_price: totalPrice
      });

      res.status(201).json(newBooking);
    } catch (e: any) { handleError(res, e); }
  });



  app.put('/api/bookings/:id/status', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const booking = await db.findBookingById(id);
      if (!booking || !(await verifyExperienceOwnership(req, res, booking.experience_id))) return;
      const status = cleanText(req.body.status);

      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        return;
      }

      res.json(await db.updateBookingStatus(id, status as 'pending' | 'confirmed' | 'cancelled'));
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/bookings/:id/payment_status', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const booking = await db.findBookingById(id);
      if (!booking || !(await verifyExperienceOwnership(req, res, booking.experience_id))) return;
      const payment_status = cleanText(req.body.payment_status);

      if (!['unpaid', 'paid', 'refunded'].includes(payment_status)) {
        res.status(400).json({ error: 'Trạng thái thanh toán không hợp lệ' });
        return;
      }

      res.json(await db.updateBookingPaymentStatus(id, payment_status as 'unpaid' | 'paid' | 'refunded'));
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/users/bookings/:id/cancel', authenticateToken, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const booking = await db.findBookingById(id);
      if (!booking) {
        res.status(404).json({ error: 'Không tìm thấy đơn đặt tour' });
        return;
      }
      if (booking.user_email.toLowerCase() !== (req as any).user.email.toLowerCase()) {
        res.status(403).json({ error: 'Bạn không có quyền hủy đơn của người khác' });
        return;
      }
      res.json(await db.updateBookingStatus(id, 'cancelled'));
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/bookings/:id/refund_complete', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const booking = await db.findBookingById(id);
      if (!booking || !(await verifyExperienceOwnership(req, res, booking.experience_id))) return;
      res.json(await db.completeRefund(id));
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/hosts', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      res.json(await db.getHosts());
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/hosts', authenticateToken, async (req, res) => {
    try {
      const name = cleanText(req.body.name);
      const email = (req as any).user.email;
      const phone = cleanText(req.body.phone);
      const address = cleanText(req.body.address);
      const id_number = cleanText(req.body.id_number);
      const experience_location = cleanText(req.body.experience_location);
      const description = cleanText(req.body.description);

      if (!name || !email || !phone || !address || !id_number || !experience_location || !description) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin đăng ký làm host' });
        return;
      }

      if (!emailPattern.test(email) || !phonePattern.test(phone)) {
        res.status(400).json({ error: 'Email hoặc số điện thoại không hợp lệ' });
        return;
      }

      if (!/^\d{12}$/.test(id_number)) {
        res.status(400).json({ error: 'Số CCCD/Passport phải gồm 12 chữ số' });
        return;
      }

      if (description.length < 20) {
        res.status(400).json({ error: 'Phần mô tả chưa đủ 20 ký tự' });
        return;
      }

      res.status(201).json(await db.addHostApplication({ name, email, phone, address, id_number, experience_location, description }));
    } catch (e: any) { handleError(res, e); }
  });


  app.put('/api/hosts/profile', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      let email = cleanText(req.body.email);
      const user = (req as any).user;
      if (!email) {
        email = user.email;
      }
      email = email.toLowerCase();

      if (user.role !== 'admin' && user.email !== email) {
        res.status(403).json({ error: 'Không có quyền cập nhật hồ sơ của host khác' });
        return;
      }
      const name = cleanText(req.body.name);
      const phone = cleanText(req.body.phone);
      const address = cleanText(req.body.address);
      const id_number = cleanText(req.body.id_number);
      const experience_location = cleanText(req.body.experience_location);
      const description = cleanText(req.body.description);
      const avatar = typeof req.body.avatar === 'string' ? req.body.avatar : undefined;

      if (!email || !name || !phone || !address || !id_number || !experience_location || !description) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
        return;
      }

      const updatedHost = await db.updateHostProfile(email, { name, phone, address, id_number, experience_location, description, avatar });
      await db.updateUserProfile(email, { fullname: name, phone, address, ...(avatar && { avatar }) });
      res.json(updatedHost);
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/hosts/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = cleanText(req.body.status);

      if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
        res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        return;
      }

      const updated = await db.updateHostStatus(id, status as 'pending' | 'approved' | 'rejected' | 'suspended');
      
      if (status === 'approved') {
        const user = await db.findUser(updated.email);
        if (user) {
          await db.updateUserRole(user.id, 'host');
        }
      } else if (status === 'rejected' || status === 'suspended') {
        // Revert user role back to 'user' when rejected or suspended
        const user = await db.findUser(updated.email);
        if (user && user.role === 'host') {
          await db.updateUserRole(user.id, 'user');
        }
      }

      res.json(updated);
    } catch (e: any) { handleError(res, e); }
  });



  app.get('/api/reviews', async (req, res) => {
    try {
      const experienceId = req.query.experience_id ? Number(req.query.experience_id) : undefined;
      res.json(await db.getReviews(experienceId));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
      const experienceId = Number(req.body.experience_id);
      const userEmail = (req as any).user.email;
      const fullname = (req as any).user.fullname || cleanText(req.body.fullname);
      const rating = Number(req.body.rating);
      const comment = cleanText(req.body.comment);
      const images = req.body.images ? JSON.stringify(req.body.images) : '[]';

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

      // Phase 6: Chỉ cho phép đánh giá nếu đã có đơn đặt tour 'confirmed' và lịch khởi hành đã kết thúc
      const bookings = await db.getBookings(userEmail);
      const userBookings = bookings.filter(b => b.experience_id === experienceId && b.status === 'confirmed');
      
      if (userBookings.length === 0) {
        res.status(403).json({ error: 'Bạn chỉ có thể đánh giá tour sau khi đã tham gia (đơn được xác nhận)' });
        return;
      }

      // Check if any of the bookings have a schedule that has finished
      const schedules = await db.getSchedules(experienceId);
      const today = new Date().toISOString().split('T')[0];
      const hasCompletedSchedule = userBookings.some(b => {
        if (!b.schedule_id) return false;
        const schedule = schedules.find(s => s.id === b.schedule_id);
        return schedule && schedule.end_date < today;
      });

      if (!hasCompletedSchedule) {
        res.status(403).json({ error: 'Tour chưa kết thúc. Bạn chỉ có thể đánh giá, bình luận sau khi lịch khởi hành đã hoàn tất.' });
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
        comment,
        images
      }));
    } catch (e: any) { handleError(res, e); }
  });

  // Phase 6: Host reviews
  app.get('/api/host_reviews', authenticateToken, async (req, res) => {
    try {
      const email = cleanText(req.query.email);
      const role = req.query.role === 'host' ? 'host' : 'guest';
      if (!email) {
        res.json([]);
        return;
      }
      res.json(await db.getHostReviews(email, role));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/host_reviews', authenticateToken, requireHostOrAdmin, async (req, res) => {
    try {
      const bookingId = Number(req.body.booking_id);
      const hostEmail = (req as any).user.role === 'admin' && req.body.host_email ? cleanText(req.body.host_email).toLowerCase() : (req as any).user.email;
      const guestEmail = cleanText(req.body.guest_email).toLowerCase();
      const rating = Number(req.body.rating);
      const comment = cleanText(req.body.comment);

      if (!bookingId || !hostEmail || !guestEmail || !comment) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ đánh giá' });
        return;
      }
      
      const newReview = await db.addHostReview({
        booking_id: bookingId,
        host_email: hostEmail,
        guest_email: guestEmail,
        rating,
        comment
      });
      res.status(201).json(newReview);
    } catch (e: any) { handleError(res, e); }
  });

  // Phase 7: Community Feed
  app.get('/api/posts', async (_req, res) => {
    try {
      res.json(await db.getPosts());
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/posts', authenticateToken, async (req, res) => {
    try {
      const { content, media_url, media_type, experience_id } = req.body;
      const user_email = (req as any).user.email;
      const fullname = (req as any).user.fullname || cleanText(req.body.fullname);
      const role = (req as any).user.role;
      
      if (!content) {
        res.status(400).json({ error: 'Missing required post fields' });
        return;
      }

      if (role === 'user') {
        const bookings = await db.getBookings(user_email);
        const userBookings = bookings.filter(b => b.status === 'confirmed' && b.schedule_id);
        const today = new Date().toISOString().split('T')[0];
        
        let hasCompletedTour = false;
        for (const b of userBookings) {
          const schedule = await db.findScheduleById(b.schedule_id!);
          if (schedule && schedule.end_date < today) {
            hasCompletedTour = true;
            break;
          }
        }
        
        if (!hasCompletedTour) {
          res.status(403).json({ error: 'Bạn chỉ có thể đăng bài trên diễn đàn sau khi đã tham gia hoàn tất ít nhất một tour.' });
          return;
        }
      }

      const post = await db.addPost({
        user_email,
        fullname,
        role,
        content: cleanText(content),
        media_url: media_url ? cleanText(media_url) : undefined,
        media_type: media_type as any,
        experience_id: experience_id ? Number(experience_id) : undefined
      });
      res.status(201).json(post);
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/posts/:id/status', authenticateToken, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      const user = (req as any).user;

      const posts = await db.getPosts();
      const post = posts.find(p => p.id === id);

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (user.role !== 'admin' && user.email !== post.user_email) {
        res.status(403).json({ error: 'Không có quyền thực hiện thao tác này' });
        return;
      }

      const success = await db.updatePostStatus(id, status as any);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Post not found' });
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const postId = Number(req.params.id);
      res.json(await db.getPostComments(postId));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
      const post_id = Number(req.params.id);
      const { comment, parent_id } = req.body;
      const user_email = (req as any).user.email;
      const fullname = (req as any).user.fullname || cleanText(req.body.fullname);
      
      if (!comment) {
        res.status(400).json({ error: 'Missing comment fields' });
        return;
      }


      const newComment = await db.addPostComment({
        post_id,
        user_email,
        fullname,
        comment: cleanText(comment),
        parent_id: parent_id ? Number(parent_id) : undefined
      });
      
      const post = await db.getPostById(post_id);
      const commenterName = fullname.includes('@') ? ((await db.findUser(user_email))?.fullname || fullname) : fullname;
      
      if (parent_id) {
        // It's a reply to a comment, notify the comment author
        const parentComment = await db.getCommentById(Number(parent_id));
        if (parentComment && parentComment.user_email !== user_email) {
          await db.createNotification(parentComment.user_email, 'Phản hồi mới', `${commenterName} đã phản hồi bình luận của bạn.`, 'info');
        }
      } else if (post && post.user_email !== user_email) {
        // It's a top level comment, notify the post author
        await db.createNotification(post.user_email, 'Bình luận mới', `${commenterName} đã bình luận về bài viết của bạn.`, 'info');
      }
      res.status(201).json(newComment);
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/posts/:id/reactions', async (req, res) => {
    try {
      const postId = Number(req.params.id);
      res.json(await db.getPostReactions(postId));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/posts/:id/reactions', authenticateToken, async (req, res) => {
    try {
      const post_id = Number(req.params.id);
      const { reaction_type } = req.body;
      const user_email = (req as any).user.email;
      
      if (!reaction_type) {
        res.status(400).json({ error: 'Missing reaction fields' });
        return;
      }
      const success = await db.togglePostReaction({
        post_id,
        user_email,
        reaction_type: reaction_type as any
      });
      
      if (success) {
        const post = await db.getPostById(post_id);
        if (post && post.user_email !== user_email) {
          const reactor = await db.findUser(user_email);
          const reactorName = reactor?.fullname || user_email;
          await db.createNotification(post.user_email, 'Cảm xúc mới', `${reactorName} đã thả cảm xúc bài viết của bạn.`, 'info');
        }
      }
      res.json({ success });
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/comments/:id/reactions', async (req, res) => {
    try {
      const commentId = Number(req.params.id);
      res.json(await db.getCommentReactions(commentId));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/comments/:id/reactions', authenticateToken, async (req, res) => {
    try {
      const comment_id = Number(req.params.id);
      const { reaction_type } = req.body;
      const user_email = (req as any).user.email;
      
      if (!reaction_type) {
        res.status(400).json({ error: 'Missing reaction fields' });
        return;
      }
      const success = await db.toggleCommentReaction({
        comment_id,
        user_email,
        reaction_type: reaction_type as any
      });
      
      if (success) {
        const comment = await db.getCommentById(comment_id);
        if (comment && comment.user_email !== user_email) {
          const reactor = await db.findUser(user_email);
          const reactorName = reactor?.fullname || user_email;
          await db.createNotification(comment.user_email, 'Cảm xúc mới', `${reactorName} đã thả cảm xúc bình luận của bạn.`, 'info');
        }
      }
      res.json({ success });
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/wishlists/toggle', authenticateToken, async (req, res) => {
    try {
      const email = cleanText(req.body.user_email).toLowerCase();
      if ((req as any).user.email !== email) return res.status(403).json({ error: 'Không có quyền' });
      const experienceId = Number(req.body.experience_id);
      if (!email || !experienceId) return res.status(400).json({ error: 'Missing data' });
      res.json({ added: await db.toggleWishlist(email, experienceId) });
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/wishlists', authenticateToken, async (req, res) => {
    try {
      const email = cleanText(req.query.email).toLowerCase();
      if (email && (req as any).user.email !== email && (req as any).user.role !== 'admin') {
        return res.status(403).json({ error: 'Không có quyền' });
      }
      res.json(email ? await db.getWishlists(email) : []);
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/promotions', async (_req, res) => {
    try { res.json(await db.getPromotions()); } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/promotions', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { code, discount_percent, discount_amount, expiry_date, experience_id, usage_limit, description } = req.body;
      if (!code || !expiry_date) return res.status(400).json({ error: 'Missing code or expiry' });
      res.json(await db.addPromotion(cleanText(code), Number(discount_percent || 0), Number(discount_amount || 0), cleanText(expiry_date), experience_id ? Number(experience_id) : null, usage_limit ? Number(usage_limit) : 100, description ? cleanText(description) : ''));
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/promotions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { usage_limit, description, is_active } = req.body;
      res.json(await db.updatePromotion(id, Number(usage_limit), cleanText(description), Boolean(is_active)));
    } catch (e: any) { handleError(res, e); }
  });

  app.post('/api/promotions/apply', authenticateToken, async (req, res) => {
    try {
      const code = cleanText(req.body.code);
      const experienceId = Number(req.body.experience_id);
      const promo = await db.applyPromotion(code, experienceId);
      if (!promo) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ, đã hết hạn, hoặc không áp dụng cho tour này' });
      res.json(promo);
    } catch (e: any) { handleError(res, e); }
  });

  app.get('/api/availability', async (req, res) => {
    try {
      const experienceId = Number(req.query.experience_id);
      const date = cleanText(req.query.date);
      if (!experienceId || !date) return res.status(400).json({ error: 'Missing id or date' });
      res.json(await db.getExperienceAvailability(experienceId, date));
    } catch (e: any) { handleError(res, e); }
  });



  // ─── Notifications API ──────────────────────────────────────────────
  app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      res.json(await db.getNotifications(user.email));
    } catch (e: any) { handleError(res, e); }
  });

  app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const id = Number(req.params.id);
      await db.markNotificationAsRead(id, user.email);
      res.json({ success: true });
    } catch (e: any) { handleError(res, e); }
  });

  app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const id = Number(req.params.id);
      await db.deleteNotification(id, user.email);
      res.json({ success: true });
    } catch (e: any) { handleError(res, e); }
  });

async function startLocalServer() {
  await initDb();
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


