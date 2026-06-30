/**
 * 小红书选题策划 — 从 .cursor/skills/xhs-topic-strategist/ 加载 Prompt
 * Skill 文档为唯一维护源，本文件负责加载、演示数据与响应解析
 */

const SKILL_URL_BASE = '/.cursor/skills/xhs-topic-strategist';
const IS_NODE = typeof window === 'undefined';

const promptCache = {};

/** 浏览器内置 prompt（与 .cursor/skills/ 下 md 保持同步，免网络请求） */
const BROWSER_SKILL_PROMPTS = {
  'PROMPT_SYSTEM.md': `你是小红书选题策划师，熟悉平台搜索习惯与笔记生态。严格遵循本 Skill 规范输出。

## 核心原则

- 真实、具体、小切口、有场景、有经验感；可收藏、可互动
- 禁止论文腔、模板腔、AI 腔；禁止空泛描述
- 严禁：围绕、从…角度切入、本文将、综上所述、首先其次最后、近年来、随着时代发展、大家可以根据自身情况、制作一期有参考价值的
- 禁止编造个人经历、数据、平台排名；不确定处用「参考」「思路」表述

## 标题（18 字内优先）

- 必须有：具体人群 / 具体场景 / 具体痛点 / 反差 / 数字 中的至少两项
- 推荐模板：给【人群】的【问题】避坑清单；我以前以为【误区】后来发现【认知】；【场景】别急着【动作】先看这几点
- 禁止：「关键词｜入门指南」机械拼接、绝对化承诺、标题党

## 描述（50–80 字）

- 结构：目标用户 + 具体痛点 + 内容切入点 + 读者收获
- 口语自然，像博主对粉丝说话；可用「如果你也是…」「适合收藏对照」
- 每条描述必须与标题角度不同，不能换汤不换药

## 分类

- category 用中文，优先从：{{VALID_CATEGORIES}}
- 都不匹配时可新建 2–4 字中文分类名

## 评分 score（70–95）

- 综合痛点强度、搜索价值、差异化、可执行性（非平台官方排名）
- 5 条应有梯度，最高不超过 95

## 输出

仅返回 JSON 数组，无 markdown 包裹：
[{"title":"...","description":"...","keywords":["..."],"category":"旅行","score":92}]

每条 keywords 3–5 个。生成 5 条选题，角度必须互不重复。描述尽量精炼，不要冗长。`,
  'PROMPT_USER.md': `关键词：{{KEYWORD}}
{{CATEGORY_LINE}}

请生成 5 个小红书选题。标题要有钩子，描述 50 字左右、具体可执行，禁止模板化空话。`,
};

