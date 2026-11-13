import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from './ProductCard';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateCartQty, removeFromCart, applyDiscountCode } = useStore();
  const [codeInput, setCodeInput] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const navigate = useNavigate();

  if (!cartOpen) return null;

  const remainingForFree = Math.max(0, cart.free_shipping_threshold_pkr - (cart.subtotal_pkr - cart.discount_pkr));

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await applyDiscountCode(codeInput);
    setCodeMsg({ ok: res.ok, text: res.message });
    if (res.ok) setCodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        className="fixed inset-0 bg-[#10100E]/60 backdrop-blur-xs"
        onClick={() => setCartOpen(false)}
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FAF8F5] text-[#10100E] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#10100E]/10 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-[#C6A46A]" />
            <h2 className="font-display text-2xl font-medium">Your Bag ({cart.item_count})</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close shopping bag"
            className="flex h-10 w-10 items-center justify-center text-[#302018] hover:text-[#10100E] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free shipping indicator */}
        {cart.items.length > 0 && (
          <div className="border-b border-[#10100E]/10 bg-[#F3E9DE] px-6 py-3 text-xs text-[#302018]">
            {remainingForFree === 0 ? (
              <span>Your order qualifies for complimentary nationwide delivery.</span>
            ) : (
              <span>
                Add <strong className="tabular-nums">{formatPKR(remainingForFree)}</strong> more for complimentary delivery across Pakistan.
              </span>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-[#CDBBA9]" />
              <p className="mt-4 font-display text-2xl text-[#10100E]">Your bag is empty</p>
              <p className="mt-2 max-w-xs text-sm text-[#302018]/75">
                Explore our signature 50ml Eau de Parfum collection or discover a scent tailored to your mood.
              </p>
              <Link
                to="/shop"
                onClick={() => setCartOpen(false)}
                className="mt-6 bg-[#10100E] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[#FAF8F5] hover:bg-[#302018]"
              >
                Explore Collection
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#10100E]/10">
              {cart.items.map((item) => (
                <li key={item.product_id} className="flex gap-4 py-5 first:pt-0">
                  <Link
                    to={`/products/${item.slug}`}
                    onClick={() => setCartOpen(false)}
                    className="h-24 w-20 shrink-0 overflow-hidden bg-[#E9DFD3]"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/products/${item.slug}`}
                          onClick={() => setCartOpen(false)}
                          className="font-display text-lg font-medium text-[#10100E] hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[#302018]/70">
                          {item.concentration} · {item.size_ml}ml
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product_id)}
                        aria-label={`Remove ${item.name}`}
                        className="p-1 text-[#302018]/60 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#10100E]/20">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-8 w-8 items-center justify-center hover:bg-[#F3E9DE] cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="tabular-nums px-3 text-xs font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex h-8 w-8 items-center justify-center hover:bg-[#F3E9DE] cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="tabular-nums text-sm font-semibold">
                        {formatPKR(item.price_pkr * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Totals & Checkout */}
        {cart.items.length > 0 && (
          <div className="border-t border-[#10100E]/10 bg-[#F3E9DE]/60 px-6 py-5">
            <form onSubmit={handleApplyCode} className="mb-4 flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Discount code"
                className="flex-1 border border-[#10100E]/20 bg-[#FAF8F5] px-3 py-2 text-xs uppercase tracking-wider focus:border-[#10100E] focus:outline-none"
              />
              <button
                type="submit"
                className="border border-[#10100E] px-4 py-2 text-xs uppercase tracking-[0.14em] hover:bg-[#10100E] hover:text-[#FAF8F5] cursor-pointer"
              >
                Apply
              </button>
            </form>
            {codeMsg && (
              <p className={`mb-3 text-xs ${codeMsg.ok ? 'text-[#153F35]' : 'text-red-700'}`}>{codeMsg.text}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#302018]">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPKR(cart.subtotal_pkr)}</span>
              </div>
              {cart.discount_pkr > 0 && (
                <div className="flex justify-between text-[#153F35]">
                  <span>Discount ({cart.discount_code})</span>
                  <span className="tabular-nums">- {formatPKR(cart.discount_pkr)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#302018]">
                <span>Shipping (Pakistan)</span>
                <span className="tabular-nums">
                  {cart.shipping_pkr === 0 ? 'Complimentary' : formatPKR(cart.shipping_pkr)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#10100E]/10 pt-2.5 text-base font-semibold text-[#10100E]">
                <span>Total</span>
                <span className="tabular-nums">{formatPKR(cart.total_pkr)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                navigate('/checkout');
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 bg-[#10100E] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] transition-colors hover:bg-[#302018] cursor-pointer"
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4 text-[#C6A46A]" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
