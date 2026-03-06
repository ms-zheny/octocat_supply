/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         cartItemId:
 *           type: integer
 *           description: The unique identifier for the cart item
 *         cartId:
 *           type: string
 *           description: The ID of the cart this item belongs to
 *         productId:
 *           type: integer
 *           description: The ID of the product
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: The quantity of the product in the cart
 *     Cart:
 *       type: object
 *       properties:
 *         cartId:
 *           type: string
 *           description: The unique identifier for the cart (UUID)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the cart was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the cart was last updated
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *           description: The items in the cart
 */
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
