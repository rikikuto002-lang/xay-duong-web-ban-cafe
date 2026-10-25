import { Router } from 'express';
import { authMiddleware, requireRole, createToken, getSession, setSession, hashPassword, verifyPassword, type AuthUser, type UserRole } from '../middleware/auth.js';

const router = Router();

type StoredUser = AuthUser & { passwordHash: string };

// In-memory user store (replace with database in production)
const users = new Map<string, StoredUser>();

// Initialize with demo users (passwords are hashed)
const initUsers = () => {
  const guestHash = hashPassword('guest123');
  const customerHash = hashPassword('customer123');
  const adminHash = hashPassword('admin123');

  users.set('guest@example.com', {
    id: 'guest-1',
    name: 'Khách vãng lai',
    email: 'guest@example.com',
    passwordHash: guestHash,
    role: 'guest'
  });
  users.set('customer@example.com', {
    id: 'customer-1',
    name: 'Nguyễn Văn A',
    email: 'customer@example.com',
    passwordHash: customerHash,
    role: 'customer'
  });
  users.set('admin@cafeshop.vn', {
    id: 'admin-1',
    name: 'Admin Cửa hàng',
    email: 'admin@cafeshop.vn',
    passwordHash: adminHash,
    role: 'admin'
  });
};

initUsers();

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body ?? {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Tên, email và mật khẩu là bắt buộc.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = users.get(normalizedEmail);

  if (existingUser) {
    return res.status(409).json({ message: 'Tài khoản với email này đã tồn tại.' });
  }

  const nextRole: UserRole = 'customer';
  const passwordHash = hashPassword(String(password));

  const newUser: StoredUser = {
    id: `customer-${Date.now()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: nextRole
  };

  users.set(normalizedEmail, newUser);
  const token = createToken(newUser);
  setSession(token, newUser);

  return res.status(201).json({
    message: 'Tạo tài khoản thành công',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  });
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.get(normalizedEmail);

  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác.' });
  }

  if (role && user.role !== role) {
    return res.status(403).json({ message: 'Vai trò không khớp với tài khoản này.' });
  }

  const token = createToken(user);
  setSession(token, user);

  return res.json({
    message: 'Đăng nhập thành công',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    user: {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role
    }
  });
});

// Admin only: list all users
router.get('/users', authMiddleware, requireRole('admin'), (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role
  }));
  res.json({ users: userList });
});

export default router;