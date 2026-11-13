import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { formatPKR } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { OrderRecord } from '../types';

const STATUS_STEPS = ['received', 'processing', 'confirmed', 'dispatched', 'delivered'];

export function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not locate order.');
      } else {
        setOrder(data.order);
      }
    } finally {
      setLoading(false);
    }
  };

  const activeIdx = order ? STATUS_STEPS.indexOf(order.order_status) : -1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="Track Your Order | Al Fajr Scents"
        description="Verify and track your Al Fajr Scents order status across Pakistan using your order number and phone verification."
        canonicalPath="/track-order"
      />

      <div className="border-b border-[#10100E]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">Client Concierge</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E]">Track Your Order</h1>
        <p className="mt-2 text-sm text-[#302018]/80">
          Enter your Al Fajr Scents order number and the phone number (or last 4 digits) used at checkout.
        </p>
      </div>

      <form onSubmit={handleTrack} className="mt-8 grid gap-4 border border-[#10100E]/10 bg-[#FAF8F5] p-6 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label className="block text-xs uppercase tracking-wider text-[#302018]">Order Number</label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="AF-123456-ABCD"
            className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-sm uppercase focus:border-[#10100E] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-xs uppercase tracking-wider text-[#302018]">Phone Number</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03XX-XXXXXXX"
            className="mt-1.5 w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-sm focus:border-[#10100E] focus:outline-none"
          />
        </div>
        <div className="flex items-end sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="flex h-[42px] w-full items-center justify-center gap-2 bg-[#10100E] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF8F5] hover:bg-[#302018] cursor-pointer"
          >
            <PackageSearch className="h-4 w-4 text-[#C6A46A]" />
            {loading ? 'Checking...' : 'Track'}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="mt-6 border border-red-800/30 bg-red-50 p-4 text-sm text-red-900">{errorMsg}</div>
      )}

      {order && (
        <div className="mt-8 border border-[#10100E]/15 bg-[#FAF8F5] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#10100E]/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#302018]/70">Order {order.order_number}</p>
              <h2 className="mt-1 font-display text-2xl text-[#10100E]">
                Status: {order.order_status.toUpperCase()}
              </h2>
            </div>
            <div className="text-right text-xs text-[#302018]">
              <p>Payment: <strong className="uppercase">{order.payment_status.replace('_', ' ')}</strong></p>
              <p className="mt-0.5 tabular-nums">Ref: {order.tracking_reference}</p>
            </div>
          </div>

          {order.order_status === 'cancelled' ? (
            <div className="mt-6 border border-red-800/20 bg-red-50 p-4 text-sm text-red-900">
              This order has been cancelled. Please contact our concierge if you need assistance.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-5 gap-2">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= activeIdx;
                return (
                  <div key={step} className="text-center">
                    <div
                      className={`h-1.5 w-full ${done ? 'bg-[#10100E]' : 'bg-[#CDBBA9]/40'}`}
                    />
                    <p className={`mt-2 text-[11px] uppercase tracking-wider ${done ? 'font-semibold text-[#10100E]' : 'text-[#302018]/50'}`}>
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 border-t border-[#10100E]/10 pt-5 text-sm">
            <p className="text-xs uppercase tracking-wider text-[#302018]/70">Items</p>
            <ul className="mt-3 space-y-2">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.product_name} ({item.size_ml}ml) × {item.quantity}</span>
                  <span className="tabular-nums font-medium">{formatPKR(item.line_total_pkr)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-[#10100E]/10 pt-3 font-semibold text-[#10100E]">
              <span>Total ({order.city})</span>
              <span className="tabular-nums">{formatPKR(order.total_pkr)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
