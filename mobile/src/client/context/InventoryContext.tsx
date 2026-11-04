import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { Product } from '../types/inventory';
import {
  getAllActiveProducts,
  searchProducts,
  getLowStockProducts,
  seedMockProductsIfEmpty,
} from '../database/productRepo';
import { useAuth } from './AuthContext';

// ---- Types ----------------------------------------------------------------

interface InventoryContextValue {
  products: Product[];
  lowStockProducts: Product[];
  isLoading: boolean;
  /** Call after any transaction to refresh all stock values from SQLite */
  refresh: () => Promise<void>;
  /** Real-time search — returns filtered list without mutating products[] (FR27) */
  search: (query: string) => Promise<Product[]>;
  getProductById: (id: string) => Product | undefined;
}

// ---- Context ---------------------------------------------------------------

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load products whenever the user logs in
  useEffect(() => {
    if (isAuthenticated) {
      initialLoad();
    } else {
      setProducts([]);
      setLowStockProducts([]);
    }
  }, [isAuthenticated]);

  async function initialLoad() {
    setIsLoading(true);
    try {
      // Seed 5 realistic drinks so Phase 1 is immediately testable
      await seedMockProductsIfEmpty();
      await loadAll();
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAll() {
    const [all, low] = await Promise.all([
      getAllActiveProducts(),
      getLowStockProducts(),
    ]);
    setProducts(all);
    setLowStockProducts(low);
  }

  const refresh = useCallback(async () => {
    await loadAll();
  }, []);

  const search = useCallback(async (query: string): Promise<Product[]> => {
    if (!query.trim()) return products;
    return searchProducts(query);
  }, [products]);

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  return (
    <InventoryContext.Provider
      value={{ products, lowStockProducts, isLoading, refresh, search, getProductById }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside <InventoryProvider>');
  return ctx;
}
