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
}
