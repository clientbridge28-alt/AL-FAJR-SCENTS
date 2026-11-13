import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

type MoodChoice = 'oceanic' | 'emerald' | 'woody' | 'floral';
type OccasionChoice = 'daily' | 'evening' | 'gifting';

const LAYERING_PAIRINGS = [
  {
    title: 'Twilight Velvet',
    pair: 'Midnight Aura + Rose Whisper',
    ratio: '1 spray Midnight Aura base · 2 sprays Rose Whisper',
    description: 'Anchors cool sapphire Damascus rose in smoky dark oud and warm amber resin.',
    slugs: ['midnight-aura', 'rose-whisper'],
  },
  {
    title: 'Gilded Horizon',
    pair: 'Shadow X + Silver Coast',
    ratio: '1 spray Shadow X base · 2 sprays Silver Coast',
    description: 'Lifts spiced smoked woods with bright coastal greenery and sunset amber.',
    slugs: ['shadow-x', 'silver-coast'],
  },
  {
    title: 'Amber Tide',
    pair: 'Golden Drop + Blu Mare',
    ratio: '1 spray Golden Drop base · 2 sprays Blu Mare',
    description: 'Contrasts crisp Mediterranean sea salt against warm honeyed sandalwood.',
    slugs: ['golden-drop', 'blu-mare'],
  },
];

export function DiscoverPage() {
  const { addToCart } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [mood, setMood] = useState<MoodChoice>('oceanic');
  const [occasion, setOccasion] = useState<OccasionChoice>('daily');

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

  const recommendations = products.filter((p) => {
    if (mood === 'oceanic') return ['blu-mare', 'blu-sea'].includes(p.slug);
    if (mood === 'emerald') return ['silver-coast', 'qamrah', 'golden-drop'].includes(p.slug);
    if (mood === 'woody') return ['shadow-x', 'midnight-aura', 'gentlemen'].includes(p.slug);
    if (mood === 'floral') return ['rose-whisper', 'silver-coast'].includes(p.slug);
    return occasion === 'evening' ? p.is_featured === 1 : true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="Find Your Signature Scent & Layering Guide | Al Fajr Scents"
        description="Discover your ideal Al Fajr Scents 50ml Eau de Parfum by mood, season, and occasion, and explore curated scent layering pairings."
        canonicalPath="/discover"
      />

      <div className="border-b border-[#10100E]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">Olfactory Consultation</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E] sm:text-5xl">
          Find Your Signature Scent
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#302018]/80">
          Select the atmosphere and occasion you dress for, and explore our curated layering rituals.
        </p>
      </div>

      {/* Interactive Consultation */}
      <div className="mt-10 grid gap-8 border border-[#10100E]/10 bg-[#FAF8F5] p-6 sm:p-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#10100E]">
              1. Which fragrance family draws you?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                { id: 'oceanic', label: 'Crisp & Oceanic' },
                { id: 'emerald', label: 'Amber & Spiced' },
                { id: 'woody', label: 'Smoky & Woody' },
                { id: 'floral', label: 'Velvet & Floral' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMood(opt.id as MoodChoice)}
                  className={`px-4 py-3 text-left text-xs uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                    mood === opt.id
                      ? 'bg-[#10100E] text-[#FAF8F5]'
                      : 'border border-[#10100E]/15 bg-white text-[#302018] hover:border-[#10100E]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#10100E]">
              2. Primary Wear Setting
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {[
                { id: 'daily', label: 'Daytime' },
                { id: 'evening', label: 'Evening' },
                { id: 'gifting', label: 'Gifting' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOccasion(opt.id as OccasionChoice)}
                  className={`px-3 py-3 text-center text-xs uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                    occasion === opt.id
                      ? 'bg-[#10100E] text-[#FAF8F5]'
                      : 'border border-[#10100E]/15 bg-white text-[#302018] hover:border-[#10100E]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p className="border-t border-[#10100E]/10 pt-4 text-xs leading-relaxed text-[#302018]/75">
            {occasion === 'gifting'
              ? 'Every bottle ships inside our signature matte-black embossed Al Fajr presentation case—ready for gifting.'
              : occasion === 'evening'
              ? 'Evening selections prioritize deeper projection and warm base resins that linger through late gatherings.'
              : 'Daytime selections emphasize crisp clarity and breathable sillage suited to warm Pakistani afternoons.'}
          </p>
        </div>

        <div className="lg:col-span-7">
          <p className="mb-4 text-xs uppercase tracking-[0.16em] text-[#302018]/70">
            Recommended For Your Selection ({recommendations.length})
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {recommendations.slice(0, 2).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      </div>

      {/* Scent Layering Guide */}
      <section className="mt-20">
        <div className="border-b border-[#10100E]/10 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C6A46A]">Scent Stacking Ritual</p>
          <h2 className="mt-2 font-display text-3xl text-[#10100E] sm:text-4xl">
            Curated Perfume Layering Combinations
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {LAYERING_PAIRINGS.map((combo) => {
            const p1 = products.find((p) => p.slug === combo.slugs[0]);
            const p2 = products.find((p) => p.slug === combo.slugs[1]);
            return (
              <div key={combo.title} className="flex flex-col justify-between border border-[#10100E]/10 bg-[#FAF8F5] p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#302018]/70">{combo.pair}</p>
                  <h3 className="mt-2 font-display text-2xl text-[#10100E]">{combo.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#302018]/85">{combo.description}</p>
                  <p className="mt-4 border-t border-[#10100E]/10 pt-3 text-xs text-[#302018]">
                    <strong>Method:</strong> {combo.ratio}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between gap-2">
                  {p1 && p2 ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await addToCart(p1.id, 1, false);
                        await addToCart(p2.id, 1, true);
                      }}
                      className="inline-flex items-center gap-2 bg-[#10100E] px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-[#FAF8F5] hover:bg-[#302018] cursor-pointer"
                    >
                      Add Pair to Bag <ArrowRight className="h-3.5 w-3.5 text-[#C6A46A]" />
                    </button>
                  ) : (
                    <Link
                      to="/shop"
                      className="text-xs uppercase tracking-[0.14em] underline"
                    >
                      Explore Pair
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
