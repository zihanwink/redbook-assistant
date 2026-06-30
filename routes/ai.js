import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  buildTopicSystemPrompt,
  buildTopicUserPrompt,
  buildDemoTopics,
  parseTopicApiResponse,
} from '../utils/xhsTopicPrompt.js';

const router = express.Router();
router.use(authMiddleware);

const aiSuggestions = [
  { title: '通勤穿搭一周不重样', description: '以「胶囊衣橱」为核心，用少量基础款单品搭出5套不同风格的通勤Look，适合上班族和学生党。', keywords: ['通勤穿搭', '胶囊衣橱', '基础款', '职场穿搭'], category: 'fashion', score: 95 },
  { title: '学生党平价护肤全流程指南', description: '针对学生预算有限的情况，推荐性价比最高的护肤产品和步骤，从清洁到防晒一站式教学。', keywords: ['学生护肤', '平价好物', '护肤流程', '学生党'], category: 'beauty', score: 93 },
  { title: '租房党厨房收纳改造方案', description: '针对租房空间有限的痛点，分享实用的厨房收纳好物和改造技巧，低成本提升生活品质。', keywords: ['租房改造', '厨房收纳', '平价好物', '生活改造'], category: 'home', score: 90 },
  { title: '人均500元玩转长沙｜2天1夜超全攻略', description: '从交通、住宿、美食到景点打卡，详细规划长沙2天1夜游路线。包含本地人推荐的小众景点和隐藏美食。', keywords: ['长沙旅游', '穷游', '周末游', '美食攻略'], category: 'travel', score: 92 },
  { title: '居家健身 20 分钟燃脂跟练', description: '无需器械，只需要一张瑜伽垫，20分钟高效燃脂跟练，适合上班族和宝妈的碎片化运动方案。', keywords: ['居家健身', '燃脂', '跟练', '无器械'], category: 'fitness', score: 91 },
  { title: 'iPhone 隐藏功能大揭秘', description: '盘点 iPhone 上那些鲜为人知但超实用的隐藏功能，包括快捷指令、电池优化、拍照技巧等，让你的 iPhone 更好用。', keywords: ['iPhone', '隐藏功能', '技巧', '效率'], category: 'tech', score: 94 },
];

const CATEGORY_NAMES = '美妆、穿搭、美食、旅行、健身、家居、数码、宠物、其他';

function generateDemo(keyword, category) {
  return buildDemoTopics(keyword, category, aiSuggestions);
}

async function callDeepSeekAPI(keyword, category, apiKey) {
  if (!apiKey) throw new Error('请先配置 API Key');
  const catNameMap = { beauty: '美妆', fashion: '穿搭', food: '美食', travel: '旅行', fitness: '健身', home: '家居', tech: '数码', pet: '宠物', other: '其他' };
  const catName = category ? catNameMap[category] || category : '';

  const [systemPrompt, userPrompt] = await Promise.all([
    buildTopicSystemPrompt(CATEGORY_NAMES),
    buildTopicUserPrompt(keyword, catName),
  ]);

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1200,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'API 请求失败');
  const content = data.choices?.[0]?.message?.content || '';
  return parseTopicApiResponse(content, category);
}

router.post('/generate', async (req, res) => {
  const { keyword, category, apiKey, useApi } = req.body;
  try {
    let results;
    if (useApi && apiKey) {
      results = await callDeepSeekAPI(keyword, category, apiKey);
    } else {
      results = generateDemo(keyword, category);
    }
    res.json(results.slice(0, 6));
  } catch (err) {
    const fallback = generateDemo(keyword, category);
    res.json({ results: fallback, error: err.message, fallback: true });
  }
});

export default router;
