import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Home, Search, Sparkles, Heart } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import AIGenerateScreen from './screens/AIGenerateScreen';
import TopicDetailScreen from './screens/TopicDetailScreen';

function TabBar() {
  const location = useLocation();
  const path = location.pathname;

  const tabs = [
    { path: '/', label: '选题灵感', icon: Home },
    { path: '/search', label: '搜索', icon: Search },
    { path: '/ai', label: 'AI 生成', icon: Sparkles },
    { path: '/favorites', label: '收藏', icon: Heart },
  ];

  // 详情页不显示底部导航
  if (path.startsWith('/topic/')) return null;

  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = (tab.path === '/' && path === '/') ||
          (tab.path !== '/' && path.startsWith(tab.path));
        return (
          <a
            key={tab.path}
            href={tab.path}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', tab.path);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            <Icon size={22} />
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/favorites" element={<FavoritesScreen />} />
          <Route path="/ai" element={<AIGenerateScreen />} />
          <Route path="/topic/:id" element={<TopicDetailScreen />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  );
}