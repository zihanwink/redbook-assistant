import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, Trash2, Flame } from 'lucide-react';
import TopicCard from '../components/TopicCard';
import { topics } from '../data/mockData';
import { getFavoriteSet, toggleFavorite } from '../utils/storage';

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [favoriteSet, setFavoriteSet] = useState(new Set());
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('search_history') || '[]');
    } catch { return []; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    setFavoriteSet(getFavoriteSet());
  }, []);

  const handleFavorite = (topicId) => {
    toggleFavorite(topicId);
    setFavoriteSet(getFavoriteSet());
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim()) {
      const filtered = topics.filter(
        (t) =>
          t.title.includes(text) ||
          t.tags.some((tag) => tag.includes(text)) ||
          t.keywords.some((kw) => kw.includes(text)) ||
          t.description.includes(text)
      );
      setResults(filtered.sort((a, b) => b.heat - a.heat));
    } else {
      setResults([]);
    }
  };

  const handleHistoryPress = (keyword) => {
    setSearchText(keyword);
    handleSearch(keyword);
    const updated = [keyword, ...searchHistory.filter((k) => k !== keyword)].slice(0, 8);
    setSearchHistory(updated);
    localStorage.setItem('search_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
  };

  const handleTopicPress = (topic) => {
    navigate(`/topic/${topic.id}`, { state: { topic } });
  };

  return (
    <div className="page-content">
      <div className="search-header">
        <div className="search-bar">
          <Search size={18} />
          <input
            className="search-input"
            placeholder="搜索选题关键词..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchText && (
            <button className="search-clear" onClick={() => handleSearch('')}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {searchText.trim() ? (
        results.length > 0 ? (
          <div className="topic-grid">
            {results.map((topic) => (
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
            <Search size={48} />
            <div className="empty-title">未找到相关选题</div>
            <div className="empty-hint">试试其他关键词吧</div>
          </div>
        )
      ) : (
        <div className="search-history">
          {searchHistory.length > 0 && (
            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  <Clock size={16} />
                  搜索历史
                </div>
                <button className="search-clear" onClick={clearHistory}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="tag-cloud">
                {searchHistory.map((keyword, i) => (
                  <span
                    key={i}
                    className="history-tag"
                    onClick={() => handleHistoryPress(keyword)}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-title" style={{ color: '#FF2442' }}>
              <Flame size={16} />
              热门搜索
            </div>
            <div className="tag-cloud" style={{ marginTop: 12 }}>
              {['防晒', '早八妆', '通勤穿搭', '电饭煲食谱', '穷游攻略', '租房改造'].map(
                (keyword, i) => (
                  <span
                    key={i}
                    className="hot-tag"
                    onClick={() => handleHistoryPress(keyword)}
                  >
                    {keyword}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}