import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, PackageSearch } from 'lucide-react';
import { formatPKR } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import { useStore } from '../context/StoreContext';
import type { OrderRecord } from '../types';

export function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { settings } = useStore();
  const [payload, setPayload] = useState<{
    order: OrderRecord;
    paymentSession?: { instructions?: string; sessionId?: string };
  } | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    try {
      const saved = sessionStorage.getItem(`af_order_${orderNumber}`);
      if (saved) setPayload(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, [orderNumber]);

  const order = payload?.order;
  const whatsappClean = (settings.whatsapp_number || '').replace(/\D/g, '');
  const whatsappHref =
    whatsappClean && order
      ? `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
          `Assalam-o-Alaikum Al Fajr Scents, I placed order ${order.order_number} (Total: PKR ${order.total_pkr.toLocaleString()}).`
        )}`
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SEOHead
        title={`Order ${orderNumber || ''} Confirmed | Al Fajr Scents`}
        description="Order confirmation and tracking details for your Al Fajr Scents purchase."
        canonicalPath={`/order-confirmation/${orderNumber || ''}`}
      />

      <div className="border border-[#10100E]/15 bg-[#FAF8F5] p-8 sm:p-12">
        <div className="flex items-center gap-3 text-[#153F35]">
          <CheckCircle2 className="h-7 w-7" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Order Recorded</span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-normal text-[#10100E]">
          Thank You{order?.customer_name ? `, ${order.customer_name}` : ''}.
        </h1>
        <p className="mt-2 text-sm text-[#302018]/80">
          Your order number is <strong className="tabular-nums text-[#10100E]">{orderNumber}</strong>. Keep this reference to track your delivery status.
        </p>

        {order && (
          <div className="mt-8 space-y-6 border-t border-[#10100E]/10 pt-6 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#302018]/70">Tracking Reference</p>
                <p className="mt-1 tabular-nums font-semibold text-[#10100E]">{order.tracking_reference}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#302018]/70">Payment Status</p>
                <p className="mt-1 font-semibold uppercase tracking-wider text-[#10100E]">
                  {order.payment_method.replace('_', ' ')} · {order.payment_status.replace('_', ' ')}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wider text-[#302018]/70">Delivery Destination</p>
                <p className="mt-1 text-[#10100E]">
                  {order.delivery_address}, {order.city}
                </p>
              </div>
            </div>

            {payload?.paymentSession?.instructions && (
              <div className="border border-[#C6A46A]/50 bg-[#F3E9DE]/70 p-4 text-xs text-[#302018]">
                <p className="font-semibold uppercase tracking-wider text-[#10100E]">Payment Instructions</p>
                <p className="mt-1">{payload.paymentSession.instructions}</p>
              </div>
            )}

            <div className="border-t border-[#10100E]/10 pt-5">
              <p className="text-xs uppercase tracking-wider text-[#302018]/70">Items Ordered</p>
              <ul className="mt-3 space-y-2">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      {item.name || item.product_name} ({item.size_ml}ml) × {item.quantity}
                    </span>
                    <span className="tabular-nums font-medium">{formatPKR(item.line_total_pkr)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-[#10100E]/10 pt-3 text-base font-semibold text-[#10100E]">
                <span>Order Total</span>
                <span className="tabular-nums">{formatPKR(order.total_pkr)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#10100E]/10 pt-6">
          <Link
            to={`/track-order?orderNumber=${encodeURIComponent(orderNumber || '')}`}
            className="inline-flex items-center gap-2 bg-[#10100E] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] hover:bg-[#302018]"
          >
            <PackageSearch className="h-4 w-4 text-[#C6A46A]" />
            Track Order
          </Link>

          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#153F35] bg-[#153F35] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] hover:opacity-90"
            >
              <MessageSquare className="h-4 w-4" />
              Confirm via WhatsApp
            </a>
          )}

          <Link
            to="/shop"
            className="inline-flex items-center border border-[#10100E]/25 px-6 py-3 text-xs uppercase tracking-[0.16em] text-[#10100E] hover:border-[#10100E]"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
