import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const db = getDb();
  const favs = await db.getFavoritesByUser(req.userId);
  const topics = [];
  for (const f of favs) {
    const topic = await db.findTopicById(f.topic_id);
    if (topic) topics.push(topic);
  }
  res.json(topics);
});

router.post('/:topicId', async (req, res) => {
  const db = getDb();
  const topicId = req.params.topicId;
  const topic = await db.findTopicById(topicId);
  if (!topic) return res.status(404).json({ error: '选题不存在' });
  const favorited = await db.toggleFavorite(req.userId, topicId);
  res.json({ favorited });
});

export default router;
