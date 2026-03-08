/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { api } from '../api/config';

const CART_ID_KEY = 'cartId';

interface CartItem {
  cartItemId: number;
  cartId: string;
  productId: number;
  quantity: number;
}

interface Cart {
  cartId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  addItem: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cartUrl = `${api.baseURL}${api.endpoints.cart}`;

  const fetchOrCreateCart = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedCartId = localStorage.getItem(CART_ID_KEY);
      if (storedCartId) {
        try {
          const { data } = await axios.get<Cart>(`${cartUrl}/${storedCartId}`);
          setCart(data);
          return;
        } catch {
          // Cart no longer exists on the server; create a new one
          localStorage.removeItem(CART_ID_KEY);
        }
      }
      const { data } = await axios.post<Cart>(cartUrl);
      localStorage.setItem(CART_ID_KEY, data.cartId);
      setCart(data);
    } catch (err) {
      console.error('Failed to initialize cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cartUrl]);

  useEffect(() => {
    fetchOrCreateCart();
  }, [fetchOrCreateCart]);

  const addItem = useCallback(
    async (productId: number, quantity: number) => {
      if (!cart) return;
      const { data } = await axios.put<Cart>(`${cartUrl}/${cart.cartId}/items`, {
        productId,
        quantity,
      });
      setCart(data);
    },
    [cart, cartUrl],
  );

  const removeItem = useCallback(
    async (productId: number) => {
      if (!cart) return;
      const { data } = await axios.delete<Cart>(`${cartUrl}/${cart.cartId}/items/${productId}`);
      setCart(data);
    },
    [cart, cartUrl],
  );

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, isLoading, itemCount, addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
