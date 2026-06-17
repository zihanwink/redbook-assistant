import express from 'express';
import { getDb } from '../db/index.js';

const router = express.Router();
const ADMIN_KEY = process.env.ADMIN_SECRET || 'redbook-admin-key';

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: '无权限访问管理后台' });
  }
  next();
}

router.get('/users', adminAuth, async (req, res) => {
  const db = getDb();
  const users = await db.getAllUsers();
  res.json(users);
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  const db = getDb();
  await db.deleteUser(req.params.id);
  res.json({ success: true });
});

router.get('/stats', adminAuth, async (req, res) => {
  const db = getDb();
  const stats = await db.getStats();
  res.json(stats);
});

export default router;
