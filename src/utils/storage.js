const FAVORITES_KEY = 'redbook_favorites';

export const getFavorites = () => {
  try {
    const json = localStorage.getItem(FAVORITES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
};

export const toggleFavorite = (topicId) => {
  const favorites = getFavorites();
  const index = favorites.indexOf(topicId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(topicId);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
};

export const getFavoriteSet = () => {
  return new Set(getFavorites());
};