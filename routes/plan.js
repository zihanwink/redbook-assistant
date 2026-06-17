import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const db = getDb();
  const plans = await db.getPlansByUser(req.userId);
  const topics = [];
  for (const p of plans) {
    const topic = await db.findTopicById(p.topic_id);
    if (topic) topics.push(topic);
  }
  res.json(topics);
});

router.post('/:topicId', async (req, res) => {
  const db = getDb();
  const topicId = req.params.topicId;
  const topic = await db.findTopicById(topicId);
  if (!topic) return res.status(404).json({ error: '选题不存在' });
  const adopted = await db.togglePlan(req.userId, topicId);
  res.json({ adopted });
});

export default router;
