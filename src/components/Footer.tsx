import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandMonogram } from './BrandMark';

export function Footer() {
  const { settings } = useStore();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus({ ok: false, text: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          ok: true,
          text: data.message || 'You are subscribed to Al Fajr Scents marketing updates.',
        });
        setEmail('');
      } else {
        setStatus({ ok: false, text: data.error || 'Subscription failed.' });
      }
    } catch {
      setStatus({
        ok: false,
        text: 'Unable to connect right now. Please try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#10100E] text-[#F3E9DE]">
      {/* Newsletter Subscription Section */}
      <section
        aria-labelledby="footer-newsletter-heading"
        className="border-b border-[#F3E9DE]/10 bg-[#302018]/45"
      >
        <div className="mx-auto grid max-w-7xl gap-8 bg-[#362929] px-4 py-14 [font-family:Georgia,serif] italic sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
          <div className="lg:col-span-6">
            <h2
              id="footer-newsletter-heading"
              className="mt-2 font-display text-[38px] font-normal text-[#f2e1d6]"
            >
              New Releases, Layering Notes &amp; Private Batches
            </h2>
            <p className="mt-2.5 max-w-lg [font-family:'Times_New_Roman',serif] text-[13px] leading-relaxed text-[#f8ebe3]">
              Subscribe for early access to limited fragrance releases, seasonal layering guides, and curated house updates.
            </p>
          </div>
          <div className="lg:col-span-6">
            <form onSubmit={handleSubscribe} noValidate className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address for marketing updates
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                className="flex-1 border border-[#CDBBA9]/30 bg-transparent px-4 py-3 text-sm text-[#FAF8F5] placeholder:text-[#CDBBA9]/50 focus:border-[#C6A46A] focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 bg-[#C6A46A] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#1b1b0d] transition-colors hover:bg-[#FAF8F5] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {submitting ? 'Subscribing...' : 'Subscribe'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
            {status && (
              <div
                role={status.ok ? 'status' : 'alert'}
                className={`mt-3 flex items-center gap-2 text-xs ${
                  status.ok ? 'text-[#C6A46A]' : 'text-red-300'
                }`}
              >
                {status.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{status.text}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Footer Grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 [font-family:Georgia,serif] italic sm:px-6 md:grid-cols-2 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            <BrandMonogram className="h-7 w-7 text-[#C6A46A]" />
            <span className="[font-family:Georgia,serif] text-[26px] tracking-[0.14em] uppercase text-[#FAF8F5]">
              Al Fajr Scents
            </span>
          </div>
          <p className="mt-4 max-w-sm [font-family:'Times_New_Roman',serif] text-[13px] leading-relaxed text-[#CDBBA9]/80">
            Fine Eau de Parfum creations crafted in Pakistan. Designed around natural warmth, enduring character, and restrained luxury.
          </p>
          <div className="mt-6 space-y-1 text-xs text-[#CDBBA9]/75">
            <p>{settings.contact_email || 'concierge@alfajrscents.pk'}</p>
            {settings.business_address && !settings.business_address.startsWith('[') && (
              <p>{settings.business_address}</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A46A]">Collection</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#CDBBA9]">
            <li><Link to="/shop" className="hover:text-[#FAF8F5] transition-colors">All Fragrances</Link></li>
            <li><Link to="/products/blu-mare" className="hover:text-[#FAF8F5] transition-colors">Blu Mare</Link></li>
            <li><Link to="/products/silver-coast" className="hover:text-[#FAF8F5] transition-colors">Silver Coast</Link></li>
            <li><Link to="/products/shadow-x" className="hover:text-[#FAF8F5] transition-colors">Shadow X</Link></li>
            <li><Link to="/products/midnight-aura" className="hover:text-[#FAF8F5] transition-colors">Midnight Aura</Link></li>
            <li><Link to="/products/rose-whisper" className="hover:text-[#FAF8F5] transition-colors">Rose Whisper</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A46A]">House &amp; Discovery</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#CDBBA9]">
            <li><Link to="/discover" className="hover:text-[#FAF8F5] transition-colors">Find Your Signature Scent</Link></li>
            <li><Link to="/our-story" className="hover:text-[#FAF8F5] transition-colors">Our Story &amp; Craft</Link></li>
            <li><Link to="/journal" className="hover:text-[#FAF8F5] transition-colors">The Fragrance Journal</Link></li>
            <li><Link to="/about" className="hover:text-[#FAF8F5] transition-colors">About Al Fajr Scents</Link></li>
            <li><Link to="/wishlist" className="hover:text-[#FAF8F5] transition-colors">Saved Wishlist</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A46A]">Client Care</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#CDBBA9]">
            <li><Link to="/track-order" className="hover:text-[#FAF8F5] transition-colors">Track Your Order</Link></li>
            <li><Link to="/contact" className="hover:text-[#FAF8F5] transition-colors">Contact Concierge</Link></li>
            <li><Link to="/faq" className="hover:text-[#FAF8F5] transition-colors">Frequently Asked Questions</Link></li>
            <li><Link to="/shipping-policy" className="hover:text-[#FAF8F5] transition-colors">Shipping Policy</Link></li>
            <li><Link to="/returns-policy" className="hover:text-[#FAF8F5] transition-colors">Returns &amp; Exchange</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-[#F3E9DE]/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-6 text-xs text-[#CDBBA9]/65 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Al Fajr Scents (alfajrscents.pk). All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/privacy-policy" className="hover:text-[#FAF8F5]">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#FAF8F5]">Terms &amp; Conditions</Link>
            <Link to="/admin" className="hover:text-[#C6A46A]">Store Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
