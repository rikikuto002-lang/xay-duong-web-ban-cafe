import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = new Hono();

router.post('/', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { imageBase64, fileName } = body ?? {};

    if (!imageBase64) {
      return c.json({ message: 'Vui lòng cung cấp dữ liệu hình ảnh (base64).' }, 400);
    }

    const matches = String(imageBase64).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('svg')) ext = 'svg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(String(imageBase64), 'base64');
    }

    const cleanBase = fileName ? path.basename(String(fileName), path.extname(String(fileName))) : 'img';
    const targetFileName = `${cleanBase.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}.${ext}`;

    const candidates = [
      path.resolve(process.cwd(), 'apps/web/static/uploads'),
      path.resolve(process.cwd(), '../web/static/uploads'),
      path.resolve(process.cwd(), '../../apps/web/static/uploads')
    ];

    let targetDir = candidates.find((dir) => fs.existsSync(path.dirname(dir))) ?? candidates[0];
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, targetFileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${targetFileName}`;
    return c.json({
      message: 'Tải ảnh lên thành công',
      url: publicUrl,
      fileName: targetFileName
    }, 201);
  } catch (error: any) {
    return c.json({ message: 'Lỗi tải ảnh lên: ' + error.message }, 500);
  }
});

export default router;
