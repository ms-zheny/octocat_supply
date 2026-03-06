/**
 * Repository for cart data access
 */

import { randomUUID } from 'crypto';
import { getDatabase, DatabaseConnection } from '../db/sqlite';
import { Cart, CartItem } from '../models/cart';
import { handleDatabaseError, NotFoundError } from '../utils/errors';
import { objectToCamelCase, mapDatabaseRows, DatabaseRow } from '../utils/sql';

export class CartRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Get a cart with its items by cartId
   */
  async findById(cartId: string): Promise<Cart | null> {
    try {
      const row = await this.db.get<DatabaseRow>('SELECT * FROM carts WHERE cart_id = ?', [cartId]);
      if (!row) return null;

      const cart = objectToCamelCase<Omit<Cart, 'items'>>(row);
      const itemRows = await this.db.all<DatabaseRow>(
        'SELECT * FROM cart_items WHERE cart_id = ? ORDER BY cart_item_id',
        [cartId],
      );
      const items = mapDatabaseRows<CartItem>(itemRows);

      return { ...cart, items };
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Create a new empty cart with an auto-generated UUID
   */
  async create(): Promise<Cart> {
    try {
      const cartId = randomUUID();
      await this.db.run('INSERT INTO carts (cart_id) VALUES (?)', [cartId]);
      const cart = await this.findById(cartId);
      if (!cart) {
        throw new Error('Failed to retrieve created cart');
      }
      return cart;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Add or update a single item in the cart.
   * If the product is already in the cart the quantity is replaced.
   */
  async upsertItem(cartId: string, productId: number, quantity: number): Promise<Cart> {
    try {
      const existing = await this.db.get<DatabaseRow>(
        'SELECT * FROM carts WHERE cart_id = ?',
        [cartId],
      );
      if (!existing) {
        throw new NotFoundError('Cart', cartId);
      }

      await this.db.run(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES (?, ?, ?)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
        [cartId, productId, quantity],
      );

      await this.db.run(
        "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = ?",
        [cartId],
      );

      const cart = await this.findById(cartId);
      if (!cart) {
        throw new Error('Failed to retrieve updated cart');
      }
      return cart;
    } catch (error) {
      handleDatabaseError(error, 'Cart', cartId);
    }
  }

  /**
   * Remove a single item from the cart by productId
   */
  async removeItem(cartId: string, productId: number): Promise<Cart> {
    try {
      const existing = await this.db.get<DatabaseRow>(
        'SELECT * FROM carts WHERE cart_id = ?',
        [cartId],
      );
      if (!existing) {
        throw new NotFoundError('Cart', cartId);
      }

      const result = await this.db.run(
        'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
        [cartId, productId],
      );

      if (result.changes === 0) {
        throw new NotFoundError('CartItem', productId);
      }

      await this.db.run(
        "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = ?",
        [cartId],
      );

      const cart = await this.findById(cartId);
      if (!cart) {
        throw new Error('Failed to retrieve updated cart');
      }
      return cart;
    } catch (error) {
      handleDatabaseError(error, 'Cart', cartId);
    }
  }

  /**
   * Delete a cart and all its items (cascade)
   */
  async delete(cartId: string): Promise<void> {
    try {
      const result = await this.db.run('DELETE FROM carts WHERE cart_id = ?', [cartId]);
      if (result.changes === 0) {
        throw new NotFoundError('Cart', cartId);
      }
    } catch (error) {
      handleDatabaseError(error, 'Cart', cartId);
    }
  }
}

// Factory function to create repository instance
export async function createCartRepository(isTest: boolean = false): Promise<CartRepository> {
  const db = await getDatabase(isTest);
  return new CartRepository(db);
}

// Singleton instance for default usage
let cartRepo: CartRepository | null = null;

export async function getCartRepository(isTest: boolean = false): Promise<CartRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    return createCartRepository(true);
  }
  if (!cartRepo) {
    cartRepo = await createCartRepository(false);
  }
  return cartRepo;
}
