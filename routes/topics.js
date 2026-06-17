import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const db = getDb();
  const rows = await db.getTopicsByUser(req.userId);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { title, description, category, keywords, tags, body, heat, trend, score } = req.body;
  const topic = await db.createTopic({
    user_id: req.userId,
    title,
    description: description || '',
    category: category || 'other',
    keywords: keywords || [],
    tags: tags || [],
    body: body || '',
    heat: heat || 0,
    trend: trend || 'up',
    score: score || 80
  });
  res.json(topic);
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  const topic = await db.findTopicById(req.params.id);
  if (!topic || topic.user_id !== req.userId) {
    return res.status(404).json({ error: '选题不存在' });
  }
  const { title, description, category, keywords, tags, body, heat, trend, score } = req.body;
  const updated = await db.updateTopic(req.params.id, {
    title: title !== undefined ? title : topic.title,
    description: description !== undefined ? description : topic.description,
    category: category !== undefined ? category : topic.category,
    keywords: keywords !== undefined ? keywords : topic.keywords,
    tags: tags !== undefined ? tags : topic.tags,
    body: body !== undefined ? body : topic.body,
    heat: heat !== undefined ? heat : topic.heat,
    trend: trend !== undefined ? trend : topic.trend,
    score: score !== undefined ? score : topic.score
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  const topic = await db.findTopicById(req.params.id);
  if (!topic || topic.user_id !== req.userId) {
    return res.status(404).json({ error: '选题不存在' });
  }
  await db.deleteTopic(req.params.id);
  res.json({ success: true });
});

export default router;
