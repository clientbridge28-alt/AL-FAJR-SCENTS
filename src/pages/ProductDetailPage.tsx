import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, ShoppingBag, Heart, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard, formatPKR } from '../components/ProductCard';
import { ProductReviews } from '../components/ProductReviews';
import { SEOHead } from '../components/SEOHead';
import type { Product, Review } from '../types';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart, wishlistIds, toggleWishlist, settings } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setActiveImageIdx(0);
    setQty(1);

    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setProduct(d.product);
          setReviews(d.reviews || []);
          setRelated(d.relatedProducts || []);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const jsonLd = useMemo(() => {
    if (!product) return undefined;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://alfajrscents.pk';
    const primaryImg = product.images?.[0]?.image_url;
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : null;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${product.name} ${product.concentration} ${product.size_ml}ml`,
        image: primaryImg ? [`${origin}${primaryImg}`] : [],
        description: product.description,
        brand: {
          '@type': 'Brand',
          name: 'Al Fajr Scents',
        },
        ...(avgRating !== null
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: avgRating,
                reviewCount: reviews.length,
              },
            }
          : {}),
        offers: {
          '@type': 'Offer',
          url: `${origin}/products/${product.slug}`,
          priceCurrency: 'PKR',
          price: product.price_pkr,
          availability:
            product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: `${origin}/shop` },
          { '@type': 'ListItem', position: 3, name: product.name, item: `${origin}/products/${product.slug}` },
        ],
      },
    ];
  }, [product, reviews]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="aspect-[4/5] animate-pulse bg-[#E9DFD3] lg:col-span-6" />
          <div className="h-96 animate-pulse bg-[#FAF8F5] lg:col-span-6" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl text-[#10100E]">Fragrance Not Found</h1>
        <p className="mt-3 text-sm text-[#302018]/80">
          The creation you requested may have been archived or renamed.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block bg-[#10100E] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[#FAF8F5]"
        >
          Return to Collection
        </Link>
      </div>
    );
  }

  const images = product.images || [];
  const activeImg = images[activeImageIdx] || images[0];
  const isWishlisted = wishlistIds.includes(product.id);
  const outOfStock = product.stock_quantity <= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SEOHead
        title={product.seo_title || `${product.name} ${product.concentration} ${product.size_ml}ml | Al Fajr Scents`}
        description={product.seo_description || product.description}
        canonicalPath={`/products/${product.slug}`}
        ogImage={activeImg?.image_url}
        jsonLd={jsonLd}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-[#302018]/70">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-[#10100E]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/shop" className="hover:text-[#10100E]">Shop</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-[#10100E] font-medium">{product.name}</li>
        </ol>
      </nav>

      {/* Main Contiguous Product Split */}
      <div className="grid gap-12 lg:grid-cols-12">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-28">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#E9DFD3]">
              {activeImg && (
                <img
                  src={activeImg.image_url}
                  alt={activeImg.alt_text || `${product.name} Eau de Parfum`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              )}
              <div
                className="absolute inset-x-0 bottom-0 h-1.5"
                style={{ backgroundColor: product.accent_color || '#C6A46A' }}
              />
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-square overflow-hidden border transition-all cursor-pointer ${
                      idx === activeImageIdx ? 'border-[#10100E] ring-1 ring-[#10100E]' : 'border-[#10100E]/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={img.alt_text || `${product.name} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Contiguous Purchase & Olfactory Module */}
        <div className="lg:col-span-6">
          <div className="border-b border-[#10100E]/10 pb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[#302018]/75">
              {product.fragrance_family} · {product.concentration} · {product.size_ml}ml
            </p>
            <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E] sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-2 text-base text-[#302018]/85">{product.subtitle}</p>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="tabular-nums text-2xl font-semibold text-[#10100E]">
                {formatPKR(product.price_pkr)}
              </span>
              <span className="tabular-nums text-xs uppercase tracking-[0.14em] text-[#302018]">
                {outOfStock ? 'Currently Out of Stock' : `In Stock · ${product.stock_quantity} available`}
              </span>
            </div>
          </div>

          {/* Purchase Controls */}
          <div className="border-b border-[#10100E]/10 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-[#10100E]/25 bg-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-12 w-11 items-center justify-center hover:bg-[#F3E9DE] cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="tabular-nums px-4 text-sm font-medium">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stock_quantity || 1, q + 1))}
                  aria-label="Increase quantity"
                  className="flex h-12 w-11 items-center justify-center hover:bg-[#F3E9DE] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => addToCart(product.id, qty, true)}
                className="flex h-12 flex-1 items-center justify-center gap-2 bg-[#10100E] px-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] transition-colors hover:bg-[#302018] disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="h-4 w-4 text-[#C6A46A]" />
                {outOfStock ? 'Unavailable' : 'Add to Bag'}
              </button>

              <button
                type="button"
                disabled={outOfStock}
                onClick={async () => {
                  const ok = await addToCart(product.id, qty, false);
                  if (ok) navigate('/checkout');
                }}
                className="flex h-12 items-center justify-center border border-[#10100E] bg-[#FAF8F5] px-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#10100E] transition-colors hover:bg-[#10100E] hover:text-[#FAF8F5] disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                Buy Now
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Save to wishlist"
                className="flex h-12 w-12 items-center justify-center border border-[#10100E]/20 bg-[#FAF8F5] hover:border-[#10100E] cursor-pointer"
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-[#C6A46A] text-[#C6A46A]' : ''}`} />
              </button>
            </div>

            {product.is_verified_data === 0 && (
              <p className="mt-3 text-xs text-[#302018]/70">
                Note: Provisional catalogue specifications are active and editable via the Store Admin dossier.
              </p>
            )}
          </div>

          {/* Story & Description */}
          <div className="border-b border-[#10100E]/10 py-6 space-y-3 text-sm leading-relaxed text-[#302018]">
            <p>{product.description}</p>
            {product.story && <p className="text-[#302018]/80">{product.story}</p>}
          </div>

          {/* Fragrance Architecture Notes */}
          <div className="border-b border-[#10100E]/10 py-6">
            <h2 className="font-display text-2xl font-normal text-[#10100E]">Olfactory Notes</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-[#302018]/70">Top Notes</dt>
                <dd className="col-span-2 text-[#10100E]">{product.top_notes}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-[#302018]/70">Heart Notes</dt>
                <dd className="col-span-2 text-[#10100E]">{product.heart_notes}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-[#302018]/70">Base Notes</dt>
                <dd className="col-span-2 text-[#10100E]">{product.base_notes}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-[#302018]/70">Scent Profile</dt>
                <dd className="col-span-2 text-[#10100E]">{product.scent_profile}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-[#302018]/70">Wear &amp; Longevity</dt>
                <dd className="col-span-2 text-[#10100E]">{product.longevity_claim}</dd>
              </div>
            </dl>
          </div>

          {/* Delivery & Policy Highlights */}
          <div className="grid gap-4 py-6 sm:grid-cols-3 text-xs text-[#302018]">
            <div className="flex items-start gap-2.5">
              <Truck className="mt-0.5 h-4 w-4 text-[#C6A46A] shrink-0" />
              <div>
                <p className="font-semibold text-[#10100E]">Pakistan Delivery</p>
                <p className="mt-0.5">
                  PKR {Number(settings.shipping_fee_pkr || 250).toLocaleString()} flat rate; free above PKR{' '}
                  {Number(settings.free_shipping_threshold_pkr || 12000).toLocaleString()}.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-[#C6A46A] shrink-0" />
              <div>
                <p className="font-semibold text-[#10100E]">Authentic Packaging</p>
                <p className="mt-0.5">Delivered sealed in Al Fajr Scents presentation box.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="mt-0.5 h-4 w-4 text-[#C6A46A] shrink-0" />
              <div>
                <p className="font-semibold text-[#10100E]">Returns Policy</p>
                <p className="mt-0.5">
                  <Link to="/returns-policy" className="underline">7-day unopened return eligibility</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews Component */}
      <ProductReviews
        productId={product.id}
        productName={product.name}
        reviews={reviews}
        onReviewAdded={(newReview) => setReviews((prev) => [newReview, ...prev])}
      />

      {/* Related Fragrances */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-[#10100E]/10 pt-14">
          <h2 className="font-display text-3xl text-[#10100E]">Complementary Creations</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
