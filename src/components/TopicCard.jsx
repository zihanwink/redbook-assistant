import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Heart } from 'lucide-react';
import { getFavoriteSet, toggleFavorite } from '../utils/storage';

export default function TopicCard({ topic, onPress, onFavorite }) {
  const [isFav, setIsFav] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFav(getFavoriteSet().has(topic.id));
  }, [topic.id]);

  const trendConfig = {
    hot: { label: '热门', color: '#FF2442', className: 'hot' },
    up: { label: '上升', color: '#FF6B35', className: 'up' },
    new: { label: '新题', color: '#4CAF50', className: 'new' },
  };

  const trend = trendConfig[topic.trend] || trendConfig.up;

  const handleFav = (e) => {
    e.stopPropagation();
    const favs = toggleFavorite(topic.id);
    setIsFav(favs.includes(topic.id));
    if (onFavorite) onFavorite(topic.id);
  };

  const handleClick = () => {
    if (onPress) {
      onPress(topic);
    } else {
      navigate(`/topic/${topic.id}`, { state: { topic } });
    }
  };

  return (
    <div className="topic-card" onClick={handleClick}>
      <div className="card-trend-row">
        <span className={`trend-badge ${trend.className}`}>
          {trend.label}
        </span>
        <button className="fav-btn" onClick={handleFav}>
          <Heart size={18} fill={isFav ? '#FF2442' : 'none'} color={isFav ? '#FF2442' : '#999'} />
        </button>
      </div>
      <div className="card-title">{topic.title}</div>
      <div className="card-tags">
        {topic.tags.slice(0, 2).map((tag, i) => (
          <span key={i} className="card-tag">{tag}</span>
        ))}
      </div>
      <div className="card-bottom">
        <span className="card-heat">
          <Eye size={12} />
          {topic.heat > 10000 ? `${(topic.heat / 10000).toFixed(1)}万` : topic.heat}
        </span>
        <span className="card-date">{topic.createdAt.slice(5)}</span>
      </div>
    </div>
  );
}