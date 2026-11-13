import crypto from 'node:crypto';
import { db } from './db.ts';

export type PaymentProviderId = 'cod' | 'bank_transfer' | 'safepay' | 'payfast' | 'jazzcash' | 'easypaisa';

export interface PaymentMethodDescriptor {
  id: PaymentProviderId;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  requiresCredentials: boolean;
  sandboxMode: boolean;
}

export function getPaymentMethods(settings: Record<string, string>): PaymentMethodDescriptor[] {
  const sandboxMode = process.env.PAYMENT_SANDBOX_MODE === 'true';

  const safepayConfigured = Boolean(process.env.SAFEPAY_PUBLIC_KEY && process.env.SAFEPAY_SECRET_KEY);
  const payfastConfigured = Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_SECURED_KEY);
  const jazzcashConfigured = Boolean(
    process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD && process.env.JAZZCASH_INTEGRITY_SALT
  );
  const easypaisaConfigured = Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY);

  return [
    {
      id: 'cod',
      label: 'Cash on Delivery (COD)',
      description: 'Pay in cash upon doorstep delivery anywhere in Pakistan.',
      enabled: settings.cod_enabled !== 'false',
      configured: true,
      requiresCredentials: false,
      sandboxMode: false,
    },
    {
      id: 'bank_transfer',
      label: 'Direct Bank Transfer (IBAN / Raast)',
      description: 'Transfer directly to Al Fajr Scents account. Orders dispatch once verified.',
      enabled: settings.bank_transfer_enabled !== 'false',
      configured: true,
      requiresCredentials: false,
      sandboxMode: false,
    },
    {
      id: 'safepay',
      label: 'Safepay (Cards & Wallets)',
      description: safepayConfigured
        ? 'Pay securely via debit/credit card through Safepay.'
        : 'Adapter ready — requires Safepay merchant API credentials in environment.',
      enabled: settings.safepay_enabled === 'true',
      configured: safepayConfigured || sandboxMode,
      requiresCredentials: !safepayConfigured,
      sandboxMode,
    },
    {
      id: 'payfast',
      label: 'PayFast Pakistan',
      description: payfastConfigured
        ? 'Pay via Visa, Mastercard, or PayFast bank account.'
        : 'Adapter ready — requires PayFast merchant credentials in environment.',
      enabled: settings.payfast_enabled === 'true',
      configured: payfastConfigured || sandboxMode,
      requiresCredentials: !payfastConfigured,
      sandboxMode,
    },
    {
      id: 'jazzcash',
      label: 'JazzCash Mobile Wallet',
      description: jazzcashConfigured
        ? 'Pay directly via JazzCash MPIN or card.'
        : 'Adapter ready — requires JazzCash merchant credentials in environment.',
      enabled: settings.jazzcash_enabled === 'true',
      configured: jazzcashConfigured || sandboxMode,
      requiresCredentials: !jazzcashConfigured,
      sandboxMode,
    },
    {
      id: 'easypaisa',
      label: 'Easypaisa Mobile Account',
      description: easypaisaConfigured
        ? 'Pay via Easypaisa mobile account.'
        : 'Adapter ready — requires Easypaisa store credentials in environment.',
      enabled: settings.easypaisa_enabled === 'true',
      configured: easypaisaConfigured || sandboxMode,
      requiresCredentials: !easypaisaConfigured,
      sandboxMode,
    },
  ];
}

export interface PaymentSessionResult {
  paymentStatus: 'pending' | 'awaiting_verification' | 'requires_gateway_setup' | 'pending_gateway';
  sessionId: string;
  redirectUrl: string | null;
  instructions: string;
}

