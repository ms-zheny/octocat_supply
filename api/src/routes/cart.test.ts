import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cartRouter from './cart';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Cart API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required data: supplier, headquarters, branch, product
    const db = await getDatabase(true);
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ One']);
    await db.run(
      'INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)',
      [1, 'Test Supplier'],
    );
    await db.run(
      `INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)`,
      [1, 1, 'Branch One'],
    );
    await db.run(
      `INSERT INTO products (product_id, supplier_id, name, price, sku, unit) VALUES (?, ?, ?, ?, ?, ?)`,
      [1, 1, 'Widget A', 9.99, 'SKU-001', 'each'],
    );
    await db.run(
      `INSERT INTO products (product_id, supplier_id, name, price, sku, unit) VALUES (?, ?, ?, ?, ?, ?)`,
      [2, 1, 'Widget B', 4.99, 'SKU-002', 'each'],
    );

    app = express();
    app.use(express.json());
    app.use('/cart', cartRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  describe('POST /cart', () => {
    it('should create a new empty cart', async () => {
      const response = await request(app).post('/cart');
      expect(response.status).toBe(201);
      expect(response.body.cartId).toBeDefined();
      expect(typeof response.body.cartId).toBe('string');
      expect(response.body.items).toEqual([]);
    });

    it('should create carts with unique IDs', async () => {
      const res1 = await request(app).post('/cart');
      const res2 = await request(app).post('/cart');
      expect(res1.body.cartId).not.toBe(res2.body.cartId);
    });
  });

  describe('GET /cart/:cartId', () => {
    it('should return the cart with its items', async () => {
      const createRes = await request(app).post('/cart');
      const cartId = createRes.body.cartId;

      const getRes = await request(app).get(`/cart/${cartId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.cartId).toBe(cartId);
      expect(getRes.body.items).toEqual([]);
    });

    it('should return 404 for an unknown cartId', async () => {
      const response = await request(app).get('/cart/non-existent-id');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /cart/:cartId/items', () => {
    it('should add an item to the cart', async () => {
      const { body: cart } = await request(app).post('/cart');
      const response = await request(app)
        .put(`/cart/${cart.cartId}/items`)
        .send({ productId: 1, quantity: 3 });

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].productId).toBe(1);
      expect(response.body.items[0].quantity).toBe(3);
    });

    it('should update the quantity of an existing item', async () => {
      const { body: cart } = await request(app).post('/cart');
      await request(app).put(`/cart/${cart.cartId}/items`).send({ productId: 1, quantity: 2 });
      const response = await request(app)
        .put(`/cart/${cart.cartId}/items`)
        .send({ productId: 1, quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(5);
    });

    it('should add multiple distinct items', async () => {
      const { body: cart } = await request(app).post('/cart');
      await request(app).put(`/cart/${cart.cartId}/items`).send({ productId: 1, quantity: 1 });
      const response = await request(app)
        .put(`/cart/${cart.cartId}/items`)
        .send({ productId: 2, quantity: 2 });

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 400 when productId is missing', async () => {
      const { body: cart } = await request(app).post('/cart');
      const response = await request(app)
        .put(`/cart/${cart.cartId}/items`)
        .send({ quantity: 1 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when quantity is zero', async () => {
      const { body: cart } = await request(app).post('/cart');
      const response = await request(app)
        .put(`/cart/${cart.cartId}/items`)
        .send({ productId: 1, quantity: 0 });

      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown cartId', async () => {
      const response = await request(app)
        .put('/cart/unknown-id/items')
        .send({ productId: 1, quantity: 1 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /cart/:cartId/items/:productId', () => {
    it('should remove an item from the cart', async () => {
      const { body: cart } = await request(app).post('/cart');
      await request(app).put(`/cart/${cart.cartId}/items`).send({ productId: 1, quantity: 2 });

      const response = await request(app).delete(`/cart/${cart.cartId}/items/1`);
      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(0);
    });

    it('should return 404 when removing a non-existent item', async () => {
      const { body: cart } = await request(app).post('/cart');
      const response = await request(app).delete(`/cart/${cart.cartId}/items/999`);
      expect(response.status).toBe(404);
    });

    it('should return 404 for unknown cartId', async () => {
      const response = await request(app).delete('/cart/unknown-id/items/1');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /cart/:cartId', () => {
    it('should delete the cart', async () => {
      const { body: cart } = await request(app).post('/cart');
      const deleteRes = await request(app).delete(`/cart/${cart.cartId}`);
      expect(deleteRes.status).toBe(204);

      const getRes = await request(app).get(`/cart/${cart.cartId}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for an unknown cartId', async () => {
      const response = await request(app).delete('/cart/non-existent-id');
      expect(response.status).toBe(404);
    });
  });
});
