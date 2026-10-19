import { Router } from 'express';
const router = Router();
const users = [
    {
        id: 'guest-1',
        name: 'Khách vãng lai',
        email: 'guest@example.com',
        password: 'guest123',
        role: 'guest'
    },
    {
        id: 'customer-1',
        name: 'Nguyễn Văn A',
        email: 'customer@example.com',
        password: 'customer123',
        role: 'customer'
    },
    {
        id: 'admin-1',
        name: 'Admin Cửa hàng',
        email: 'admin@cafeshop.vn',
        password: 'admin123',
        role: 'admin'
    }
];
const sessions = new Map();
const createToken = (user) => {
    return Buffer.from(`${user.email}:${user.role}:${Date.now()}`).toString('base64');
};
router.post('/register', (req, res) => {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Tên, email và mật khẩu là bắt buộc.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = users.find((item) => item.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
        return res.status(409).json({ message: 'Tài khoản với email này đã tồn tại.' });
    }
    const nextRole = role === 'admin' ? 'customer' : role === 'guest' ? 'customer' : 'customer';
    const newUser = {
        id: `customer-${Date.now()}`,
        name: String(name).trim(),
        email: normalizedEmail,
        password: String(password),
        role: nextRole
    };
    users.push(newUser);
    const token = createToken(newUser);
    sessions.set(token, newUser);
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
router.post('/login', (req, res) => {
    const { email, password, role } = req.body ?? {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc.' });
    }
    const user = users.find((item) => item.email.toLowerCase() === String(email).toLowerCase() && item.password === String(password));
    if (!user) {
        return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác.' });
    }
    if (role && user.role !== role) {
        return res.status(403).json({ message: 'Vai trò không khớp với tài khoản này.' });
    }
    const token = createToken(user);
    sessions.set(token, user);
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
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    }
    const user = sessions.get(token);
    return res.json({
        user: {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            role: user?.role
        }
    });
});
export default router;
