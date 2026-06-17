import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const aiSuggestions = [
  { title: '通勤穿搭一周不重样', description: '以「胶囊衣橱」为核心，用少量基础款单品搭出5套不同风格的通勤Look，适合上班族和学生党。', keywords: ['通勤穿搭', '胶囊衣橱', '基础款', '职场穿搭'], category: 'fashion', score: 95 },
  { title: '学生党平价护肤全流程指南', description: '针对学生预算有限的情况，推荐性价比最高的护肤产品和步骤，从清洁到防晒一站式教学。', keywords: ['学生护肤', '平价好物', '护肤流程', '学生党'], category: 'beauty', score: 93 },
  { title: '租房党厨房收纳改造方案', description: '针对租房空间有限的痛点，分享实用的厨房收纳好物和改造技巧，低成本提升生活品质。', keywords: ['租房改造', '厨房收纳', '平价好物', '生活改造'], category: 'home', score: 90 },
  { title: 'CityWalk 城市漫步拍照指南', description: '分享城市中适合拍照打卡的小众路线，包含拍摄角度、滤镜参数和穿搭建议，轻松出大片。', keywords: ['CityWalk', '拍照打卡', '城市漫步', '摄影技巧'], category: 'travel', score: 92 },
  { title: '居家健身 20 分钟燃脂跟练', description: '无需器械，只需要一张瑜伽垫，20分钟高效燃脂跟练，适合上班族和宝妈的碎片化运动方案。', keywords: ['居家健身', '燃脂', '跟练', '无器械'], category: 'fitness', score: 91 },
  { title: 'iPhone 隐藏功能大揭秘', description: '盘点 iPhone 上那些鲜为人知但超实用的隐藏功能，包括快捷指令、电池优化、拍照技巧等，让你的 iPhone 更好用。', keywords: ['iPhone', '隐藏功能', '技巧', '效率'], category: 'tech', score: 94 },
];

const catTemplates = {
  beauty: ['平价替代', '测评红黑榜', '妆容教程', '护肤流程', '好物分享'],
  fashion: ['穿搭公式', '一衣多穿', '胶囊衣橱', '身材搭配', '季节穿搭'],
  food: ['懒人食谱', '探店打卡', '低卡美食', '一人食', '甜品教程'],
  travel: ['穷游攻略', '拍照打卡', 'citywalk', '本地人推荐', '小众景点'],
  fitness: ['居家运动', '减脂食谱', '跟练教程', '健身打卡', '体态矫正'],
  home: ['租房改造', '收纳整理', '平价好物', 'roomtour', '软装搭配'],
  tech: ['开箱测评', '隐藏功能', '使用技巧', '对比评测', '好物推荐'],
  pet: ['萌宠日常', '新手攻略', '宠物用品', '护理教程', '行为训练'],
  other: ['入门指南', '经验分享', '避坑指南', '好物推荐', '实用教程']
};

function generateDemo(keyword, category) {
  let results = [...aiSuggestions];
  if (keyword && keyword.trim()) {
    results = results.filter(s => s.title.includes(keyword) || s.keywords.some(k => k.includes(keyword)) || s.description.includes(keyword));
  }
  if (category) results = results.filter(s => s.category === category);
  if (results.length === 0 && keyword && keyword.trim()) {
    const mc = category || 'other';
    const tpls = catTemplates[mc] || catTemplates.other;
    results = tpls.slice(0, 3).map((tpl, i) => ({
      title: keyword + '｜' + tpl,
      description: '围绕「' + keyword + '」这个主题，从' + tpl + '角度切入，结合真实体验和个人观点，制作一期有参考价值的' + mc + '类内容。',
      keywords: [keyword, tpl],
      category: mc,
      score: Math.floor(80 - i * 5)
    }));
  }
  return results.slice(0, 6);
}

async function callDeepSeekAPI(keyword, category, apiKey) {
  if (!apiKey) throw new Error('请先配置 API Key');
  const catName = category || '通用';
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个小红书选题策划专家。请根据用户提供的关键词和分类，生成6个小红书选题。每个选题包含标题、描述、关键词数组、分类。以JSON数组格式返回。' },
        { role: 'user', content: `关键词：${keyword || '不限'}\n分类：${catName}\n请生成6个小红书选题，格式：[{"title":"","description":"","keywords":[""],"category":""}]` }
      ],
      temperature: 0.8
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'API 请求失败');
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI 返回格式异常');
  const items = JSON.parse(jsonMatch[0]);
  return items.map(item => ({
    title: item.title || '',
    description: item.description || '',
    keywords: item.keywords || [],
    category: item.category || category || 'other',
    score: item.score || 80
  }));
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
    // 降级到演示模式
    const fallback = generateDemo(keyword, category);
    res.json({ results: fallback, error: err.message, fallback: true });
  }
});

export default router;
