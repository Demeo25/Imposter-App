import { useState, useEffect } from 'react';

interface GameSession {
  playerId: number;
  roomCode: string;
}

const SESSION_KEY = 'imposter_game_session';

export function useSession() {
  const [session, setSessionState] = useState<GameSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setSession = (newSession: GameSession | null) => {
    if (newSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    setSessionState(newSession);
  };

  return { session, setSession };
}
