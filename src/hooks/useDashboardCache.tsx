import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DashboardCache {
  summary: any | null;
  banks: any[];
  cards: any[];
  categories: any[];
  monthlyData: { name: string; total: number }[];
  cardPieData: { name: string; value: number }[];
  catPieData: { name: string; value: number; color: string }[];
  creditLimitData: any[];
  lastFetch: number | null;
  // Filter states
  monthlyFilters: { bank: string; card: string; year: string; month: string; category: string };
  cardPieFilters: { bank: string; dateFrom: string; dateTo: string };
  catPieFilters: { bank: string; dateFrom: string; dateTo: string };
  creditFilters: { bank: string };
}

interface DashboardContextType {
  cache: DashboardCache;
  setCache: (key: keyof DashboardCache, value: any) => void;
  updateMultiple: (updates: Partial<DashboardCache>) => void;
  invalidate: () => void;
  shouldRefetch: () => boolean;
}

const initialCache: DashboardCache = {
  summary: null,
  banks: [],
  cards: [],
  categories: [],
  monthlyData: [],
  cardPieData: [],
  catPieData: [],
  creditLimitData: [],
  lastFetch: null,
  monthlyFilters: { bank: "", card: "", year: "", month: "", category: "" },
  cardPieFilters: { bank: "", dateFrom: "", dateTo: "" },
  catPieFilters: { bank: "", dateFrom: "", dateTo: "" },
  creditFilters: { bank: "" },
};

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCacheState] = useState<DashboardCache>(initialCache);

  const setCache = useCallback((key: keyof DashboardCache, value: any) => {
    setCacheState(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<DashboardCache>) => {
    setCacheState(prev => ({ ...prev, ...updates, lastFetch: Date.now() }));
  }, []);

  const invalidate = useCallback(() => {
    setCacheState(prev => ({ ...prev, lastFetch: null }));
  }, []);

  const shouldRefetch = useCallback(() => {
    return cache.lastFetch === null;
  }, [cache.lastFetch]);

  return (
    <DashboardContext.Provider value={{ cache, setCache, updateMultiple, invalidate, shouldRefetch }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardCache() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardCache must be used within DashboardCacheProvider");
  }
  return context;
}

// Hook to invalidate cache from other pages
export function useInvalidateDashboard() {
  const context = useContext(DashboardContext);
  return context?.invalidate ?? (() => {});
}
