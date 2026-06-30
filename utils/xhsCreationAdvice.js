/**
 * 基于 xhs-topic-strategist skill 生成选题专属创作建议
 * @see .cursor/skills/xhs-topic-strategist/STYLE_GUIDE.md
 */

const CATEGORY_PROFILES = {
  beauty: {
    audience: '护肤/化妆新手',
    cover: '封面大字「3 个成分先看」+ 产品平铺或梳妆台场景',
    risk: '功效类用「个人感受/参考」，勿写根治、100% 有效',
  },
  fashion: {
    audience: '通勤党/学生党',
    cover: '封面大字「一衣多穿公式」+ 全身镜对镜或街头场景',
    risk: null,
  },
  food: {
    audience: '一人食/探店党',
    cover: '封面大字「懒人版/探店清单」+ 成品特写',
    risk: '低卡/健康类用「参考」「个人记录」，勿极端节食承诺',
  },
  travel: {
    audience: '周末出游/穷游党',
    cover: '封面大字「路线/避坑清单」+ 地图拼图或实景',
    risk: null,
  },
  fitness: {
    audience: '居家运动/减脂新手',
    cover: '封面大字「跟练要点」+ 动作截图标注',
    risk: '效果因人而异，勿写「X 天必瘦/必见效」',
  },
  home: {
    audience: '租房党/小户型',
    cover: '封面大字「200 元改造清单」+ 前后对比（需真实图）',
    risk: null,
  },
  tech: {
    audience: '数码爱好者/效率党',
    cover: '封面大字「隐藏功能/选购 3 点」+ 设置界面截图',
    risk: null,
  },
  pet: {
    audience: '新手铲屎官',
    cover: '封面大字「新手别踩坑」+ 萌宠日常实拍',
    risk: '行为/健康类非医疗诊断，严重情况请就医',
  },
  other: {
    audience: '目标读者',
    cover: '封面大字提炼核心痛点 + 场景实拍照',
    risk: null,
  },
};

const AUDIENCE_HINTS = [
  { re: /学生|大学生|宿舍/, label: '学生党' },
  { re: /打工|通勤|早八|上班族/, label: '打工人/通勤党' },
  { re: /新手|入门|小白/, label: '新手' },
  { re: /租房|小户型/, label: '租房党' },
  { re: /宝妈|妈妈/, label: '宝妈' },
  { re: /敏感肌/, label: '敏感肌' },
];

function detectAudience(title, desc) {
  const text = `${title} ${desc}`;
  for (const { re, label } of AUDIENCE_HINTS) {
    if (re.test(text)) return label;
  }
  return null;
}

function detectAngle(title, desc) {
  const text = `${title} ${desc}`;
  if (/避坑|踩坑|雷区|别买/.test(text)) {
    return '踩坑复盘体：先写常见误区 → 再写更稳妥做法 → 整理成可收藏对照清单';
  }
  if (/实测|亲测|试过|复盘/.test(text)) {
    return '经验复盘体：写清「以前以为…后来发现…」，补充你的真实过程（勿编造数据）';
  }
  if (/教程|步骤|流程|怎么|框架/.test(text)) {
    return '步骤教程体：拆成 3–5 步，每步配一句「适合什么情况」';
  }
  if (/清单|必备|合集|攻略/.test(text)) {
    return '清单收藏体：按优先级排序，标注「必做/可选/可跳过」';
  }
  if (/对比|vs|VS|区别/.test(text)) {
    return '对比决策体：常见做法 vs 更稳妥做法，帮读者快速判断';
  }
  if (/Claude|AI|ChatGPT|大模型|文案/.test(text)) {
    return '工具实操体：痛点场景 → 我的用法/提示词框架 → 可复用模板（标注需人工核对）';
  }
  return '场景钩子开头：具体人群 + 具体痛点 → 给出可执行方法/判断框架';
}