export function createPaymentSession(params: {
  orderId: number;
  orderNumber: string;
  provider: PaymentProviderId;
  amountPkr: number;
  transactionRef?: string;
  settings: Record<string, string>;
}): PaymentSessionResult {
  const { orderId, orderNumber, provider, amountPkr, transactionRef, settings } = params;
  const sessionId = `SES-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  if (provider === 'cod') {
    db.prepare(
      `INSERT INTO payments (order_id, provider, status, amount_pkr, currency, session_id, metadata_json)
       VALUES (?, 'cod', 'pending', ?, 'PKR', ?, ?)`
    ).run(orderId, amountPkr, sessionId, JSON.stringify({ method: 'Cash on Delivery' }));
    return {
      paymentStatus: 'pending',
      sessionId,
      redirectUrl: null,
      instructions: 'Pay in cash to the courier upon delivery.',
    };
  }

  if (provider === 'bank_transfer') {
    db.prepare(
      `INSERT INTO payments (order_id, provider, status, amount_pkr, currency, transaction_ref, session_id, metadata_json)
       VALUES (?, 'bank_transfer', 'awaiting_verification', ?, 'PKR', ?, ?, ?)`
    ).run(
      orderId,
      amountPkr,
      transactionRef?.trim() || null,
      sessionId,
      JSON.stringify({ bank_name: settings.bank_name, bank_iban: settings.bank_iban })
    );
    return {
      paymentStatus: 'awaiting_verification',
      sessionId,
      redirectUrl: null,
      instructions: `Please transfer PKR ${amountPkr.toLocaleString()} to ${settings.bank_name} (${settings.bank_iban}) and quote order ${orderNumber}.`,
    };
  }

  // Online gateways (Safepay, PayFast, JazzCash, Easypaisa)
  const methods = getPaymentMethods(settings);
  const descriptor = methods.find((m) => m.id === provider);
  const isConfigured = Boolean(descriptor?.configured);

  if (!isConfigured) {
    db.prepare(
      `INSERT INTO payments (order_id, provider, status, amount_pkr, currency, session_id, metadata_json)
       VALUES (?, ?, 'requires_gateway_setup', ?, 'PKR', ?, ?)`
    ).run(
      orderId,
      provider,
      amountPkr,
      sessionId,
      JSON.stringify({ note: 'Merchant credentials not yet configured in environment' })
    );
    return {
      paymentStatus: 'requires_gateway_setup',
      sessionId,
      redirectUrl: null,
      instructions: `${descriptor?.label || provider} merchant API credentials are not configured yet. Order saved in pending state—you may complete via Bank Transfer or contact support.`,
    };
  }

  // Configured or sandbox gateway session
  db.prepare(
    `INSERT INTO payments (order_id, provider, status, amount_pkr, currency, session_id, metadata_json)
     VALUES (?, ?, 'pending_gateway', ?, 'PKR', ?, ?)`
  ).run(
    orderId,
    provider,
    amountPkr,
    sessionId,
    JSON.stringify({ sandbox: process.env.PAYMENT_SANDBOX_MODE === 'true' })
  );

  return {
    paymentStatus: 'pending_gateway',
    sessionId,
    redirectUrl: null,
    instructions: `Gateway session ${sessionId} created. Payment status remains pending until verified server-side webhook confirmation is received.`,
  };
}

export function verifyWebhookSignature(
  provider: string,
  signatureHeader: string | undefined,
  rawBody: string
): boolean {
  if (!signatureHeader) return false;
  let secret = '';
  if (provider === 'safepay') secret = process.env.SAFEPAY_WEBHOOK_SECRET || '';
  if (provider === 'payfast') secret = process.env.PAYFAST_SECURED_KEY || '';
  if (provider === 'jazzcash') secret = process.env.JAZZCASH_INTEGRITY_SALT || '';
  if (provider === 'easypaisa') secret = process.env.EASYPAISA_HASH_KEY || '';

  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function processVerifiedWebhookEvent(params: {
  provider: string;
  eventId: string;
  eventType: string;
  orderNumber: string;
  transactionRef: string;
  status: 'paid' | 'failed' | 'cancelled';
  rawPayload: string;
}): { duplicate: boolean; updated: boolean } {
  const existing = db.prepare('SELECT id FROM payment_events WHERE provider_event_id = ?').get(params.eventId);
  if (existing) {
    return { duplicate: true, updated: false };
  }

  const order = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(params.orderNumber) as
    | { id: number }
    | undefined;
  if (!order) {
    return { duplicate: false, updated: false };
  }

  const payment = db.prepare('SELECT id FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(order.id) as
    | { id: number }
    | undefined;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO payment_events (payment_id, provider, provider_event_id, event_type, signature_verified, payload_json)
       VALUES (?, ?, ?, ?, 1, ?)`
    ).run(payment?.id ?? null, params.provider, params.eventId, params.eventType, params.rawPayload);

    if (payment) {
      db.prepare(
        `UPDATE payments SET status = ?, transaction_ref = COALESCE(?, transaction_ref), updated_at = datetime('now') WHERE id = ?`
      ).run(params.status, params.transactionRef || null, payment.id);
    }

    const nextOrderStatus = params.status === 'paid' ? 'confirmed' : params.status === 'cancelled' ? 'cancelled' : 'received';
    db.prepare(
      `UPDATE orders SET payment_status = ?, order_status = CASE WHEN order_status = 'received' THEN ? ELSE order_status END, updated_at = datetime('now') WHERE id = ?`
    ).run(params.status, nextOrderStatus, order.id);
  });

  tx();
  return { duplicate: false, updated: true };
}
