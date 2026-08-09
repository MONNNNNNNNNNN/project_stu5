import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Child } from '../types';
import { useAuth } from './AuthContext';

interface ChildContextValue {
  children: Child[];
  isLoading: boolean;
  selectedChildId: string | null;
  selectedChild: Child | null;
  selectChild: (id: string) => void;
}

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    () => localStorage.getItem('selectedChildId'),
  );

  const { data, isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: async () => (await api.get<Child[]>('/children')).data,
    enabled: !!user,
  });

  const list = data ?? [];

  useEffect(() => {
    if (isLoading) return;

    // A stored selectedChildId can go stale (child deleted, account recreated with the same
    // browser, switched accounts on this device) — if it no longer matches a real child, either
    // fall back to the first one available or clear it so the "add a child" empty state shows
    // instead of a half-rendered dashboard with no data and no obvious way to fix it.
    if (list.length === 0) {
      if (selectedChildId) {
        setSelectedChildId(null);
        localStorage.removeItem('selectedChildId');
      }
      return;
    }

    if (!list.some((c) => c.id === selectedChildId)) {
      selectChild(list[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, isLoading]);

  function selectChild(id: string) {
    setSelectedChildId(id);
    localStorage.setItem('selectedChildId', id);
  }

  const selectedChild = list.find((c) => c.id === selectedChildId) ?? null;

  return (
    <ChildContext.Provider
      value={{ children: list, isLoading, selectedChildId, selectedChild, selectChild }}
    >
      {reactChildren}
    </ChildContext.Provider>
  );
}

export function useChildren() {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useChildren must be used within ChildProvider');
  return ctx;
}
