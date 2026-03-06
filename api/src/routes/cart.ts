/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Anonymous shopping cart endpoints
 */

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Create a new anonymous cart
 *     tags: [Cart]
 *     responses:
 *       201:
 *         description: Cart created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *
 * /api/cart/{cartId}:
 *   get:
 *     summary: Get a cart by its ID
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart UUID
 *     responses:
 *       200:
 *         description: Cart found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart not found
 *   delete:
 *     summary: Delete a cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart UUID
 *     responses:
 *       204:
 *         description: Cart deleted successfully
 *       404:
 *         description: Cart not found
 *
 * /api/cart/{cartId}/items:
 *   put:
 *     summary: Add or update an item in the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Cart not found
 *
 * /api/cart/{cartId}/items/{productId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart UUID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID to remove
 *     responses:
 *       200:
 *         description: Item removed, updated cart returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart or item not found
 */

import express from 'express';
import { getCartRepository } from '../repositories/cartRepo';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = express.Router();

// Create a new anonymous cart
router.post('/', async (req, res, next) => {
  try {
    const repo = await getCartRepository();
    const cart = await repo.create();
    res.status(201).json(cart);
  } catch (error) {
    next(error);
  }
});

// Get a cart by ID
router.get('/:cartId', async (req, res, next) => {
  try {
    const repo = await getCartRepository();
    const cart = await repo.findById(req.params.cartId);
    if (!cart) {
      throw new NotFoundError('Cart', req.params.cartId);
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

// Add or update an item in the cart
router.put('/:cartId/items', async (req, res, next) => {
  try {
    const { productId, quantity } = req.body as { productId: unknown; quantity: unknown };

    if (typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0) {
      throw new ValidationError('productId must be a positive integer');
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new ValidationError('quantity must be a positive integer');
    }

    const repo = await getCartRepository();
    const cart = await repo.upsertItem(req.params.cartId, productId, quantity);
    res.json(cart);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
    } else {
      next(error);
    }
  }
});

// Remove an item from the cart
router.delete('/:cartId/items/:productId', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId) || productId <= 0) {
      throw new ValidationError('productId must be a positive integer');
    }

    const repo = await getCartRepository();
    const cart = await repo.removeItem(req.params.cartId, productId);
    res.json(cart);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
    } else {
      next(error);
    }
  }
});

// Delete a cart
router.delete('/:cartId', async (req, res, next) => {
  try {
    const repo = await getCartRepository();
    await repo.delete(req.params.cartId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
    } else {
      next(error);
    }
  }
});

export default router;
