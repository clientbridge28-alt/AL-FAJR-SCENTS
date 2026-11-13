import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, Menu, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandMonogram } from './BrandMark';

export function Header() {
  const { settings, cart, setCartOpen, wishlistIds } = useStore();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const announcement =
    settings.announcement_text ||
    'Complimentary shipping across Pakistan on orders above PKR 12,000 · Cash on Delivery & Bank Transfer';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Shop', to: '/shop' },
    { label: 'Discover', to: '/discover' },
    { label: 'Our Story', to: '/our-story' },
    { label: 'Journal', to: '/journal' },
    { label: 'Track Order', to: '/track-order' },
  ];

  return (
    <div className="sticky top-0 z-40">
      {!bannerDismissed && (
        <div className="relative flex h-[35px] items-center justify-center bg-[#555550] px-10 text-center [font-family:'Times_New_Roman',serif] text-[11px] italic tracking-[0.12em] text-[#F3E9DE]">
          <span className="truncate">{announcement}</span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 flex h-7 w-7 items-center justify-center text-[#CDBBA9] hover:text-[#FAF8F5] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <header className="border-b border-[#10100E]/10 bg-[#F3E9DE]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-11 w-11 items-center justify-center text-[#10100E] lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              to="/"
              className="flex items-center gap-2.5 text-[#10100E] whitespace-nowrap shrink-0"
            >
              <BrandMonogram className="h-6 w-6 text-[#C6A46A]" />
              <span className="font-display text-xl font-semibold italic tracking-[0.14em] uppercase text-[#1b1818] sm:text-2xl">
                Al Fajr Scents
              </span>
            </Link>
          </div>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Primary Navigation">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative py-1 text-xs uppercase tracking-[0.16em] transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-[#10100E] font-semibold' : 'text-[#302018]/80 hover:text-[#10100E]'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-0.5 h-[1px] bg-[#C6A46A]" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Search, Wishlist, Shopping Bag */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search fragrances"
              className="flex h-10 w-10 items-center justify-center text-[#10100E] hover:text-[#302018] cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative flex h-10 w-10 items-center justify-center text-[#10100E] hover:text-[#302018]"
            >
              <Heart className="h-4 w-4" />
              {wishlistIds.length > 0 && (
                <span className="tabular-nums absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center bg-[#C6A46A] px-1 text-[10px] font-semibold text-[#10100E]">
                  {wishlistIds.length}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex h-10 items-center gap-2 bg-[#595952] px-4 text-xs font-medium uppercase tracking-[0.14em] text-[#FAF8F5] transition-colors hover:bg-[#302018] cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-[#C6A46A]" />
              <span className="tabular-nums">Bag ({cart.item_count})</span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-[#10100E]/10 bg-[#FAF8F5] px-4 py-3 sm:px-6 lg:px-8">
            <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-2xl items-center gap-3">
              <Search className="h-4 w-4 text-[#302018]/60 shrink-0" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by fragrance name, note, or mood (e.g., Blu Mare, Oud, Amber)..."
                className="w-full bg-transparent py-1.5 text-sm text-[#10100E] placeholder:text-[#302018]/50 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#10100E] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#FAF8F5] hover:bg-[#302018] cursor-pointer whitespace-nowrap shrink-0"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-2 text-[#302018]/70 hover:text-[#10100E] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#10100E]/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col justify-between bg-[#F3E9DE] p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#10100E]/10 pb-4">
                <span className="font-display text-lg font-semibold tracking-[0.14em] uppercase">
                  Al Fajr Scents
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-11 w-11 items-center justify-center text-[#10100E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center border-b border-[#10100E]/8 text-sm uppercase tracking-[0.14em] text-[#10100E]"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center border-b border-[#10100E]/8 text-sm uppercase tracking-[0.14em] text-[#10100E]"
                >
                  Wishlist ({wishlistIds.length})
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center border-b border-[#10100E]/8 text-sm uppercase tracking-[0.14em] text-[#10100E]"
                >
                  Contact Concierge
                </Link>
              </nav>
            </div>
            <div className="border-t border-[#10100E]/10 pt-4 text-xs text-[#302018]/75">
              <p>Al Fajr Scents · Pakistan</p>
              <p className="mt-1">Nationwide Cash on Delivery & Bank Transfer</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
