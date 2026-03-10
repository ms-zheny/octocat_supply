import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';

export default function CartDrawer() {
  const { cart, isLoading, totalItems, removeFromCart, clearCart, closeCart, isCartOpen } =
    useCart();
  const { darkMode } = useTheme();

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 z-50 flex flex-col shadow-2xl transition-colors duration-300 ${
          darkMode ? 'bg-gray-900 text-light' : 'bg-white text-gray-800'
        }`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <h2 className="text-xl font-bold">
            Cart{totalItems > 0 && <span className="ml-2 text-primary">({totalItems})</span>}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className={`p-1 rounded-md transition-colors ${
              darkMode ? 'hover:text-primary' : 'hover:text-primary'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          )}

          {!isLoading && (!cart || cart.items.length === 0) && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-12 w-12 mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Your cart is empty.
              </p>
            </div>
          )}

          {!isLoading &&
            cart?.items.map((item) => (
              <div
                key={item.cartItemId}
                className={`flex items-center justify-between py-3 border-b ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <div>
                  <p className="font-medium">Product #{item.productId}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Qty: {item.quantity}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  aria-label={`Remove product ${item.productId} from cart`}
                  className={`p-1 rounded transition-colors ${
                    darkMode
                      ? 'text-gray-400 hover:text-red-400'
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div
            className={`px-6 py-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } space-y-3`}
          >
            <button
              onClick={clearCart}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-light'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Clear Cart
            </button>
            <button
              disabled
              aria-label="Checkout – coming soon"
              className="w-full py-2 rounded-lg bg-primary text-white font-medium opacity-50 cursor-not-allowed"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
