import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { JournalArticle } from '../types';

const HERO_SHOWCASE = [
  {
    name: 'Rose Whisper',
    slug: 'rose-whisper',
    tagline: 'Sapphire rose & gilded presentation',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.25_AM_2247997b.jpeg',
    alt: 'Al Fajr Scents Rose Whisper 50ml Eau de Parfum inside illuminated black calligraphy presentation box',
    accent: '#182B49',
  },
  {
    name: 'Silver Coast',
    slug: 'silver-coast',
    tagline: 'Emerald mist & golden sunset amber',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.27_AM__1__92fc8aa5.jpeg',
    alt: 'Al Fajr Scents Silver Coast 50ml Eau de Parfum emerald and amber bottle by mountain waterfall',
    accent: '#153F35',
  },
  {
    name: 'Shadow X',
    slug: 'shadow-x',
    tagline: 'Smoked bronze oud & dark resin',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__1__ad1ae54e.jpeg',
    alt: 'Al Fajr Scents Shadow X 50ml Eau de Parfum smoky bronze bottle beside oud wood',
    accent: '#4A2F1B',
  },
  {
    name: 'Blu Mare',
    slug: 'blu-mare',
    tagline: 'Coastal sea salt & sunlit citrus',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.28_AM_a80b65ec.jpeg',
    alt: 'Al Fajr Scents Blu Mare 50ml Eau de Parfum blue frosted bottle overlooking the coast',
    accent: '#173A55',
  },
];

