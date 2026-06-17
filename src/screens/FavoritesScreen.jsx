import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import TopicCard from '../components/TopicCard';
import { topics } from '../data/mockData';
import { getFavorites, toggleFavorite } from '../utils/storage';

export default function FavoritesScreen() {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setFavoriteIds(getFavorites());
  }, []);

  const handleFavorite = (topicId) => {
    const favs = toggleFavorite(topicId);
    setFavoriteIds([...favs]);
  };

  const handleTopicPress = (topic) => {
    navigate(`/topic/${topic.id}`, { state: { topic } });
  };

  const favoriteTopics = topics
    .filter((t) => favoriteIds.includes(t.id))
    .sort((a, b) => b.heat - a.heat);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-title">我的收藏</div>
        <div className="page-header-sub">
          {favoriteTopics.length > 0
            ? `已收藏 ${favoriteTopics.length} 个选题`
            : '收藏你感兴趣的选题，随时查看灵感'}
        </div>
      </div>

      {favoriteTopics.length > 0 ? (
        <div className="topic-grid">
          {favoriteTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onPress={handleTopicPress}
              onFavorite={handleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={64} />
          <div className="empty-title">还没有收藏任何选题</div>
          <div className="empty-hint">浏览热门选题，点击爱心即可收藏</div>
          <button className="btn-primary" onClick={() => navigate('/')}>
            去看看热门选题
          </button>
        </div>
      )}
    </div>
  );
}