import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server_db';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanText = (value: unknown) => String(value ?? '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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
}
