import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CartState, Category, PaymentMethod, Product, Review } from '../types';

interface StoreContextValue {
  settings: Record<string, string>;
  categories: Category[];
  featuredProducts: Product[];
  bestSellers: Product[];
  recentReviews: Review[];
  paymentMethods: PaymentMethod[];
  cart: CartState;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  wishlistIds: number[];
  toggleWishlist: (productId: number) => void;
  addToCart: (productId: number, quantity?: number, openDrawer?: boolean) => Promise<boolean>;
  updateCartQty: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  applyDiscountCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  refreshCart: () => Promise<void>;
  refreshStorefront: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
  loadingStorefront: boolean;
}

const emptyCart: CartState = {
  items: [],
  item_count: 0,
  subtotal_pkr: 0,
  discount_code: null,
  discount_pkr: 0,
  shipping_pkr: 0,
  free_shipping_threshold_pkr: 12000,
  total_pkr: 0,
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [loadingStorefront, setLoadingStorefront] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('af_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        setCategories(data.categories || []);
        setFeaturedProducts(data.featuredProducts || []);
        setBestSellers(data.bestSellers || []);
        setRecentReviews(data.recentReviews || []);
        setPaymentMethods(data.paymentMethods || []);
      }
    } finally {
      setLoadingStorefront(false);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    const res = await fetch('/api/cart');
    if (res.ok) {
      setCart(await res.json());
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
    refreshCart();
  }, [refreshStorefront, refreshCart]);

  const toggleWishlist = useCallback(
    (productId: number) => {
      setWishlistIds((prev) => {
        const exists = prev.includes(productId);
        const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
        try {
          localStorage.setItem('af_wishlist', JSON.stringify(next));
        } catch {
          // ignore storage quota
        }
        showToast(exists ? 'Removed from saved wishlist' : 'Saved to wishlist');
        return next;
      });
    },
    [showToast]
  );

  const addToCart = useCallback(
    async (productId: number, quantity = 1, openDrawer = true): Promise<boolean> => {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not add to bag');
        return false;
      }
      setCart(data);
      if (openDrawer) setCartOpen(true);
      else showToast('Added to shopping bag');
      return true;
    },
    [showToast]
  );

  const updateCartQty = useCallback(
    async (productId: number, quantity: number) => {
      const res = await fetch(`/api/cart/items/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not update quantity');
        return;
      }
      setCart(data);
    },
    [showToast]
  );

  const removeFromCart = useCallback(async (productId: number) => {
    const res = await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      setCart(await res.json());
    }
  }, []);

  const applyDiscountCode = useCallback(async (code: string) => {
    const res = await fetch('/api/cart/apply-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data.error || 'Invalid discount code' };
    }
    setCart(data);
    return { ok: true, message: data.message || 'Discount applied' };
  }, []);

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        featuredProducts,
        bestSellers,
        recentReviews,
        paymentMethods,
        cart,
        cartOpen,
        setCartOpen,
        quickViewProduct,
        setQuickViewProduct,
        wishlistIds,
        toggleWishlist,
        addToCart,
        updateCartQty,
        removeFromCart,
        applyDiscountCode,
        refreshCart,
        refreshStorefront,
        toast,
        showToast,
        loadingStorefront,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