function buildNoteStructure(audience) {
  const who = audience || '目标读者';
  return (
    `1.场景钩子（「如果你也是${who}…」）→ ` +
    '2.痛点共鸣 → 3.误区/反常识 → 4.具体方法或清单 → ' +
    '5.示例/对照表 → 6.温和提醒（「仅供参考，结合自己情况」）→ 7.评论互动'
  );
}

function buildTitleAlternatives(title, keywords, category) {
  const profile = CATEGORY_PROFILES[category] || CATEGORY_PROFILES.other;
  const kw = keywords?.[0] || title.replace(/[｜|].*$/, '').slice(0, 10);
  const audience = detectAudience(title, '') || profile.audience.split('/')[0];
  const alts = [];

  if (!/如果你也/.test(title)) {
    alts.push(`如果你也在纠结${kw}｜这篇先收藏`);
  }
  if (!/避坑/.test(title)) {
    alts.push(`给${audience}的${kw}避坑清单`);
  }
  if (!/我以前以为/.test(title) && alts.length < 2) {
    alts.push(`不是越贵越好｜${kw}的性价比思路`);
  }
  if (alts.length === 0) {
    alts.push(`${kw}别急着跟风｜先问自己这 3 个问题`);
    alts.push(`适合${audience}的${kw}思路，不用硬凹`);
  }
  return alts.slice(0, 2);
}

function buildCommentPrompt(title, category) {
  const text = title;
  if (/教程|步骤|怎么|框架|Claude|AI|文案/.test(text)) {
    return '「你现在卡在哪一步？A 开头难 B 中间不会写 C 结尾互动 — 评论区说说」';
  }
  if (/避坑|清单|选购/.test(text)) {
    return '「你最容易踩的坑是哪一个？可以说说你的场景，我按情况帮你拆」';
  }
  if (/对比|vs|选/.test(text)) {
    return '「你更像是 A 还是 B 的情况？评论区对号入座」';
  }
  const prompts = {
    beauty: '「你的肤质/预算大概是？可以说说，我按情况推荐优先级」',
    food: '「你想看清单版、步骤版还是探店版？评论区告诉我」',
    travel: '「你计划几人/几天/预算？评论区说说，我帮你排路线思路」',
    fitness: '「你目前运动基础如何？零基础还是有一定基础？」',
  };
  return prompts[category] || '「这个话题你最想避开的坑是什么？评论区聊聊」';
}

function buildDifferentiation(title, desc) {
  const text = `${title} ${desc}`;
  if (/AI|Claude|ChatGPT|文案/.test(text)) {
    return '差异化：展示真实输入→输出对比截图，强调「人工改 3 处」而非一键发布';
  }
  if (/平价|省钱|穷/.test(text)) {
    return '差异化：列具体花费区间和替代方案，别只喊口号';
  }
  return '差异化：收窄人群或场景（如「早八 5 分钟版」），比泛泛教程更易收藏';
}

/**
 * @param {{ title?: string, description?: string, keywords?: string[], category?: string }} topic
 * @returns {{ label: string, text: string }[]}
 */
export function buildCreationAdvice(topic) {
  const title = topic.title || '';
  const desc = topic.description || '';
  const keywords = topic.keywords || [];
  const category = topic.category || 'other';
  const profile = CATEGORY_PROFILES[category] || CATEGORY_PROFILES.other;
  const audience = detectAudience(title, desc) || profile.audience;

  const items = [
    { label: '内容角度', text: detectAngle(title, desc) },
    { label: '笔记结构', text: buildNoteStructure(audience) },
    { label: '封面方案', text: profile.cover },
    {
      label: '标题备选',
      text: buildTitleAlternatives(title, keywords, category).map((t, i) => `${i + 1}. ${t}`).join('　'),
    },
    { label: '评论引导', text: buildCommentPrompt(title, category) },
    { label: '差异化建议', text: buildDifferentiation(title, desc) },
  ];

  if (profile.risk) {
    items.push({ label: '风险提醒', text: profile.risk });
  }

  items.push({
    label: '人工需补充',
    text: '真实经历段落、实拍图/截图、发布前事实核查与合规判断（Skill 要求，勿跳过）',
  });

  return items;
}
