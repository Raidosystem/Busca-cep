import { useState, useEffect } from 'react';

export function useFavorites(key = 'favorites') {
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = () => {
    const stored = localStorage.getItem(key);
    if (stored) setFavorites(JSON.parse(stored));
  };

  useEffect(() => {
    loadFavorites();
  }, [key]);

  const saveFavorites = (items) => {
    setFavorites(items); // Atualiza o estado, força re-render nos componentes que usam o hook
    localStorage.setItem(key, JSON.stringify(items));
  };

  const addFavorite = (item) => {
    if (!item.key) return;
    const exists = favorites.some(f => f.key === item.key);
    if (!exists) {
      saveFavorites([...favorites, item]);
    }
  };

  const removeFavorite = (itemKey) => {
    const filtered = favorites.filter(f => f.key !== itemKey);
    saveFavorites(filtered);
  };

  const refreshFavorites = () => {
    loadFavorites();
  };

  return { favorites, addFavorite, removeFavorite, refreshFavorites };
}


// --- Histórico de pesquisas ---
export function useHistory(key = 'history') {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setHistory(JSON.parse(stored));
  }, [key]);

  const addHistory = (item) => {
    if (!item) return;
    const newHistory = [item, ...history.filter(h => h !== item)];
    setHistory(newHistory);
    localStorage.setItem(key, JSON.stringify(newHistory.slice(0, 10)));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(key);
  };

  return { history, addHistory, clearHistory };
}
