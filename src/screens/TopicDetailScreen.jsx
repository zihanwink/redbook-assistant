import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Heart, Share2, CheckCircle, Bulb, Camera, FileText, Clock } from 'lucide-react';
import { categories } from '../data/mockData';
import { toggleFavorite } from '../utils/storage';

export default function TopicDetailScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const topic = location.state?.topic;

  const [isFav, setIsFav] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('redbook_favorites') || '[]').includes(topic?.id);
    } catch { return false; }
  });

  if (!topic) {
    return (
      <div className="page-content">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← 返回
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-title">选题不存在</div>
        </div>
      </div>
    );
  }

  const trendConfig = {
    hot: { label: '热门选题', color: '#FF2442', className: 'hot' },
    up: { label: '上升选题', color: '#FF6B35', className: 'up' },
    new: { label: '新选题', color: '#4CAF50', className: 'new' },
  };

  const trend = trendConfig[topic.trend] || trendConfig.up;
  const categoryName = categories.find((c) => c.id === topic.category)?.name || '综合';

  const handleFavorite = () => {
    toggleFavorite(topic.id);
    setIsFav(!isFav);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: topic.title,
        text: `小红书选题灵感：「${topic.title}」\n${topic.description}`,
      });
    }
  };

  return (
    <div className="detail-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 选题详情
        </button>
      </div>

      <div className="detail-content">
        <div className={`detail-banner ${trend.className}`}>
          <div className="detail-banner-left">
            {trend.label}
          </div>
          <div className="detail-cat-badge">{categoryName}</div>
        </div>

        <div className="detail-title">{topic.title}</div>

        <div className="detail-info">
          <span className="detail-heat">
            <Eye size={14} />
            热度 {topic.heat > 10000 ? `${(topic.heat / 10000).toFixed(1)}万` : topic.heat}
          </span>
          <span className="detail-date">更新于 {topic.createdAt}</span>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">选题描述</div>
          <div className="detail-desc">{topic.description}</div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">关联关键词</div>
          <div className="detail-keywords">
            {topic.keywords.map((kw, i) => (
              <span key={i} className="detail-kw">#{kw}</span>
            ))}
          </div>
        </div>

        {topic.tags && topic.tags.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">内容标签</div>
            <div className="detail-tags">
              {topic.tags.map((tag, i) => (
                <span key={i} className="detail-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">创作建议</div>
          <div className="tip-card">
            <div className="tip-item">
              <Bulb size={16} />
              <span className="tip-text">建议结合个人真实体验，增加内容的可信度和亲和力</span>
            </div>
            <div className="tip-item">
              <Camera size={16} />
              <span className="tip-text">封面图建议使用高清实拍图，第一张图决定点击率</span>
            </div>
            <div className="tip-item">
              <FileText size={16} />
              <span className="tip-text">标题可加入数字或疑问句，更容易吸引用户点击</span>
            </div>
            <div className="tip-item">
              <Clock size={16} />
              <span className="tip-text">发布最佳时间：工作日 12:00-14:00 或 18:00-22:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-bottom-bar">
        <button className={`bottom-action ${isFav ? 'active' : ''}`} onClick={handleFavorite}>
          <Heart size={22} fill={isFav ? '#FF2442' : 'none'} />
          {isFav ? '已收藏' : '收藏'}
        </button>

        <button className="bottom-action" onClick={handleShare}>
          <Share2 size={20} />
          分享
        </button>

        <button className="use-btn" onClick={() => navigate(-1)}>
          <CheckCircle size={18} />
          采纳这个选题
        </button>
      </div>
    </div>
  );
}