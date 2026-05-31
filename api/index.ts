import { db } from '../server_db.js';
import app from '../server.js';

// Chỉ chạy schema init nếu được yêu cầu qua ENV (mặc định là false trên production để tối ưu tốc độ)
const shouldInitSchema = process.env.DB_INIT_SCHEMA === 'true';

let schemaReady: Promise<void> | null = null;

function ensureReady() {
  if (!shouldInitSchema) {
    return Promise.resolve();
  }
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
