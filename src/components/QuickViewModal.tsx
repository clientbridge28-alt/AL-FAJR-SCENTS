import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from './ProductCard';

export function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart } = useStore();
  const [qty, setQty] = useState(1);

  if (!quickViewProduct) return null;

  const p = quickViewProduct;
  const img = p.images?.[0];
  const outOfStock = p.stock_quantity <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#10100E]/70 backdrop-blur-xs"
        onClick={() => {
          setQty(1);
          setQuickViewProduct(null);
        }}
      />

      <div className="relative z-10 grid w-full max-w-3xl overflow-hidden bg-[#FAF8F5] text-[#10100E] shadow-2xl md:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setQty(1);
            setQuickViewProduct(null);
          }}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center bg-[#FAF8F5]/90 text-[#10100E] hover:bg-[#10100E] hover:text-[#FAF8F5] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="aspect-[4/5] bg-[#E9DFD3]">
          {img && (
            <img
              src={img.image_url}
              alt={img.alt_text || p.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#302018]/70">
              {p.fragrance_family} · {p.concentration} · {p.size_ml}ml
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium text-[#10100E]">{p.name}</h2>
            <p className="mt-2 tabular-nums text-lg font-semibold text-[#10100E]">{formatPKR(p.price_pkr)}</p>
            <p className="mt-4 text-sm leading-relaxed text-[#302018]/85">{p.description}</p>

            <div className="mt-5 space-y-2 border-t border-[#10100E]/10 pt-4 text-xs text-[#302018]">
              <p><strong className="uppercase tracking-wider text-[#10100E]">Top:</strong> {p.top_notes}</p>
              <p><strong className="uppercase tracking-wider text-[#10100E]">Heart:</strong> {p.heart_notes}</p>
              <p><strong className="uppercase tracking-wider text-[#10100E]">Base:</strong> {p.base_notes}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-[#10100E]/10 pt-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-[#10100E]/20">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-10 items-center justify-center hover:bg-[#F3E9DE] cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="tabular-nums px-3 text-sm font-medium">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(p.stock_quantity || 1, q + 1))}
                  className="flex h-11 w-10 items-center justify-center hover:bg-[#F3E9DE] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                disabled={outOfStock}
                onClick={async () => {
                  const ok = await addToCart(p.id, qty, true);
                  if (ok) {
                    setQty(1);
                    setQuickViewProduct(null);
                  }
                }}
                className="flex flex-1 h-11 items-center justify-center gap-2 bg-[#10100E] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF8F5] hover:bg-[#302018] disabled:opacity-40 cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-[#C6A46A]" />
                {outOfStock ? 'Out of Stock' : 'Add to Bag'}
              </button>
            </div>

            <Link
              to={`/products/${p.slug}`}
              onClick={() => {
                setQty(1);
                setQuickViewProduct(null);
              }}
              className="block text-center text-xs uppercase tracking-[0.16em] text-[#302018] underline underline-offset-4 hover:text-[#10100E]"
            >
              View Full Fragrance Dossier
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
