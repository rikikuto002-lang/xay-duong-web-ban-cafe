import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { imageBase64, fileName } = req.body ?? {};

    if (!imageBase64) {
      return res.status(400).json({ message: 'Vui lòng cung cấp dữ liệu hình ảnh (base64).' });
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

    // Path resolution for static/uploads in apps/web
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
    return res.status(201).json({
      message: 'Tải ảnh lên thành công',
      url: publicUrl,
      fileName: targetFileName
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi tải ảnh lên: ' + error.message });
  }
});

export default router;

