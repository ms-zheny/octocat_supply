import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { api } from '../api/config';

export interface CartItem {
  cartItemId: number;
  cartId: string;
  productId: number;
  quantity: number;
}

export interface Cart {
  cartId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  totalItems: number;
  addToCart: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  isCartOpen: boolean;
}

const CART_ID_KEY = 'octocat_supply_cart_id';

const CartContext = createContext<CartContextType | null>(null);

async function fetchOrCreateCart(cartId: string | null): Promise<Cart> {
  const base = `${api.baseURL}${api.endpoints.cart}`;
  if (cartId) {
    try {
      const { data } = await axios.get<Cart>(`${base}/${cartId}`);
      return data;
    } catch {
      // Cart not found – create a new one
    }
  }
  const { data } = await axios.post<Cart>(base);
  return data;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const totalItems = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const ensureCart = useCallback(async (): Promise<Cart> => {
    if (cart) return cart;
    const storedId = localStorage.getItem(CART_ID_KEY);
    const resolved = await fetchOrCreateCart(storedId);
    localStorage.setItem(CART_ID_KEY, resolved.cartId);
    setCart(resolved);
    return resolved;
  }, [cart]);

  const addToCart = useCallback(
    async (productId: number, quantity: number) => {
      setIsLoading(true);
      try {
        const current = await ensureCart();
        const { data } = await axios.put<Cart>(
          `${api.baseURL}${api.endpoints.cart}/${current.cartId}/items`,
          { productId, quantity },
        );
        setCart(data);
      } catch (error) {
        console.error('Failed to add item to cart:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [ensureCart],
  );

  const removeFromCart = useCallback(
    async (productId: number) => {
      if (!cart) return;
      setIsLoading(true);
      try {
        const { data } = await axios.delete<Cart>(
          `${api.baseURL}${api.endpoints.cart}/${cart.cartId}/items/${productId}`,
        );
        setCart(data);
      } catch (error) {
        console.error('Failed to remove item from cart:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [cart],
  );

  const clearCart = useCallback(async () => {
    if (!cart) return;
    setIsLoading(true);
    try {
      await axios.delete(`${api.baseURL}${api.endpoints.cart}/${cart.cartId}`);
      localStorage.removeItem(CART_ID_KEY);
      setCart(null);
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const openCart = useCallback(async () => {
    setIsCartOpen(true);
    // Lazily load/refresh the cart when the drawer opens
    if (!cart) {
      const storedId = localStorage.getItem(CART_ID_KEY);
      if (storedId) {
        setIsLoading(true);
        try {
          const resolved = await ensureCart();
          localStorage.setItem(CART_ID_KEY, resolved.cartId);
          setCart(resolved);
        } catch (error) {
          console.error('Failed to load cart:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, [cart, ensureCart]);

  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return (
    <CartContext.Provider
      value={{ cart, isLoading, totalItems, addToCart, removeFromCart, clearCart, openCart, closeCart, isCartOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
