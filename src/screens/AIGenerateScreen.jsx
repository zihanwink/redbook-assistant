import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { categories } from '../data/mockData';
import { LayoutGrid, Sparkles as SparklesIcon, Shirt, UtensilsCrossed, Plane, Dumbbell, Home, Smartphone, PawPrint } from 'lucide-react';

const iconMap = { LayoutGrid, Sparkles: SparklesIcon, Shirt, UtensilsCrossed, Plane, Dumbbell, Home, Smartphone, PawPrint };

const aiSuggestions = [
  {
    title: '通勤穿搭一周不重样',
    description: '以「胶囊衣橱」为核心，用少量基础款单品搭出5套不同风格的通勤Look，适合上班族和学生党。',
    keywords: ['通勤穿搭', '胶囊衣橱', '基础款', '职场穿搭'],
    category: 'fashion',
    score: 95,
  },
  {
    title: '学生党平价护肤全流程指南',
    description: '针对学生预算有限的情况，推荐性价比最高的护肤产品和步骤，从清洁到防晒一站式教学。',
    keywords: ['学生护肤', '平价好物', '护肤流程', '学生党'],
    category: 'beauty',
    score: 93,
  },
  {
    title: '租房党厨房收纳改造方案',
    description: '针对租房空间有限的痛点，分享实用的厨房收纳好物和改造技巧，低成本提升生活品质。',
    keywords: ['租房改造', '厨房收纳', '平价好物', '生活改造'],
    category: 'home',
    score: 90,
  },
  {
    title: '新一线城市周末游攻略合集',
    description: '整理杭州、成都、长沙等新一线城市的周末游路线，含交通、美食、打卡点全攻略。',
    keywords: ['周末游', '旅游攻略', '新一线城市', '短途旅行'],
    category: 'travel',
    score: 88,
  },
  {
    title: '打工人一周便当灵感合集',
    description: '分享5款简单易做的便当方案，荤素搭配、营养均衡，适合带饭上班的打工人。',
    keywords: ['便当', '打工人', '快手菜', '工作餐'],
    category: 'food',
    score: 87,
  },
  {
    title: '新手养宠必备清单与避坑',
    description: '从宠物用品选购到日常护理，整理新手养宠最容易忽略的准备工作和常见误区。',
    keywords: ['新手养宠', '养宠清单', '避坑指南', '宠物用品'],
    category: 'pet',
    score: 85,
  },
];

const categoryTemplates = {
  beauty: ['平价替代', '测评红黑榜', '妆容教程', '护肤流程', '好物分享'],
  fashion: ['穿搭公式', '一衣多穿', '胶囊衣橱', '身材搭配', '季节穿搭'],
  food: ['懒人食谱', '探店打卡', '低卡美食', '一人食', '甜品教程'],
  travel: ['穷游攻略', '拍照打卡', 'citywalk', '本地人推荐', '小众景点'],
  fitness: ['居家运动', '减脂食谱', '跟练教程', '健身打卡', '体态矫正'],
  home: ['租房改造', '收纳整理', '平价好物', 'roomtour', '软装搭配'],
  tech: ['开箱测评', '隐藏功能', '使用技巧', '对比评测', '好物推荐'],
  pet: ['萌宠日常', '新手攻略', '宠物用品', '护理教程', '行为训练'],
};

