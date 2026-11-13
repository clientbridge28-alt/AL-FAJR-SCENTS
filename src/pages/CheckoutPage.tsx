import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';

const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Bahawalpur',
  'Abbottabad',
];

export function CheckoutPage() {
  const { cart, paymentMethods, settings, refreshCart } = useStore();
  const navigate = useNavigate();

  const enabledMethods = paymentMethods.filter((m) => m.enabled);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lahore');
  const [customCity, setCustomCity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(enabledMethods[0]?.id || 'cod');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const selectedMethodObj = paymentMethods.find((m) => m.id === paymentMethod);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const resolvedCity = city === 'Other' ? customCity.trim() : city;

    if (!resolvedCity) {
      setErrorMsg('Please specify your delivery city.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          city: resolvedCity,
          deliveryAddress,
          orderNotes,
          paymentMethod,
          transactionRef,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not complete order. Please verify your details.');
        return;
      }

      try {
        sessionStorage.setItem(`af_order_${data.order.order_number}`, JSON.stringify(data));
      } catch {
        // ignore sessionStorage errors
      }
      await refreshCart();
      navigate(`/order-confirmation/${data.order.order_number}`);
    } catch {
      setErrorMsg('Network error while submitting order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <SEOHead
          title="Checkout | Al Fajr Scents"
          description="Complete your Al Fajr Scents fragrance order with Cash on Delivery or Bank Transfer across Pakistan."
          canonicalPath="/checkout"
        />
        <h1 className="font-display text-4xl text-[#10100E]">Your Shopping Bag Is Empty</h1>
        <p className="mt-3 text-sm text-[#302018]/80">
          Select a 50ml Eau de Parfum from our collection before proceeding to checkout.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block bg-[#10100E] px-7 py-3.5 text-xs uppercase tracking-[0.16em] text-[#FAF8F5]"
        >
          Explore Fragrances
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SEOHead
        title="Guest Checkout | Al Fajr Scents"
        description="Fast guest checkout for Al Fajr Scents orders across Pakistan. Cash on Delivery and Direct Bank Transfer supported."
        canonicalPath="/checkout"
      />

      <div className="border-b border-[#10100E]/10 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">Guest Checkout · No Account Required</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E]">Complete Your Order</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="mt-10 grid gap-12 lg:grid-cols-12">
        {/* Left: Delivery & Payment Details */}
        <div className="space-y-8 lg:col-span-7">
          <section className="border border-[#10100E]/10 bg-[#FAF8F5] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-[#10100E]">1. Delivery Information (Pakistan)</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Muhammad Ahmed"
                  className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">Mobile / Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">City *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                >
                  {PAKISTAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other City / Town</option>
                </select>
              </div>

              {city === 'Other' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">Specify City *</label>
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Enter your city"
                    className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">Complete Delivery Address *</label>
                <textarea
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House / Flat #, Street, Sector or Phase, Nearest Landmark"
                  className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-[#302018]">Order / Gift Note (Optional)</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Preferred delivery hours or gift message"
                  className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="border border-[#10100E]/10 bg-[#FAF8F5] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-[#10100E]">2. Payment Method</h2>
            <div className="mt-5 space-y-3">
              {enabledMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3.5 border p-4 transition-colors ${
                    paymentMethod === method.id
                      ? 'border-[#10100E] bg-[#F3E9DE]/60'
                      : 'border-[#10100E]/15 bg-white hover:border-[#10100E]/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="mt-1 accent-[#10100E]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#10100E]">{method.label}</p>
                    <p className="mt-0.5 text-xs text-[#302018]/75">{method.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="mt-5 border border-[#C6A46A]/50 bg-[#F3E9DE]/70 p-4 text-xs text-[#302018]">
                <p className="font-semibold uppercase tracking-wider text-[#10100E]">Bank Transfer Instructions</p>
                <p className="mt-1.5">Bank: <strong>{settings.bank_name}</strong></p>
                <p>Account Title: <strong>{settings.bank_account_title}</strong></p>
                <p>IBAN / Account: <strong>{settings.bank_iban}</strong></p>
                <div className="mt-3">
                  <label className="block text-[11px] uppercase tracking-wider text-[#10100E]">
                    Transfer Reference / TID (Optional — can also be verified later)
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Enter Bank / Raast Reference ID"
                    className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {selectedMethodObj && selectedMethodObj.requiresCredentials && !selectedMethodObj.sandboxMode && (
              <div className="mt-4 flex items-start gap-2.5 border border-amber-800/30 bg-amber-50 p-4 text-xs text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This online gateway is in pending-merchant-credentials mode. Your order will be recorded safely in pending state until verified server-side gateway confirmation is enabled.
                </span>
              </div>
            )}
          </section>
        </div>

        {/* Right: Authoritative Order Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 border border-[#10100E]/15 bg-[#FAF8F5] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-[#10100E]">Order Summary</h2>

            <ul className="mt-6 divide-y divide-[#10100E]/10">
              {cart.items.map((item) => (
                <li key={item.product_id} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-12 shrink-0 overflow-hidden bg-[#E9DFD3]">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#10100E]">{item.name}</p>
                      <p className="tabular-nums text-xs text-[#302018]/70">
                        {item.size_ml}ml · Qty {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="tabular-nums font-medium text-[#10100E]">
                    {formatPKR(item.price_pkr * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-2.5 border-t border-[#10100E]/10 pt-5 text-sm">
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
                <span>Shipping</span>
                <span className="tabular-nums">
                  {cart.shipping_pkr === 0 ? 'Complimentary' : formatPKR(cart.shipping_pkr)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#10100E]/15 pt-3 text-lg font-semibold text-[#10100E]">
                <span>Total (PKR)</span>
                <span className="tabular-nums">{formatPKR(cart.total_pkr)}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 border border-red-800/30 bg-red-50 px-4 py-3 text-xs text-red-900">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 bg-[#10100E] py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#FAF8F5] transition-colors hover:bg-[#302018] disabled:opacity-50 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-[#C6A46A]" />
              {submitting ? 'Confirming Order...' : 'Place Order'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-3 text-center text-[11px] text-[#302018]/70">
              Totals, stock availability, and discounts are verified server-side prior to order confirmation.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
