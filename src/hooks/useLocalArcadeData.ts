import { useState, useEffect } from 'react';

interface ArcadeData {
  version: number;
  personalBests: Record<string, number>;
  gamesPlayed: Record<string, number>;
  settings: {
    sound: boolean;
  };
}

const DEFAULT_DATA: ArcadeData = {
  version: 1,
  personalBests: {},
  gamesPlayed: {},
  settings: {
    sound: true,
  },
};

const STORAGE_KEY = 'arcade_lab_data';

export function useLocalArcadeData() {
  const [data, setData] = useState<ArcadeData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_DATA;
    } catch (e) {
      console.error('Failed to parse local arcade data', e);
      return DEFAULT_DATA;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const savePersonalBest = (gameId: string, score: number) => {
    setData((prev) => {
      const currentBest = prev.personalBests[gameId] || 0;
      if (score > currentBest) {
        return {
          ...prev,
          personalBests: {
            ...prev.personalBests,
            [gameId]: score,
          },
        };
      }
      return prev;
    });
  };

  const incrementGamesPlayed = (gameId: string) => {
    setData((prev) => ({
      ...prev,
      gamesPlayed: {
        ...prev.gamesPlayed,
        [gameId]: (prev.gamesPlayed[gameId] || 0) + 1,
      },
    }));
  };

  const getPersonalBest = (gameId: string) => data.personalBests[gameId] || 0;

  return {
    data,
    savePersonalBest,
    incrementGamesPlayed,
    getPersonalBest,
  };
}
