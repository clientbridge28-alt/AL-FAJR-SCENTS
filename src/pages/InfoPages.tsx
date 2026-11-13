import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { Product } from '../types';

export function OurStoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SEOHead
        title="Our Story & Craft | Al Fajr Scents"
        description="Learn the philosophy and craftsmanship behind Al Fajr Scents, a Pakistani luxury Eau de Parfum house."
        canonicalPath="/our-story"
      />

      <p className="text-xs uppercase tracking-[0.2em] text-[#C6A46A]">The House</p>
      <h1 className="mt-3 font-display text-4xl font-normal text-[#10100E] sm:text-6xl">
        Crafted for Quiet Confidence.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[#302018]/85">
        Al Fajr Scents was founded in Pakistan with a focused conviction: fine fragrance should carry the depth and permanence of Eastern perfumery within a restrained, modern silhouette.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div className="aspect-[4/5] overflow-hidden bg-[#E9DFD3]">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.30_AM_49eda978.jpeg"
            alt="Al Fajr Scents luxury box craftsmanship"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center space-y-6 text-sm leading-relaxed text-[#302018]">
          <div>
            <h2 className="font-display text-2xl text-[#10100E]">Distinctive Identity Per Bottle</h2>
            <p className="mt-2">
              Rather than repeating one formula in different bottles, each creation—from coastal Blu Mare and emerald-amber Silver Coast to smoky Shadow X—carries its own glass finish, temperature, and mood.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl text-[#10100E]">Honest Craft &amp; Presentation</h2>
            <p className="mt-2">
              Every 50ml Eau de Parfum is presented in our signature gilded matte-black crest case, engineered both for daily shelf display and thoughtful gifting.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex w-fit items-center gap-2 bg-[#10100E] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[#FAF8F5]"
          >
            Explore Collection <ArrowRight className="h-4 w-4 text-[#C6A46A]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      setStatus({ ok: res.ok, text: res.ok ? data.message : data.error });
      if (res.ok) {
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="Contact Concierge | Al Fajr Scents"
        description="Reach the Al Fajr Scents client concierge for fragrance guidance, gifting orders, or delivery support in Pakistan."
        canonicalPath="/contact"
      />

      <div className="border-b border-[#10100E]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">Client Concierge</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E]">Contact Us</h1>
      </div>

      <div className="mt-10 grid gap-12 md:grid-cols-12">
        <div className="space-y-5 text-sm text-[#302018] md:col-span-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#302018]/65">Concierge Email</p>
            <p className="mt-1 font-medium text-[#10100E]">{settings.contact_email || 'concierge@alfajrscents.pk'}</p>
          </div>
          {settings.contact_phone && !settings.contact_phone.startsWith('[') && (
            <div>
              <p className="text-xs uppercase tracking-wider text-[#302018]/65">Phone / WhatsApp</p>
              <p className="mt-1 font-medium text-[#10100E]">{settings.contact_phone}</p>
            </div>
          )}
          {settings.business_address && !settings.business_address.startsWith('[') && (
            <div>
              <p className="text-xs uppercase tracking-wider text-[#302018]/65">Studio Location</p>
              <p className="mt-1 font-medium text-[#10100E]">{settings.business_address}</p>
            </div>
          )}
          <p className="border-t border-[#10100E]/10 pt-4 text-xs leading-relaxed text-[#302018]/75">
            For order updates, include your order number (e.g., AF-...) or visit our{' '}
            <Link to="/track-order" className="underline">Order Tracking</Link> page.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border border-[#10100E]/10 bg-[#FAF8F5] p-6 sm:p-8 md:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name *"
              className="border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address *"
              className="border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone Number (Optional)"
              className="border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
            />
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject *"
              className="border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
            />
          </div>
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How may we assist you? *"
            className="w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#10100E] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] hover:bg-[#302018] cursor-pointer"
          >
            {submitting ? 'Sending...' : 'Send Inquiry'}
          </button>
          {status && (
            <p className={`text-xs ${status.ok ? 'text-[#153F35]' : 'text-red-700'}`}>{status.text}</p>
          )}
        </form>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: 'Are all Al Fajr Scents bottles 50ml Eau de Parfum?',
    a: 'Yes. Every flagship fragrance in our current collection is bottled in a 50ml Eau de Parfum flacon and delivered inside our signature black embossed presentation box.',
  },
  {
    q: 'Is Blu Mare the same fragrance as Blu Sea?',
    a: 'No. Blu Mare and Blu Sea are distinct creations with separate bottles, packaging, and olfactory profiles. You can compare both directly in our catalogue.',
  },
  {
    q: 'Which payment methods are accepted in Pakistan?',
    a: 'We accept Cash on Delivery (COD) nationwide and Direct Bank Transfer (IBAN / Raast). Additional local card and wallet gateways can be enabled as merchant accounts activate.',
  },
  {
    q: 'How long does shipping take across Pakistan?',
    a: 'Orders are typically processed within 24 hours and delivered across major Pakistani cities within 2–4 working days.',
  },
  {
    q: 'Do I need to create an account to place an order?',
    a: 'No. We offer streamlined guest checkout without mandatory registration. You can track your order anytime with your order number and phone.',
  },
];

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="Frequently Asked Questions | Al Fajr Scents"
        description="Answers on Al Fajr Scents bottle sizes, Cash on Delivery across Pakistan, shipping timelines, and fragrance care."
        canonicalPath="/faq"
      />
      <h1 className="font-display text-4xl font-normal text-[#10100E]">Frequently Asked Questions</h1>
      <div className="mt-8 divide-y divide-[#10100E]/15 border-y border-[#10100E]/15">
        {FAQS.map((item, idx) => (
          <div key={idx} className="py-5">
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
            >
              <span className="font-display text-xl text-[#10100E]">{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`}
              />
            </button>
            {openIdx === idx && <p className="mt-3 text-sm leading-relaxed text-[#302018]/85">{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PolicyPage({ type }: { type: 'shipping' | 'returns' | 'privacy' | 'terms' }) {
  const { settings } = useStore();
  const fee = Number(settings.shipping_fee_pkr || 250).toLocaleString();
  const threshold = Number(settings.free_shipping_threshold_pkr || 12000).toLocaleString();

  const contentMap = {
    shipping: {
      title: 'Shipping Policy',
      path: '/shipping-policy',
      body: [
        `Standard nationwide courier delivery across Pakistan is PKR ${fee}. Orders above PKR ${threshold} qualify for complimentary delivery.`,
        'Orders placed before 2:00 PM PKT on working days are typically dispatched within 24 hours. Delivery takes 2–4 business days in major cities (Karachi, Lahore, Islamabad, Rawalpindi) and 3–6 days in remote areas.',
        'For Cash on Delivery orders, please ensure your phone number is reachable for courier confirmation.',
      ],
    },
    returns: {
      title: 'Returns & Exchange Policy',
      path: '/returns-policy',
      body: [
        'Because fragrance is a personal sealed product, unopened bottles in original sealed packaging may be returned or exchanged within 7 days of delivery.',
        'If your parcel arrives damaged in transit or contains an incorrect item, please contact our concierge within 48 hours of receipt with your order number and photographs of the outer box and bottle.',
        'Approved refunds for prepaid Bank Transfer orders are processed within 5–7 business days.',
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      path: '/privacy-policy',
      body: [
        'Al Fajr Scents collects only the information required to process, verify, and deliver your fragrance order (name, phone number, delivery address, and optional email).',
        'We do not store raw payment card numbers on our servers and do not sell or share customer data with unrelated third parties.',
        'Essential session cookies are used strictly for shopping bag persistence and verified administration access.',
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      path: '/terms',
      body: [
        'All prices on alfajrscents.pk are listed in Pakistani Rupees (PKR) and validated server-side upon checkout.',
        'Orders are subject to stock availability. We reserve the right to cancel orders with unverified contact information or suspected duplicate automated submissions.',
        'All bottle photography, product names, and editorial materials belong to Al Fajr Scents.',
      ],
    },
  };

  const doc = contentMap[type];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead title={`${doc.title} | Al Fajr Scents`} description={doc.body[0]} canonicalPath={doc.path} />
      <h1 className="font-display text-4xl font-normal text-[#10100E]">{doc.title}</h1>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-[#302018]">
        {doc.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

export function WishlistPage() {
  const { wishlistIds } = useStore();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

  const saved = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="Saved Wishlist | Al Fajr Scents"
        description="Your saved Al Fajr Scents fragrances."
        canonicalPath="/wishlist"
      />
      <div className="border-b border-[#10100E]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">Saved Selection</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E]">Your Wishlist ({saved.length})</h1>
      </div>

      {saved.length === 0 ? (
        <div className="mt-10 border border-[#10100E]/10 bg-[#FAF8F5] p-12 text-center">
          <p className="font-display text-2xl text-[#10100E]">No saved fragrances yet</p>
          <Link to="/shop" className="mt-5 inline-block bg-[#10100E] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[#FAF8F5]">
            Browse Fragrances
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.products || []))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title={`Search: ${q || 'All'} | Al Fajr Scents`}
        description="Search Al Fajr Scents Eau de Parfum fragrances by name or olfactory note."
        canonicalPath="/search"
      />
      <h1 className="font-display text-4xl font-normal text-[#10100E]">
        Search Results{q ? ` for "${q}"` : ''}
      </h1>
      {loading ? (
        <p className="mt-6 text-sm text-[#302018]/70">Searching archive...</p>
      ) : results.length === 0 ? (
        <div className="mt-8 border border-[#10100E]/10 bg-[#FAF8F5] p-10 text-center">
          <p className="font-display text-2xl">No fragrances matched "{q}"</p>
          <Link to="/shop" className="mt-4 inline-block underline text-sm">
            View Full Collection
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <SEOHead title="Page Not Found | Al Fajr Scents" description="Page not found." />
      <p className="text-xs uppercase tracking-[0.2em] text-[#C6A46A]">404</p>
      <h1 className="mt-2 font-display text-5xl text-[#10100E]">Page Not Found</h1>
      <p className="mt-4 text-sm text-[#302018]/80">
        The page you requested does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-7 inline-block bg-[#10100E] px-7 py-3.5 text-xs uppercase tracking-[0.16em] text-[#FAF8F5]"
      >
        Return Home
      </Link>
    </div>
  );
}