export function HomePage() {
  const { settings, featuredProducts, bestSellers, recentReviews } = useStore();
  const [heroIdx, setHeroIdx] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    fetch('/api/journal')
      .then((r) => (r.ok ? r.json() : { articles: [] }))
      .then((d) => setArticles((d.articles || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  const activeHero = HERO_SHOWCASE[heroIdx];

  const handleHeroPointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -ny * 7, y: nx * 9 });
  };

  return (
    <div>
      <SEOHead
        title="Al Fajr Scents — Luxury Eau de Parfum House | Pakistan"
        description="Discover Al Fajr Scents, a Pakistani luxury fragrance house crafting distinctive 50ml Eau de Parfum creations including Blu Mare, Silver Coast, Shadow X, Midnight Aura, and Rose Whisper."
        canonicalPath="/"
        ogImage="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.25_AM_2247997b.jpeg"
      />

      {/* 01 — HERO SECTION */}
      <section className="relative overflow-hidden bg-[#F3E9DE] border-b border-[#10100E]/10">
        <div className="mx-auto grid max-w-7xl items-stretch lg:grid-cols-12">
          {/* Editorial Copy Column */}
          <div className="flex h-[429.906px] w-[774.667px] flex-col justify-between px-4 py-12 italic sm:px-6 lg:col-span-6 lg:px-8 lg:py-20">
            <div>
              <h1 className="[font-family:Georgia,serif] font-normal italic text-[53px] leading-[1.03] tracking-tight text-[#444444]">
                {settings.hero_headline || 'Fragrance Is an Identity.'}
              </h1>
              <p className="mt-6 h-[43.5px] max-w-xl [font-family:'Times_New_Roman',serif] text-[13px] italic leading-relaxed text-[#302018]/85">
                {settings.hero_subheadline ||
                  'Fine Eau de Parfum creations crafted for quiet confidence, lasting trail, and understated elegance across Pakistan.'}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-3 bg-[#6b6b65] px-7 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#FAF8F5] transition-colors hover:bg-[#302018]"
                >
                  Shop Collection
                  <ArrowRight className="h-4 w-4 text-[#3f3131]" />
                </Link>
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-2 border border-[#10100E]/30 px-6 py-4 text-xs font-medium uppercase tracking-[0.16em] text-[#10100E] transition-colors hover:border-[#10100E] hover:bg-[#FAF8F5]"
                >
                  Find Your Scent
                </Link>
              </div>
            </div>

            {/* Bottle Campaign Selector Strip */}
            <div className="mt-12 border-t border-[#10100E]/10 pt-6 [font-family:'DM_Sans',sans-serif] italic">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#422222]">
                Featured Editions
              </p>
              <div className="mt-3 flex h-[32.3333px] flex-wrap gap-2 [font-family:'Courier_New',monospace] font-normal">
                {HERO_SHOWCASE.map((item, idx) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setHeroIdx(idx)}
                    className={`px-3.5 py-2 text-xs tracking-[0.1em] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      idx === 0
                        ? 'bg-[#929283] text-[#ffffff]'
                        : idx === 1
                          ? idx === heroIdx
                            ? 'bg-[#10100E] text-[#562f2f]'
                            : 'border border-[#10100E]/15 bg-[#FAF8F5]/70 text-[#562f2f] hover:border-[#10100E]'
                          : idx === 3
                            ? 'bg-[#69695f] text-[#FAF8F5]'
                            : idx === heroIdx
                              ? 'bg-[#10100E] text-[#FAF8F5]'
                              : 'border border-[#10100E]/15 bg-[#FAF8F5]/70 text-[#302018] hover:border-[#10100E]'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive 3D Perspective Authentic Bottle Visual Column */}
          <div
            className="relative flex min-h-[460px] items-center justify-center overflow-hidden bg-[#10100E] lg:col-span-6 lg:min-h-[680px]"
            onMouseMove={handleHeroPointerMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-35 transition-colors duration-700"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${activeHero.accent}, #10100E 75%)`,
              }}
            />

            <motion.div
              key={activeHero.slug}
              initial={prefersReduced ? false : { opacity: 0, scale: 0.98 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotateX: tilt.x,
                rotateY: tilt.y,
              }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              style={{ transformPerspective: 1100 }}
              className="relative z-10 h-full w-full"
            >
              <img
                src={activeHero.image}
                alt={activeHero.alt}
                referrerPolicy="no-referrer"
                className="h-[1032.55px] w-[728.667px] object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#10100E]/85 via-[#10100E]/10 to-transparent"
                aria-hidden="true"
              />
            </motion.div>

            <div className="absolute bottom-6 left-6 right-6 z-20 flex items-end justify-between gap-4 text-[#FAF8F5]">
              <div>
                <p className="mt-1 [font-family:'Cormorant_Garamond',serif] text-[32px] italic text-[#c9c3c2]">{activeHero.name}</p>
                <p className="[font-family:'Times_New_Roman',serif] text-[11px] italic text-[#e9e2dc]">{activeHero.tagline}</p>
              </div>
              <Link
                to={`/products/${activeHero.slug}`}
                className="border border-[#FAF8F5]/35 bg-[#363631] px-4 py-2.5 [font-family:'Times_New_Roman',serif] text-[12px] italic uppercase tracking-[0.16em] text-[#ffffff] backdrop-blur-xs transition-colors hover:bg-[#FAF8F5] hover:text-[#10100E] whitespace-nowrap shrink-0"
              >
                Explore Bottle
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — DISCOVER OUR FRAGRANCES */}
      <section className="mx-auto max-w-7xl px-4 py-20 [font-family:Georgia,serif] italic sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-[#10100E]/10 pb-8 sm:flex-row sm:items-end">
          <div>
            <h2 className="mt-2 [font-family:Georgia,serif] text-[42px] font-normal italic text-[#585757]">
              Crafted With Individual Character
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 [font-family:'Times_New_Roman',serif] text-[11px] font-semibold italic uppercase tracking-[0.18em] text-[#30302b] hover:text-[#302018] whitespace-nowrap shrink-0"
          >
            View All Fragrances
            <ArrowRight className="h-4 w-4 text-[#C6A46A]" />
          </Link>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Conditional Best Sellers (strictly rendered only when real non-cancelled order data exists) */}
        {bestSellers.length > 0 && (
          <div className="mt-20 border-t border-[#10100E]/10 pt-16">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#C6A46A]">Client Favorites</p>
                <h2 className="mt-2 font-display text-3xl font-normal text-[#10100E]">
                  Most Ordered Creations
                </h2>
              </div>
              <p className="text-xs text-[#302018]/70">Derived from verified Al Fajr Scents order history</p>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {bestSellers.map((product) => (
                <ProductCard key={`bs-${product.id}`} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 03 — THE ART OF FRAGRANCE (DARK EDITORIAL BAND) */}
      <section className="bg-[#3d3535] py-20 [font-family:Georgia,serif] italic text-[#F3E9DE] lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <h2 className="mt-3 [font-family:Georgia,serif] text-[45px] font-normal italic leading-tight text-[#fff8ef]">
                A Journey in Three Acts.
              </h2>
              <p className="mt-5 [font-family:'Times_New_Roman',serif] text-[15px] leading-relaxed text-[#CDBBA9]/85">
                Every Al Fajr Eau de Parfum is composed to unfold deliberately across hours—from luminous opening notes to resinous, lasting depth on skin and fabric.
              </p>

              <div className="mt-10 space-y-6 border-t border-[#F3E9DE]/15 pt-8">
                <div>
                  <p className="mt-1 font-display text-2xl text-[#FAF8F5]">Bergamot, Sea Salt &amp; Cardamom</p>
                  <p className="mt-1 text-xs text-[#CDBBA9]/75">
                    The immediate signature greeting—crisp citrus, coastal air, and warm spice.
                  </p>
                </div>
                <div>
                  <p className="mt-1 font-display text-2xl text-[#FAF8F5]">Damask Rose, Vetiver &amp; Smoked Wood</p>
                  <p className="mt-1 text-xs text-[#CDBBA9]/75">
                    The emotional core that develops with skin warmth over hours.
                  </p>
                </div>
                <div>
                  <p className="mt-1 font-display text-2xl text-[#FAF8F5]">Amber Resin, Oud &amp; White Musk</p>
                  <p className="mt-1 text-xs text-[#CDBBA9]/75">
                    The enduring trail that defines your presence long after arrival.
                  </p>
                </div>
              </div>
            </div>

            {/* Real Bottle Gallery Trio */}
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
              <Link to="/products/blu-mare" className="group block overflow-hidden bg-[#191816]">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.28_AM_a80b65ec.jpeg"
                    alt="Blu Mare Eau de Parfum"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#C6A46A]">Oceanic</p>
                  <p className="mt-1 font-display text-xl text-[#FAF8F5]">Blu Mare</p>
                </div>
              </Link>

              <Link to="/products/shadow-x" className="group block overflow-hidden bg-[#191816] sm:translate-y-6">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__1__ad1ae54e.jpeg"
                    alt="Shadow X Eau de Parfum"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#C6A46A]">Smoked Wood</p>
                  <p className="mt-1 font-display text-xl text-[#FAF8F5]">Shadow X</p>
                </div>
              </Link>

              <Link to="/products/midnight-aura" className="group block overflow-hidden bg-[#191816]">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__2__289636cd.jpeg"
                    alt="Midnight Aura Eau de Parfum"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#C6A46A]">Nocturnal</p>
                  <p className="mt-1 font-display text-xl text-[#FAF8F5]">Midnight Aura</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — BRAND STORY & PRESENTATION RITUAL */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 [font-family:Georgia,serif] italic lg:grid-cols-12 lg:items-center">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
            <div className="aspect-[4/5] overflow-hidden bg-[#E9DFD3]">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.30_AM_49eda978.jpeg"
                alt="Al Fajr Scents luxury presentation box with gold Arabic calligraphy"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-[4/5] overflow-hidden bg-[#E9DFD3]">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.32_AM_0f42fbb6.jpeg"
                alt="Blu Sea Eau de Parfum inside authentic Al Fajr Scents gift packaging"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 lg:pl-6">
            <h2 className="mt-3 [font-family:Georgia,serif] text-[45px] font-normal italic leading-tight text-[#40403c]">
              More Than a Bottle. An Heirloom Unboxing.
            </h2>
            <p className="mt-5 [font-family:'Times_New_Roman',serif] text-[14px] leading-relaxed text-[#302018]/85">
              Every 50ml Al Fajr Scents creation arrives housed inside a structured matte-black presentation box embossed with gilded Arabic calligraphy—crafted to honor the timeless heritage of Eastern perfumery through modern architectural restraint.
            </p>
            <div className="mt-8 grid gap-6 border-t border-[#10100E]/10 pt-8 sm:grid-cols-2">
              <div>
                <h3 className="font-display text-xl font-medium text-[#10100E]">Scent Discovery Guide</h3>
                <p className="mt-1.5 text-sm text-[#302018]/75">
                  Explore layered combinations and match notes to Pakistan&apos;s seasons.
                </p>
                <Link
                  to="/discover"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#10100E] underline underline-offset-4"
                >
                  Open Scent Finder
                </Link>
              </div>
              <div>
                <h3 className="font-display text-xl font-medium text-[#10100E]">Nationwide COD</h3>
                <p className="mt-1.5 text-sm text-[#302018]/75">
                  Tracked doorstep delivery across Karachi, Lahore, Islamabad &amp; nationwide.
                </p>
                <Link
                  to="/our-story"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#10100E] underline underline-offset-4"
                >
                  Read Our Story
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — GENUINE CLIENT REVIEWS & JOURNAL */}
      <section className="border-t border-[#10100E]/10 bg-[#FAF8F5] py-20 [font-family:Georgia,serif] italic">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Genuine Verified Reviews */}
          <div className="mb-20">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="mt-2 [font-family:Georgia,serif] text-[34px] font-normal text-[#515149]">
                  Verified Customer Experiences
                </h2>
              </div>
              <Link
                to="/shop"
                className="text-xs uppercase tracking-[0.16em] text-[#75675e] underline underline-offset-4"
              >
                Review a Purchased Fragrance
              </Link>
            </div>

            {recentReviews.length > 0 ? (
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {recentReviews.slice(0, 3).map((rev) => (
                  <blockquote
                    key={rev.id}
                    className="flex flex-col justify-between border border-[#10100E]/10 bg-[#F3E9DE]/50 p-6"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#C6A46A]">
                        {'★'.repeat(rev.rating)} · Verified Buyer
                      </p>
                      {rev.title && (
                        <p className="mt-3 font-display text-xl text-[#10100E]">{rev.title}</p>
                      )}
                      <p className="mt-2 text-sm leading-relaxed text-[#302018]/85">&ldquo;{rev.comment}&rdquo;</p>
                    </div>
                    <footer className="mt-5 border-t border-[#10100E]/10 pt-3 text-xs text-[#302018]/75">
                      <span className="font-medium text-[#10100E]">{rev.reviewer_name}</span>
                      {rev.reviewer_city && <span> · {rev.reviewer_city}</span>}
                      {rev.product_name && <span> · {rev.product_name}</span>}
                    </footer>
                  </blockquote>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-start justify-between gap-4 border border-[#10100E]/10 bg-[#F3E9DE]/45 p-8 [font-family:'Times_New_Roman',serif] text-[14px] sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="font-display text-xl text-[#10100E]">Only Genuine Verified Reviews</p>
                    <p className="mt-1 text-[13px] text-[#302018]/80">
                      Al Fajr Scents publishes only authentic reviews tied to verified order numbers. Once you receive your bottle, you can submit your review directly on its product page.
                    </p>
                  </div>
                </div>
                <Link
                  to="/shop"
                  className="border border-[#10100E] px-5 py-2.5 text-xs uppercase tracking-[0.14em] hover:bg-[#10100E] hover:text-[#FAF8F5] whitespace-nowrap shrink-0"
                >
                  Browse Scents
                </Link>
              </div>
            )}
          </div>

          {/* The Journal */}
          <div>
            <div className="flex flex-col justify-between gap-4 border-b border-[#10100E]/10 pb-6 sm:flex-row sm:items-end">
              <div>
                <h2 className="mt-2 [font-family:'Cormorant_Garamond',serif] text-[37px] font-normal text-[#2e2e29]">
                  Guides &amp; Scent Education
                </h2>
              </div>
              <Link
                to="/journal"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#53534c]"
              >
                Read All Guides <ArrowRight className="h-4 w-4 text-[#60594b]" />
              </Link>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {articles.map((art) => (
                <article key={art.id} className="group flex flex-col">
                  <Link to={`/journal/${art.slug}`} className="aspect-[4/3] overflow-hidden bg-[#E9DFD3]">
                    <img
                      src={art.cover_image}
                      alt={art.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>
                  <p className="mt-4 text-xs text-[#302018]/70">
                    {art.category} · {art.read_time}
                  </p>
                  <Link to={`/journal/${art.slug}`} className="mt-1.5">
                    <h3 className="font-display text-2xl font-normal text-[#10100E] group-hover:underline">
                      {art.title}
                    </h3>
                  </Link>
                  <p className="mt-2 text-sm text-[#302018]/80 line-clamp-2">{art.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
