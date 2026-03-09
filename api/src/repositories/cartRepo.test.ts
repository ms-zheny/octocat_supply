import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartRepository } from './cartRepo';
import { NotFoundError } from '../utils/errors';

// Mock the getDatabase function and randomUUID
vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

import { getDatabase } from '../db/sqlite';

describe('CartRepository', () => {
  let repository: CartRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      db: {} as any,
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };

    (getDatabase as any).mockResolvedValue(mockDb);
    repository = new CartRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return cart with items when found', async () => {
      const mockCart = {
        cart_id: 'test-cart-id',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      const mockItems = [
        { cart_item_id: 1, cart_id: 'test-cart-id', product_id: 10, quantity: 2 },
      ];

      mockDb.get.mockResolvedValue(mockCart);
      mockDb.all.mockResolvedValue(mockItems);

      const result = await repository.findById('test-cart-id');

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM carts WHERE cart_id = ?', [
        'test-cart-id',
      ]);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM cart_items WHERE cart_id = ? ORDER BY cart_item_id',
        ['test-cart-id'],
      );
      expect(result).not.toBeNull();
      expect(result!.cartId).toBe('test-cart-id');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productId).toBe(10);
      expect(result!.items[0].quantity).toBe(2);
    });

    it('should return null when cart not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return cart with empty items array when no items', async () => {
      mockDb.get.mockResolvedValue({
        cart_id: 'test-cart-id',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findById('test-cart-id');

      expect(result!.items).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new cart and return it with empty items', async () => {
      const mockCart = {
        cart_id: 'test-uuid-1234',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });
      mockDb.get.mockResolvedValue(mockCart);
      mockDb.all.mockResolvedValue([]);

      const result = await repository.create();

      expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO carts (cart_id) VALUES (?)', [
        'test-uuid-1234',
      ]);
      expect(result.cartId).toBe('test-uuid-1234');
      expect(result.items).toEqual([]);
    });
  });

  describe('upsertItem', () => {
    it('should add a new item to an existing cart', async () => {
      const mockCartRow = { cart_id: 'cart-1', created_at: '2024-01-01', updated_at: '2024-01-01' };
      const mockUpdatedCartRow = { ...mockCartRow };
      const mockItems = [{ cart_item_id: 1, cart_id: 'cart-1', product_id: 5, quantity: 3 }];

      mockDb.get
        .mockResolvedValueOnce(mockCartRow)   // check cart exists
        .mockResolvedValueOnce(mockUpdatedCartRow); // findById after update
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.all.mockResolvedValue(mockItems);

      const result = await repository.upsertItem('cart-1', 5, 3);

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM carts WHERE cart_id = ?', ['cart-1']);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cart_items'),
        ['cart-1', 5, 3],
      );
      expect(result.items[0].productId).toBe(5);
      expect(result.items[0].quantity).toBe(3);
    });

    it('should throw NotFoundError when cart does not exist', async () => {
      mockDb.get.mockResolvedValue(undefined);

      await expect(repository.upsertItem('non-existent', 1, 1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart and return updated cart', async () => {
      const mockCartRow = { cart_id: 'cart-1', created_at: '2024-01-01', updated_at: '2024-01-01' };

      mockDb.get
        .mockResolvedValueOnce(mockCartRow)   // check cart exists
        .mockResolvedValueOnce(mockCartRow);  // findById after removal
      mockDb.run
        .mockResolvedValueOnce({ changes: 1 }) // DELETE cart_item
        .mockResolvedValueOnce({ changes: 1 }); // UPDATE carts timestamp
      mockDb.all.mockResolvedValue([]);

      const result = await repository.removeItem('cart-1', 5);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
        ['cart-1', 5],
      );
      expect(result.items).toEqual([]);
    });

    it('should throw NotFoundError when cart does not exist', async () => {
      mockDb.get.mockResolvedValue(undefined);

      await expect(repository.removeItem('non-existent', 1)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when item does not exist in cart', async () => {
      mockDb.get.mockResolvedValue({ cart_id: 'cart-1' });
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.removeItem('cart-1', 999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing cart', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete('cart-1');

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM carts WHERE cart_id = ?', ['cart-1']);
    });

    it('should throw NotFoundError when cart does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete('non-existent')).rejects.toThrow(NotFoundError);
    });
  });
});
