import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { Product } from '../types';

export function ShopPage() {
  const { categories } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [sort, setSort] = useState('featured');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'all') params.set('category', category);
    if (inStockOnly) params.set('inStock', 'true');
    if (maxPrice < 15000) params.set('maxPrice', String(maxPrice));
    params.set('sort', sort);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false));
  }, [query, category, inStockOnly, maxPrice, sort]);

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="Shop All Fragrances — 50ml Eau de Parfum | Al Fajr Scents"
        description="Browse the complete Al Fajr Scents collection. Filter by fragrance family, availability, and price in PKR with nationwide Cash on Delivery across Pakistan."
        canonicalPath="/shop"
      />

      <div className="border-b border-[#10100E]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">The Catalogue</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E] sm:text-5xl">
          All Eau de Parfum Creations
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#302018]/80">
          Every bottle is 50ml Eau de Parfum, delivered across Pakistan in its signature Al Fajr presentation case.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-8 flex flex-col gap-5 border-b border-[#10100E]/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Segmented Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              category === 'all'
                ? 'bg-[#10100E] text-[#FAF8F5]'
                : 'border border-[#10100E]/15 bg-[#FAF8F5] text-[#302018] hover:border-[#10100E]'
            }`}
          >
            All Scents
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                category === cat.slug
                  ? 'bg-[#10100E] text-[#FAF8F5]'
                  : 'border border-[#10100E]/15 bg-[#FAF8F5] text-[#302018] hover:border-[#10100E]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search, Stock, Price, Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#302018]/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by note or name..."
              className="w-full border border-[#10100E]/20 bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#10100E] focus:border-[#10100E] focus:outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-2 border border-[#10100E]/20 bg-[#FAF8F5] px-3 py-2 text-xs text-[#302018] cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="accent-[#10100E]"
            />
            In Stock Only
          </label>

          <div className="flex items-center gap-2 border border-[#10100E]/20 bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#302018]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="tabular-nums whitespace-nowrap">Max PKR {maxPrice.toLocaleString()}</span>
            <input
              type="range"
              min={5000}
              max={15000}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-20 accent-[#10100E]"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort fragrances"
            className="border border-[#10100E]/20 bg-[#FAF8F5] px-3 py-2 text-xs text-[#10100E] focus:border-[#10100E] focus:outline-none"
          >
            <option value="featured">Featured Order</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Additions</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[460px] animate-pulse bg-[#E9DFD3]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-12 border border-[#10100E]/10 bg-[#FAF8F5] p-12 text-center">
          <p className="font-display text-2xl text-[#10100E]">No matching fragrances found</p>
          <p className="mt-2 text-sm text-[#302018]/75">Try clearing your search or price filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              handleCategoryChange('all');
              setInStockOnly(false);
              setMaxPrice(15000);
            }}
            className="mt-5 bg-[#10100E] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[#FAF8F5] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