async function getSkillText(name) {
  if (promptCache[name]) return promptCache[name];
  if (!IS_NODE) {
    promptCache[name] = BROWSER_SKILL_PROMPTS[name] || '';
    return promptCache[name];
  }
  const { readFileSync, existsSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const skillDir = join(dirname(fileURLToPath(import.meta.url)), '../.cursor/skills/xhs-topic-strategist');
  const p = join(skillDir, name);
  promptCache[name] = existsSync(p) ? readFileSync(p, 'utf8') : (BROWSER_SKILL_PROMPTS[name] || '');
  return promptCache[name];
}

/** 按分类的演示选题角度（函数接收 keyword，返回选题对象） */
const DEMO_ANGLE_BUILDERS = {
  travel: [
    (k) => ({
      title: `${k}人均500实测｜2天1夜路线我踩过的坑`,
      description: `给预算有限但想出门的人：交通怎么选、住哪里不踩雷、哪些「省钱项」其实更费钱。不是照抄路线，是一套可收藏的对照清单。`,
      keywords: [k, '穷游攻略', '避坑清单', '周末游', '学生党'],
      score: 92,
    }),
    (k) => ({
      title: `给${k}新手的3个判断点｜别一上来就订特价票`,
      description: `很多人${k}最先踩的坑是交通和住宿顺序搞反。这篇先讲「先看哪3项再下单」，适合第一次做攻略的人收藏。`,
      keywords: [k, '新手攻略', '省钱技巧', '旅行清单'],
      score: 89,
    }),
    (k) => ({
      title: `我以前以为${k}就是住青旅，后来发现这几项更关键`,
      description: `反常识复盘：${k}真正省下来的往往不是床位，而是吃饭节奏、景点顺序和行李重量。附可对照的自查表思路。`,
      keywords: [k, '反常识', '经验复盘', '小众路线'],
      score: 87,
    }),
    (k) => ({
      title: `${k}拍照打卡｜人少出片的5个机位思路`,
      description: `不追网红排队点，整理适合${k}场景的构图和时间段。创作者可补充自己的实拍图，标注「仅供参考」。`,
      keywords: [k, '拍照打卡', '出片攻略', 'CityWalk'],
      score: 85,
    }),
  ],
  beauty: [
    (k) => ({
      title: `给敏感肌的${k}避坑清单｜这3个成分先别碰`,
      description: `如果你也在纠结${k}怎么选，先看成分表和试用顺序，别一上来堆产品。适合收藏慢慢对照，发布前请核实个人肤质。`,
      keywords: [k, '敏感肌', '避坑', '成分党', '平价好物'],
      score: 91,
    }),
    (k) => ({
      title: `学生党${k}全流程｜月均不到100元怎么搭`,
      description: `针对预算有限的情况，从清洁到防晒排优先级。不是让你照抄品牌，是给你「先买哪几件」的判断框架。`,
      keywords: [k, '学生党', '平价护肤', '护肤流程'],
      score: 88,
    }),
    (k) => ({
      title: `${k}测评红黑榜｜我踩过的雷和真香款`,
      description: `清单式对比：哪些${k}产品 hype 大于实际、哪些值得回购。创作者需补充真实使用体验，勿编造效果。`,
      keywords: [k, '测评', '红黑榜', '好物分享'],
      score: 86,
    }),
  ],
  fashion: [
    (k) => ({
      title: `${k}一衣多穿｜1件单品搭出5套Look`,
      description: `给通勤党和学生党：用基础款做${k}搭配，省时省钱。附搭配公式，不是硬凹造型，是日常能穿的思路。`,
      keywords: [k, '一衣多穿', '胶囊衣橱', '通勤穿搭'],
      score: 90,
    }),
    (k) => ({
      title: `梨形身材${k}指南｜显瘦遮胯的万能公式`,
      description: `针对${k}里最常见的身材痛点，讲比例和单品选择。适合对号入座，别直接套，结合自己的衣柜调整。`,
      keywords: [k, '梨形身材', '显瘦', '穿搭公式'],
      score: 87,
    }),
    (k) => ({
      title: `${k}别急着跟风买｜先问自己这5个问题`,
      description: `减少冲动消费：买${k}相关单品前，用5个问题快速判断需不需要。适合想整理衣橱的人收藏。`,
      keywords: [k, '避坑', '理性消费', '衣橱整理'],
      score: 84,
    }),
  ],
  food: [
    (k) => ({
      title: `${k}懒人版｜电饭煲/空气炸锅就能搞定`,
      description: `租房党、宿舍党适用：${k}不用复杂厨具，步骤拆成「备料-下锅-出锅」三段。适合收藏照着做。`,
      keywords: [k, '懒人食谱', '一人食', '快手菜'],
      score: 89,
    }),
    (k) => ({
      title: `探店${k}｜本地人常去、游客少踩雷的3家`,
      description: `场景化探店思路：怎么选店、怎么点单不浪费。创作者补充真实探店图和人均，勿编造排名。`,
      keywords: [k, '探店', '美食攻略', '本地推荐'],
      score: 86,
    }),
    (k) => ({
      title: `${k}低卡版｜好吃不胖的调整思路`,
      description: `不是极端节食，是替换食材和分量的实操方法。高风险表述改用「参考」「个人记录」，发布前自核。`,
      keywords: [k, '低卡', '健康饮食', '减脂餐'],
      score: 83,
    }),
  ],
  fitness: [
    (k) => ({
      title: `居家${k}跟练｜每天20分钟无器械版`,
      description: `打工人/宝妈碎片化运动：${k}动作拆解+注意事项，附跟练节奏建议。坚持效果因人而异，勿绝对化承诺。`,
      keywords: [k, '居家健身', '跟练', '无器械'],
      score: 90,
    }),
    (k) => ({
      title: `${k}新手别一上来就高强度｜先看这3个基础`,
      description: `减少受伤风险：${k}入门先练什么、怎么判断自己是否到位。适合刚开始恢复运动的人。`,
      keywords: [k, '新手入门', '避坑', '体态矫正'],
      score: 87,
    }),
  ],
  home: [
    (k) => ({
      title: `租房党${k}改造｜200元以内提升幸福感`,
      description: `小成本改造思路：${k}从灯光、收纳、软装哪几项先动。附前后对比占位，创作者补充真实实拍。`,
      keywords: [k, '租房改造', '平价好物', '收纳'],
      score: 88,
    }),
    (k) => ({
      title: `${k}收纳｜小户型也能整洁的5个位置`,
      description: `清单式整理：${k}场景下最容易乱的角落和对应解法。不是极简主义表演，是普通人能维持的方案。`,
      keywords: [k, '收纳整理', '小户型', 'RoomTour'],
      score: 85,
    }),
  ],
  tech: [
    (k) => ({
      title: `${k}隐藏功能｜90%的人没开过的实用设置`,
      description: `步骤化教程：${k}里提升效率的功能，附设置路径。不编造数据，标注系统版本差异。`,
      keywords: [k, '隐藏功能', '使用技巧', '效率'],
      score: 91,
    }),
    (k) => ({
      title: `${k}怎么选？3个维度对比后再下单`,
      description: `决策框架而非硬推：看${k}时先比性能/续航/生态哪几项。适合纠结党收藏对照。`,
      keywords: [k, '选购指南', '对比评测', '数码好物'],
      score: 87,
    }),
  ],
  pet: [
    (k) => ({
      title: `新手${k}必备清单｜这些其实不用买`,
      description: `养宠第一年最容易花冤枉钱的地方：${k}相关用品优先级排序。创作者补充自家毛孩情况。`,
      keywords: [k, '新手养宠', '避坑', '宠物用品'],
      score: 89,
    }),
    (k) => ({
      title: `${k}行为问题｜先别急着骂，可能是这3个原因`,
      description: `温和复盘常见行为：环境、作息、互动是否到位。非医疗诊断，严重情况请就医。`,
      keywords: [k, '行为训练', '养宠经验', '萌宠日常'],
      score: 85,
    }),
  ],
  other: [
    (k) => ({
      title: `如果你也在纠结${k}｜这篇先收藏`,
      description: `场景开头：${k}里最常见的卡点是什么、我会先看哪3个点。给判断框架，不是空泛科普。`,
      keywords: [k, '实用攻略', '经验分享'],
      score: 86,
    }),
    (k) => ({
      title: `${k}避坑清单｜我整理成一张对照表`,
      description: `踩坑复盘体：${k}里容易忽视的细节和更稳妥的做法。创作者可补充自己的真实经历段落。`,
      keywords: [k, '避坑', '清单', '干货'],
      score: 83,
    }),
    (k) => ({
      title: `不是越贵越好｜${k}的性价比思路`,
      description: `反常识角度：${k}怎么在预算内做选择。避免绝对化结论，用「更适合…的人」表述。`,
      keywords: [k, '性价比', '选购思路'],
      score: 80,
    }),
  ],
};

const KEYWORD_CATEGORY_HINTS = {
  穷游: 'travel', 旅游: 'travel', 旅行: 'travel', 攻略: 'travel', 打卡: 'travel',
  护肤: 'beauty', 化妆: 'beauty', 美妆: 'beauty', 口红: 'beauty',
  穿搭: 'fashion', 衣橱: 'fashion', 通勤: 'fashion',
  食谱: 'food', 美食: 'food', 探店: 'food', 做饭: 'food',
  健身: 'fitness', 减脂: 'fitness', 运动: 'fitness',
  收纳: 'home', 改造: 'home', 租房: 'home',
  手机: 'tech', 数码: 'tech', iPhone: 'tech',
  养猫: 'pet', 养狗: 'pet', 宠物: 'pet',
};

export async function getSkillDir() {
  if (!IS_NODE) return SKILL_URL_BASE;
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  return join(dirname(fileURLToPath(import.meta.url)), '../.cursor/skills/xhs-topic-strategist');
}

export async function buildTopicSystemPrompt(validCategoryNames) {
  const template = await getSkillText('PROMPT_SYSTEM.md');
  return template.replace(/\{\{VALID_CATEGORIES\}\}/g, validCategoryNames);
}

export async function buildTopicUserPrompt(keyword, categoryName) {
  const template = await getSkillText('PROMPT_USER.md');
  const categoryLine = categoryName
    ? `内容分类：${categoryName}`
    : '内容分类：请根据关键词自动判断最合适分类';
  return template
    .replace(/\{\{KEYWORD\}\}/g, keyword || '不限')
    .replace(/\{\{CATEGORY_LINE\}\}/g, categoryLine);
}

/** 预加载 skill prompt（可选，减少首次生成延迟） */
export async function preloadSkillPrompts() {
  await Promise.all([
    getSkillText('PROMPT_SYSTEM.md'),
    getSkillText('PROMPT_USER.md'),
  ]);
}

export function buildDemoTopics(keyword, categoryId, presetSuggestions = []) {
  const kw = (keyword || '').trim();
  let cat = categoryId || 'other';

  if (!categoryId && kw) {
    for (const [hint, id] of Object.entries(KEYWORD_CATEGORY_HINTS)) {
      if (kw.includes(hint)) {
        cat = id;
        break;
      }
    }
  }

  if (presetSuggestions.length && kw) {
    const matched = presetSuggestions.filter(
      (s) =>
        s.title.includes(kw) ||
        s.keywords.some((k) => k.includes(kw) || kw.includes(k)) ||
        s.description.includes(kw)
    );
    if (categoryId) {
      const filtered = matched.filter((s) => s.category === categoryId);
      if (filtered.length >= 3) return filtered.slice(0, 6);
    }
    if (matched.length >= 3) return matched.slice(0, 6);
  }

  if (!kw) {
    return (presetSuggestions.length ? presetSuggestions : []).slice(0, 6);
  }

  const builders = DEMO_ANGLE_BUILDERS[cat] || DEMO_ANGLE_BUILDERS.other;
  return builders.slice(0, 6).map((fn, i) => {
    const item = fn(kw);
    return {
      ...item,
      category: cat,
      score: item.score ?? Math.max(70, 92 - i * 3),
    };
  });
}

export function parseTopicApiResponse(content, fallbackCategory) {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI 返回格式异常');
  const items = JSON.parse(jsonMatch[0]);
  return items.map((item) => ({
    title: (item.title || '').trim(),
    description: (item.description || '').trim(),
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    category: item.category || fallbackCategory || 'other',
    score: Math.min(95, Math.max(70, item.score || 80)),
  }));
}

// Node 环境不在模块加载时预读 prompt，避免拖慢 server 启动
