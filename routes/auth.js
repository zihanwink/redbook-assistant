import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少需要6位' });
  }
  const db = getDb();
  const existing = await db.findUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  if (phone) {
    const existingByPhone = await db.findUserByPhone(phone);
    if (existingByPhone) {
      return res.status(409).json({ error: '手机号已被注册' });
    }
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = await db.createUser({ username, password_hash: hash, phone: phone || '' });
  const token = generateToken(user.id);
  res.json({ token, userId: user.id, username: user.username });
});

router.post('/login', async (req, res) => {
  const { username, password, rememberMe } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const db = getDb();
  const user = await db.findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const expiresIn = rememberMe ? '30d' : '1d';
  const token = generateToken(user.id, expiresIn);
  res.json({ token, userId: user.id, username: user.username });
});

router.post('/forgot-password', async (req, res) => {
  const { username, phone, newPassword } = req.body;
  if (!username || !phone || !newPassword) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少需要6位' });
  }
  const db = getDb();
  const user = await db.findUserByUsername(username);
  if (!user || user.phone !== phone) {
    return res.status(400).json({ error: '用户名和手机号不匹配' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.updateUser(user.id, { password_hash: hash });
  res.json({ success: true });
});

router.get('/me', authMiddleware, async (req, res) => {
  const db = getDb();
  const user = await db.findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ id: user.id, username: user.username, phone: user.phone || '' });
});

router.put('/profile', authMiddleware, async (req, res) => {
  const { phone, oldPassword, newPassword } = req.body;
  const db = getDb();
  const user = await db.findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const updates = {};

  if (phone !== undefined) {
    const existingByPhone = phone ? await db.findUserByPhone(phone) : null;
    if (existingByPhone && existingByPhone.id !== user.id) {
      return res.status(409).json({ error: '手机号已被其他账号绑定' });
    }
    updates.phone = phone;
  }

  if (newPassword) {
    if (!oldPassword) {
      return res.status(400).json({ error: '修改密码需要提供旧密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少需要6位' });
    }
    if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
      return res.status(400).json({ error: '旧密码错误' });
    }
    updates.password_hash = bcrypt.hashSync(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '没有要更新的内容' });
  }

  await db.updateUser(user.id, updates);
  res.json({ success: true, username: user.username, phone: updates.phone !== undefined ? updates.phone : (user.phone || '') });
});

export default router;
