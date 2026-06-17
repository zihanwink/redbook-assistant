import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, Shirt, UtensilsCrossed, Plane, Dumbbell, Home, Smartphone, PawPrint } from 'lucide-react';
import TopicCard from '../components/TopicCard';
import { topics, categories } from '../data/mockData';
import { getFavoriteSet, toggleFavorite } from '../utils/storage';

const iconMap = { LayoutGrid, Sparkles, Shirt, UtensilsCrossed, Plane, Dumbbell, Home, Smartphone, PawPrint };

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [favoriteSet, setFavoriteSet] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    setFavoriteSet(getFavoriteSet());
  }, []);

  const handleFavorite = (topicId) => {
    toggleFavorite(topicId);
    setFavoriteSet(getFavoriteSet());
  };

  const handleTopicPress = (topic) => {
    navigate(`/topic/${topic.id}`, { state: { topic } });
  };

  const filteredTopics =
    activeCategory === 'all'
      ? [...topics].sort((a, b) => b.heat - a.heat)
      : topics
          .filter((t) => t.category === activeCategory)
          .sort((a, b) => b.heat - a.heat);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-title">选题灵感</div>
        <div className="page-header-sub">发现热门选题，激发创作灵感</div>
      </div>

      <div className="category-bar">
        <div className="category-list">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon];
            return (
              <button
                key={cat.id}
                className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {Icon && <Icon size={16} />}
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {filteredTopics.length > 0 ? (
        <div className="topic-grid">
          {filteredTopics.map((topic) => (
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
          <div className="empty-title">暂无该分类的选题</div>
        </div>
      )}
    </div>
  );
}