export default function AIGenerateScreen() {
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [generatedTopics, setGeneratedTopics] = useState([]);
  const [stage, setStage] = useState('input');
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (!keyword.trim() && !selectedCategory) return;

    setStage('generating');

    setTimeout(() => {
      let results = aiSuggestions;

      if (keyword.trim()) {
        results = results.filter(
          (s) =>
            s.title.includes(keyword) ||
            s.keywords.some((k) => k.includes(keyword)) ||
            s.description.includes(keyword)
        );
      }

      if (selectedCategory) {
        results = results.filter((s) => s.category === selectedCategory);
      }

      if (results.length === 0 && keyword.trim()) {
        const matchedCategory = selectedCategory || 'fashion';
        const templates = categoryTemplates[matchedCategory] || categoryTemplates.fashion;
        const catName = categories.find((c) => c.id === matchedCategory)?.name || '';
        results = templates.slice(0, 3).map((tpl, i) => ({
          title: `${keyword}｜${tpl}`,
          description: `围绕「${keyword}」这个主题，从${tpl}角度切入，结合真实体验和个人观点，制作一期有参考价值的${catName}类内容。`,
          keywords: [keyword, tpl],
          category: matchedCategory,
          score: Math.floor(80 - i * 5),
        }));
      }

      setGeneratedTopics(results.slice(0, 6));
      setStage('result');
    }, 2000);
  };

  const handleReset = () => {
    setKeyword('');
    setSelectedCategory('');
    setGeneratedTopics([]);
    setStage('input');
  };

  const getCategoryName = (catId) => {
    return categories.find((c) => c.id === catId)?.name || '';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-title">AI 选题生成</div>
        <div className="page-header-sub">输入关键词，AI 帮你生成爆款选题</div>
      </div>

      <div style={{ paddingBottom: 20 }}>
        {/* Input Card */}
        <div className="ai-card">
          <div className="ai-label">输入创作方向或关键词</div>
          <input
            className="ai-input"
            placeholder="例如：早八妆、通勤穿搭、穷游..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={stage !== 'input'}
          />

          <div className="ai-label" style={{ marginTop: 16 }}>选择内容分类（可选）</div>
          <div className="category-grid">
            {categories
              .filter((c) => c.id !== 'all')
              .slice(0, 8)
              .map((cat) => {
                const Icon = iconMap[cat.icon];
                return (
                  <button
                    key={cat.id}
                    className={`cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      if (stage !== 'input') return;
                      setSelectedCategory(selectedCategory === cat.id ? '' : cat.id);
                    }}
                    disabled={stage !== 'input'}
                  >
                    {Icon && <Icon size={14} />}
                    {cat.name}
                  </button>
                );
              })}
          </div>

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={stage !== 'input' || (!keyword.trim() && !selectedCategory)}
          >
            {stage === 'generating' ? (
              <>
                <Loader2 size={18} className="spin" />
                AI 正在思考...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                生成选题建议
              </>
            )}
          </button>
        </div>

        {/* Generating */}
        {stage === 'generating' && (
          <div className="generating-box">
            <div className="pulse-circle">
              <Sparkles size={28} />
            </div>
            <div className="generating-title">AI 正在分析创作趋势...</div>
            <div className="generating-hint">结合热门话题与你的关键词生成爆款选题</div>
          </div>
        )}

        {/* Results */}
        {stage === 'result' && generatedTopics.length > 0 && (
          <div className="result-section">
            <div className="result-header">
              <div className="result-title">为你生成 {generatedTopics.length} 个选题</div>
              <button className="regenerate-link" onClick={handleReset}>重新生成</button>
            </div>

            {generatedTopics.map((topic, index) => (
              <div
                key={index}
                className="result-card"
                onClick={() =>
                  navigate(`/topic/${Date.now()}`, {
                    state: {
                      topic: {
                        ...topic,
                        id: Date.now().toString(),
                        heat: 0,
                        trend: 'new',
                        tags: topic.keywords,
                        createdAt: new Date().toISOString().slice(0, 10),
                      },
                    },
                  })
                }
              >
                <div className="result-card-top">
                  <div className="score-badge">
                    <TrendingUp size={12} />
                    {topic.score}分
                  </div>
                  {topic.category && (
                    <div className="cat-badge">{getCategoryName(topic.category)}</div>
                  )}
                </div>
                <div className="result-card-title">{topic.title}</div>
                <div className="result-card-desc">{topic.description}</div>
                <div className="result-keywords">
                  {topic.keywords.map((kw, i) => (
                    <span key={i} className="result-kw">#{kw}</span>
                  ))}
                </div>
                <div className="view-detail">
                  查看详情 <ChevronRight size={14} />
                </div>
              </div>
            ))}

            <button className="regenerate-btn" onClick={handleReset}>
              <RefreshCw size={16} />
              换个方向试试
            </button>
          </div>
        )}
      </div>
    </div>
  );
}