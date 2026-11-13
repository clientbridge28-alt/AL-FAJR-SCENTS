import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../context/StoreContext';

export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, setQuickViewProduct, wishlistIds, toggleWishlist } = useStore();
  const primaryImage = product.images?.[0];
  const isWishlisted = wishlistIds.includes(product.id);
  const outOfStock = product.stock_quantity <= 0;

  return (
    <article className="group flex flex-col bg-[#FAF8F5] border border-[#10100E]/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(16,16,14,0.08)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#E9DFD3]">
        <Link to={`/products/${product.slug}`} className="block h-full w-full">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || `${product.name} ${product.concentration} ${product.size_ml}ml`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-[#FAF8F5]/80 font-display text-2xl"
              style={{ backgroundColor: product.accent_color || '#173A55' }}
            >
              {product.name}
            </div>
          )}
        </Link>

        {/* Subtle editorial accent bar at bottom of image */}
        <div
          className="absolute inset-x-0 bottom-0 h-1 opacity-85"
          style={{ backgroundColor: product.accent_color || '#C6A46A' }}
          aria-hidden="true"
        />

        {/* Functional quick actions */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className="flex h-10 w-10 items-center justify-center bg-[#FAF8F5]/92 text-[#10100E] border border-[#10100E]/10 transition-colors hover:bg-[#10100E] hover:text-[#FAF8F5] cursor-pointer"
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-[#C6A46A] text-[#C6A46A]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            aria-label={`Quick view ${product.name}`}
            className="flex h-10 w-10 items-center justify-center bg-[#FAF8F5]/92 text-[#10100E] border border-[#10100E]/10 transition-colors hover:bg-[#10100E] hover:text-[#FAF8F5] cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        {/* Single quiet status label only when out of stock */}
        {outOfStock && (
          <div className="absolute left-3 top-3 bg-[#10100E]/90 px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase text-[#FAF8F5]">
            Out of Stock
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#302018]/70">
            {product.fragrance_family} · {product.size_ml}ml
          </p>
          <Link to={`/products/${product.slug}`} className="mt-1.5 block">
            <h3 className="font-display text-2xl font-medium tracking-tight text-[#10100E] group-hover:text-[#302018]">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-[#302018]/75 line-clamp-2">{product.subtitle}</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[#10100E]/10 pt-4">
          <span className="tabular-nums text-[15px] font-semibold text-[#10100E]">
            {formatPKR(product.price_pkr)}
          </span>
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addToCart(product.id, 1, true)}
            className="inline-flex items-center gap-2 border border-[#10100E] px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#10100E] transition-colors hover:bg-[#10100E] hover:text-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {outOfStock ? 'Unavailable' : 'Add to Bag'}
          </button>
        </div>
      </div>
    </article>
  );
}
