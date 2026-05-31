import { db } from '../server_db.js';
import app from '../server.js';

// Đảm bảo schema (tạo bảng) được khởi tạo trước khi xử lý request
let schemaReady: Promise<void> | null = null;

function ensureReady() {
  if (!schemaReady) {
    schemaReady = db.ensureSchema().catch((err) => {
      console.error('[Vercel] ensureSchema failed:', err);
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export default async (req: any, res: any) => {
  try {
    await ensureReady();
  } catch (err: any) {
    return res.status(500).json({ error: 'Database initialization failed: ' + err.message });
  }
  return app(req, res);
};
