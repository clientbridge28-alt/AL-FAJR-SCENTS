import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './server/db.ts';
import { requireAdmin, signAdminToken, rateLimit, type AuthedRequest } from './server/auth.ts';
import {
  getPaymentMethods,
  createPaymentSession,
  verifyWebhookSignature,
  processVerifiedWebhookEvent,
  type PaymentProviderId,
} from './server/payments.ts';

initDatabase();

const app = express();
const PORT = 3000;

// Capture raw body for webhook HMAC verification while parsing JSON
app.use(
  express.json({
    limit: '10mb',
    verify: (req: express.Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(cookieParser());

// Security headers (allow iframe embedding in AI Studio preview via SAMEORIGIN / no DENY)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve uploaded images safely
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper: Load all store settings as key-value object
function getSettingsMap(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM store_settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

// Helper: Attach images to product rows
interface ProductImageRow {
  id: number;
  product_id: number;
  image_url: string;
  alt_text: string;
  shot_type: string;
  sort_order: number;
  is_primary: number;
}

function hydrateProducts(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id as number);
  const placeholders = ids.map(() => '?').join(',');
  const imgs = db
    .prepare(`SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY is_primary DESC, sort_order ASC, id ASC`)
    .all(...ids) as ProductImageRow[];
  const imgMap = new Map<number, ProductImageRow[]>();
  for (const img of imgs) {
    const arr = imgMap.get(img.product_id) || [];
    arr.push(img);
    imgMap.set(img.product_id, arr);
  }
  return rows.map((r) => ({
    ...r,
    images: imgMap.get(r.id as number) || [],
  }));
}

// Helper: Get or create cart ID cookie
function getOrCreateCartId(req: express.Request, res: express.Response): string {
  let cartId = req.cookies?.af_cart_id;
  if (typeof cartId === 'string' && cartId.length >= 16) {
    const exists = db.prepare('SELECT id FROM carts WHERE id = ?').get(cartId);
    if (exists) return cartId;
  }
  cartId = crypto.randomUUID();
  db.prepare('INSERT INTO carts (id) VALUES (?)').run(cartId);
  res.cookie('af_cart_id', cartId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
  return cartId;
}

// Helper: Compute authoritative server-side cart totals
function computeCartState(cartId: string) {
  const cartRow = db.prepare('SELECT id, discount_code FROM carts WHERE id = ?').get(cartId) as
    | { id: string; discount_code: string | null }
    | undefined;
  const settings = getSettingsMap();
  const shippingFee = Math.max(0, Number(settings.shipping_fee_pkr || 250));
  const freeThreshold = Math.max(0, Number(settings.free_shipping_threshold_pkr || 12000));

  const items = db
    .prepare(
      `SELECT ci.product_id, ci.quantity, p.name, p.slug, p.concentration, p.size_ml, p.price_pkr, p.stock_quantity, p.accent_color,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ? AND p.is_visible = 1`
    )
    .all(cartId) as Array<{
    product_id: number;
    quantity: number;
    name: string;
    slug: string;
    concentration: string;
    size_ml: number;
    price_pkr: number;
    stock_quantity: number;
    accent_color: string;
    image_url: string | null;
  }>;

  let subtotal_pkr = 0;
  for (const item of items) {
    subtotal_pkr += item.price_pkr * item.quantity;
  }

  let discount_pkr = 0;
  let applied_discount_code: string | null = null;
  if (cartRow?.discount_code && subtotal_pkr > 0) {
    const codeRow = db
      .prepare(
        `SELECT * FROM discount_codes
         WHERE UPPER(code) = UPPER(?) AND is_active = 1
           AND (expires_at IS NULL OR expires_at = '' OR datetime(expires_at) > datetime('now'))
           AND (max_uses IS NULL OR used_count < max_uses)`
      )
      .get(cartRow.discount_code) as
      | {
          code: string;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          min_order_pkr: number;
        }
      | undefined;

    if (codeRow && subtotal_pkr >= codeRow.min_order_pkr) {
      applied_discount_code = codeRow.code;
      if (codeRow.discount_type === 'percentage') {
        discount_pkr = Math.round((subtotal_pkr * Math.min(100, codeRow.discount_value)) / 100);
      } else {
        discount_pkr = Math.min(subtotal_pkr, codeRow.discount_value);
      }
    }
  }

  const afterDiscount = Math.max(0, subtotal_pkr - discount_pkr);
  const shipping_pkr = items.length === 0 ? 0 : afterDiscount >= freeThreshold ? 0 : shippingFee;
  const total_pkr = afterDiscount + shipping_pkr;

  return {
    items,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal_pkr,
    discount_code: applied_discount_code,
    discount_pkr,
    shipping_pkr,
    free_shipping_threshold_pkr: freeThreshold,
    total_pkr,
  };
}

function sanitizeText(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

// =======================
// PUBLIC API ROUTES
// =======================

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'al-fajr-scents' });
});

app.get('/api/storefront', (_req, res) => {
  const settings = getSettingsMap();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  const featuredRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_visible = 1 AND p.is_featured = 1
       ORDER BY p.id ASC`
    )
    .all() as Record<string, unknown>[];

  // Best sellers strictly derived from real non-cancelled order_items sales data
  const bestSellerIds = db
    .prepare(
      `SELECT oi.product_id, SUM(oi.quantity) as total_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status != 'cancelled'
       GROUP BY oi.product_id
       HAVING total_sold > 0
       ORDER BY total_sold DESC
       LIMIT 4`
    )
    .all() as { product_id: number; total_sold: number }[];

  let bestSellers: Record<string, unknown>[] = [];
  if (bestSellerIds.length > 0) {
    const ids = bestSellerIds.map((b) => b.product_id);
    const placeholders = ids.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id IN (${placeholders}) AND p.is_visible = 1`
      )
      .all(...ids) as Record<string, unknown>[];
    bestSellers = hydrateProducts(rows);
  }

  // Genuine approved reviews only
  const recentReviews = db
    .prepare(
      `SELECT r.id, r.reviewer_name, r.reviewer_city, r.rating, r.title, r.comment, r.is_verified_purchase, r.created_at,
              p.name as product_name, p.slug as product_slug
       FROM reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.is_approved = 1
       ORDER BY r.created_at DESC
       LIMIT 6`
    )
    .all();

  const paymentMethods = getPaymentMethods(settings);

  res.json({
    settings,
    categories,
    featuredProducts: hydrateProducts(featuredRows),
    bestSellers,
    recentReviews,
    paymentMethods,
  });
});

app.get('/api/products', (req, res) => {
  const q = sanitizeText(req.query.q, 100);
  const category = sanitizeText(req.query.category, 60);
  const family = sanitizeText(req.query.family, 60);
  const inStockOnly = req.query.inStock === 'true';
  const minPrice = Number(req.query.minPrice || 0);
  const maxPrice = Number(req.query.maxPrice || 0);
  const sort = sanitizeText(req.query.sort, 30);

  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_visible = 1
  `;
  const params: unknown[] = [];

  if (q) {
    sql += ` AND (p.name LIKE ? OR p.subtitle LIKE ? OR p.fragrance_family LIKE ? OR p.scent_profile LIKE ? OR p.top_notes LIKE ? OR p.heart_notes LIKE ? OR p.base_notes LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like, like);
  }
  if (category && category !== 'all') {
    sql += ` AND c.slug = ?`;
    params.push(category);
  }
  if (family && family !== 'all') {
    sql += ` AND LOWER(p.fragrance_family) LIKE ?`;
    params.push(`%${family.toLowerCase()}%`);
  }
  if (inStockOnly) {
    sql += ` AND p.stock_quantity > 0`;
  }
  if (minPrice > 0) {
    sql += ` AND p.price_pkr >= ?`;
    params.push(minPrice);
  }
  if (maxPrice > 0) {
    sql += ` AND p.price_pkr <= ?`;
    params.push(maxPrice);
  }

  if (sort === 'price_asc') sql += ' ORDER BY p.price_pkr ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price_pkr DESC';
  else if (sort === 'newest') sql += ' ORDER BY p.created_at DESC';
  else sql += ' ORDER BY p.is_featured DESC, p.id ASC';

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  res.json({ products: hydrateProducts(rows) });
});

app.get('/api/products/:slug', (req, res) => {
  const slug = sanitizeText(req.params.slug, 100);
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.is_visible = 1`
    )
    .get(slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Fragrance not found' });
    return;
  }

  const [product] = hydrateProducts([row]);
  const reviews = db
    .prepare(
      `SELECT id, reviewer_name, reviewer_city, rating, title, comment, is_verified_purchase, created_at
       FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC`
    )
    .all(row.id as number);

  const relatedRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_visible = 1 AND p.id != ?
       ORDER BY (p.category_id = ?) DESC, p.is_featured DESC
       LIMIT 3`
    )
    .all(row.id as number, row.category_id as number | null) as Record<string, unknown>[];

  res.json({
    product,
    reviews,
    relatedProducts: hydrateProducts(relatedRows),
  });
});

app.get('/api/journal', (_req, res) => {
  const articles = db.prepare('SELECT * FROM journal_articles ORDER BY id ASC').all();
  res.json({ articles });
});

app.get('/api/journal/:slug', (req, res) => {
  const slug = sanitizeText(req.params.slug, 120);
  const article = db.prepare('SELECT * FROM journal_articles WHERE slug = ?').get(slug);
  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  res.json({ article });
});

// Cart endpoints
app.get('/api/cart', (req, res) => {
  const cartId = getOrCreateCartId(req, res);
  res.json(computeCartState(cartId));
});

app.post('/api/cart/items', (req, res) => {
  const cartId = getOrCreateCartId(req, res);
  const productId = Number(req.body?.productId);
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(req.body?.quantity || 1))));

  const product = db
    .prepare('SELECT id, stock_quantity, is_visible FROM products WHERE id = ?')
    .get(productId) as { id: number; stock_quantity: number; is_visible: number } | undefined;

  if (!product || !product.is_visible) {
    res.status(404).json({ error: 'Product not available' });
    return;
  }

  const existing = db
    .prepare('SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?')
    .get(cartId, productId) as { quantity: number } | undefined;
  const targetQty = (existing?.quantity || 0) + quantity;

  if (targetQty > product.stock_quantity) {
    res.status(400).json({ error: `Only ${product.stock_quantity} unit(s) currently in stock.` });
    return;
  }

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?').run(targetQty, cartId, productId);
  } else {
    db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(cartId, productId, targetQty);
  }

  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cartId);
  res.json(computeCartState(cartId));
});

app.patch('/api/cart/items/:productId', (req, res) => {
  const cartId = getOrCreateCartId(req, res);
  const productId = Number(req.params.productId);
  const quantity = Math.floor(Number(req.body?.quantity || 0));

  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);
    res.json(computeCartState(cartId));
    return;
  }

  const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ? AND is_visible = 1').get(productId) as
    | { stock_quantity: number }
    | undefined;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  if (quantity > product.stock_quantity) {
    res.status(400).json({ error: `Only ${product.stock_quantity} unit(s) available in stock.` });
    return;
  }

  db.prepare('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?').run(quantity, cartId, productId);
  res.json(computeCartState(cartId));
});

app.delete('/api/cart/items/:productId', (req, res) => {
  const cartId = getOrCreateCartId(req, res);
  const productId = Number(req.params.productId);
  db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);
  res.json(computeCartState(cartId));
});

app.post('/api/cart/apply-discount', (req, res) => {
  const cartId = getOrCreateCartId(req, res);
  const code = sanitizeText(req.body?.code, 40).toUpperCase();

  if (!code) {
    db.prepare('UPDATE carts SET discount_code = NULL WHERE id = ?').run(cartId);
    res.json({ ...computeCartState(cartId), message: 'Discount cleared.' });
    return;
  }

  const codeRow = db
    .prepare(
      `SELECT * FROM discount_codes
       WHERE UPPER(code) = ? AND is_active = 1
         AND (expires_at IS NULL OR expires_at = '' OR datetime(expires_at) > datetime('now'))
         AND (max_uses IS NULL OR used_count < max_uses)`
    )
    .get(code) as { code: string; min_order_pkr: number } | undefined;

  if (!codeRow) {
    res.status(400).json({ error: 'Invalid or expired discount code.' });
    return;
  }

  const current = computeCartState(cartId);
  if (current.subtotal_pkr < codeRow.min_order_pkr) {
    res.status(400).json({ error: `Minimum order of PKR ${codeRow.min_order_pkr.toLocaleString()} required for this code.` });
    return;
  }

  db.prepare('UPDATE carts SET discount_code = ? WHERE id = ?').run(codeRow.code, cartId);
  res.json({ ...computeCartState(cartId), message: `Code ${codeRow.code} applied.` });
});

// Checkout & Order Creation (server-authoritative prices, stock transaction, idempotency)
app.post('/api/orders', rateLimit(15, 60_000), (req, res) => {
  const cartId = getOrCreateCartId(req, res);
  const fullName = sanitizeText(req.body?.fullName, 120);
  const phone = sanitizeText(req.body?.phone, 30);
  const email = sanitizeText(req.body?.email, 120);
  const city = sanitizeText(req.body?.city, 80);
  const deliveryAddress = sanitizeText(req.body?.deliveryAddress, 400);
  const orderNotes = sanitizeText(req.body?.orderNotes, 400);
  const paymentMethod = sanitizeText(req.body?.paymentMethod, 30) as PaymentProviderId;
  const transactionRef = sanitizeText(req.body?.transactionRef, 100);
  const idempotencyKey = sanitizeText(req.body?.idempotencyKey, 80) || crypto.randomUUID();
  const directItems = Array.isArray(req.body?.items) ? req.body.items : null;

  if (!fullName || fullName.length < 2) {
    res.status(400).json({ error: 'Please enter your full name.' });
    return;
  }
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    res.status(400).json({ error: 'Please enter a valid Pakistani mobile or phone number.' });
    return;
  }
  if (!city || !deliveryAddress || deliveryAddress.length < 8) {
    res.status(400).json({ error: 'Please enter your city and complete delivery address.' });
    return;
  }

  const settings = getSettingsMap();
  const allowedProviders = getPaymentMethods(settings).filter((m) => m.enabled);
  if (!allowedProviders.some((p) => p.id === paymentMethod)) {
    res.status(400).json({ error: 'Selected payment method is not currently enabled.' });
    return;
  }

  // Idempotency protection: return existing order if key already processed
  const existingOrder = db
    .prepare('SELECT order_number, payment_method, payment_status, total_pkr FROM orders WHERE idempotency_key = ?')
    .get(idempotencyKey) as
    | { order_number: string; payment_method: string; payment_status: string; total_pkr: number }
    | undefined;
  if (existingOrder) {
    res.json({ order: existingOrder, duplicate: true });
    return;
  }

  try {
    const result = db.transaction(() => {
      const cartState = computeCartState(cartId);
      let lineRequests: { product_id: number; quantity: number }[] = [];

      if (cartState.items.length > 0) {
        lineRequests = cartState.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
      } else if (directItems && directItems.length > 0) {
        lineRequests = directItems.map((i: { productId: number; quantity: number }) => ({
          product_id: Number(i.productId),
          quantity: Math.max(1, Math.min(20, Math.floor(Number(i.quantity || 1)))),
        }));
      }

      if (lineRequests.length === 0) {
        throw new Error('Your shopping bag is empty.');
      }

      // Server-side authoritative product lookup & stock lock check
      let subtotal_pkr = 0;
      const validatedLines: Array<{
        product_id: number;
        name: string;
        slug: string;
        size_ml: number;
        unit_price_pkr: number;
        quantity: number;
        line_total_pkr: number;
      }> = [];

      for (const reqItem of lineRequests) {
        const prod = db
          .prepare('SELECT id, name, slug, size_ml, price_pkr, stock_quantity, is_visible FROM products WHERE id = ?')
          .get(reqItem.product_id) as
          | {
              id: number;
              name: string;
              slug: string;
              size_ml: number;
              price_pkr: number;
              stock_quantity: number;
              is_visible: number;
            }
          | undefined;

        if (!prod || !prod.is_visible) {
          throw new Error('One or more selected fragrances are no longer available.');
        }
        if (prod.stock_quantity < reqItem.quantity) {
          throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.stock_quantity}.`);
        }

        const lineTotal = prod.price_pkr * reqItem.quantity;
        subtotal_pkr += lineTotal;
        validatedLines.push({
          product_id: prod.id,
          name: prod.name,
          slug: prod.slug,
          size_ml: prod.size_ml,
          unit_price_pkr: prod.price_pkr,
          quantity: reqItem.quantity,
          line_total_pkr: lineTotal,
        });

        db.prepare("UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime('now') WHERE id = ?").run(
          reqItem.quantity,
          prod.id
        );
      }

      // Server-side discount verification
      let discount_pkr = 0;
      let appliedCode: string | null = null;
      const requestedCode = sanitizeText(req.body?.discountCode, 40) || cartState.discount_code || '';
      if (requestedCode) {
        const codeRow = db
          .prepare(
            `SELECT * FROM discount_codes
             WHERE UPPER(code) = UPPER(?) AND is_active = 1
               AND (expires_at IS NULL OR expires_at = '' OR datetime(expires_at) > datetime('now'))
               AND (max_uses IS NULL OR used_count < max_uses)`
          )
          .get(requestedCode) as
          | {
              id: number;
              code: string;
              discount_type: 'percentage' | 'fixed';
              discount_value: number;
              min_order_pkr: number;
            }
          | undefined;

        if (codeRow && subtotal_pkr >= codeRow.min_order_pkr) {
          appliedCode = codeRow.code;
          discount_pkr =
            codeRow.discount_type === 'percentage'
              ? Math.round((subtotal_pkr * Math.min(100, codeRow.discount_value)) / 100)
              : Math.min(subtotal_pkr, codeRow.discount_value);
          db.prepare('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?').run(codeRow.id);
        }
      }

      const shippingFee = Math.max(0, Number(settings.shipping_fee_pkr || 250));
      const freeThreshold = Math.max(0, Number(settings.free_shipping_threshold_pkr || 12000));
      const afterDiscount = Math.max(0, subtotal_pkr - discount_pkr);
      const shipping_pkr = afterDiscount >= freeThreshold ? 0 : shippingFee;
      const total_pkr = afterDiscount + shipping_pkr;

      // Upsert customer
      const normalizedPhone = phone.replace(/\s+/g, '');
      let customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(normalizedPhone) as
        | { id: number }
        | undefined;
      if (!customer) {
        const cRes = db
          .prepare('INSERT INTO customers (full_name, phone, email) VALUES (?, ?, ?)')
          .run(fullName, normalizedPhone, email || null);
        customer = { id: Number(cRes.lastInsertRowid) };
      } else {
        db.prepare("UPDATE customers SET full_name = ?, email = COALESCE(NULLIF(?, ''), email), updated_at = datetime('now') WHERE id = ?").run(
          fullName,
          email,
          customer.id
        );
      }

      db.prepare('INSERT INTO customer_addresses (customer_id, city, address_line) VALUES (?, ?, ?)').run(
        customer.id,
        city,
        deliveryAddress
      );

      const orderNumber = `AF-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const trackingReference = `TRK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const oRes = db
        .prepare(
          `INSERT INTO orders (
            order_number, idempotency_key, customer_id, customer_name, customer_phone, customer_email,
            city, delivery_address, order_notes, subtotal_pkr, discount_code, discount_pkr, shipping_pkr, total_pkr,
            payment_method, payment_status, order_status, tracking_reference
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'received', ?)`
        )
        .run(
          orderNumber,
          idempotencyKey,
          customer.id,
          fullName,
          normalizedPhone,
          email || null,
          city,
          deliveryAddress,
          orderNotes,
          subtotal_pkr,
          appliedCode,
          discount_pkr,
          shipping_pkr,
          total_pkr,
          paymentMethod,
          trackingReference
        );

      const orderId = Number(oRes.lastInsertRowid);
      const insertOrderItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, product_slug, size_ml, unit_price_pkr, quantity, line_total_pkr)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const line of validatedLines) {
        insertOrderItem.run(
          orderId,
          line.product_id,
          line.name,
          line.slug,
          line.size_ml,
          line.unit_price_pkr,
          line.quantity,
          line.line_total_pkr
        );
      }

      const paymentSession = createPaymentSession({
        orderId,
        orderNumber,
        provider: paymentMethod,
        amountPkr: total_pkr,
        transactionRef,
        settings,
      });

      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(paymentSession.paymentStatus, orderId);

      // Clear cart
      db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
      db.prepare('UPDATE carts SET discount_code = NULL WHERE id = ?').run(cartId);

      return {
        order: {
          order_number: orderNumber,
          tracking_reference: trackingReference,
          customer_name: fullName,
          customer_phone: normalizedPhone,
          city,
          delivery_address: deliveryAddress,
          subtotal_pkr,
          discount_pkr,
          shipping_pkr,
          total_pkr,
          payment_method: paymentMethod,
          payment_status: paymentSession.paymentStatus,
          order_status: 'received',
          items: validatedLines,
          created_at: new Date().toISOString(),
        },
        paymentSession,
      };
    })();

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to place order.' });
  }
});

// Order Tracking (requires orderNumber + phone verification)
app.get('/api/orders/track', rateLimit(30, 60_000), (req, res) => {
  const orderNumber = sanitizeText(req.query.orderNumber, 40).toUpperCase();
  const phone = sanitizeText(req.query.phone, 30).replace(/\D/g, '');

  if (!orderNumber || phone.length < 4) {
    res.status(400).json({ error: 'Please enter both your Order Number and phone number.' });
    return;
  }

  const order = db.prepare('SELECT * FROM orders WHERE UPPER(order_number) = ?').get(orderNumber) as
    | Record<string, unknown>
    | undefined;

  if (!order) {
    res.status(404).json({ error: 'No matching order found. Please verify your order number.' });
    return;
  }

  const storedPhoneDigits = String(order.customer_phone || '').replace(/\D/g, '');
  if (!storedPhoneDigits.endsWith(phone.slice(-4)) && storedPhoneDigits !== phone) {
    res.status(403).json({ error: 'Phone number does not match our records for this order.' });
    return;
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id as number);
  res.json({
    order: {
      order_number: order.order_number,
      tracking_reference: order.tracking_reference,
      customer_name: order.customer_name,
      city: order.city,
      subtotal_pkr: order.subtotal_pkr,
      discount_pkr: order.discount_pkr,
      shipping_pkr: order.shipping_pkr,
      total_pkr: order.total_pkr,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items,
    },
  });
});

// Customer Review Submission (star rating + text feedback; optional order number verifies purchase)
app.post('/api/reviews', rateLimit(10, 60_000), (req, res) => {
  const productId = Number(req.body?.productId);
  const orderNumber = sanitizeText(req.body?.orderNumber, 40).toUpperCase();
  const reviewerName = sanitizeText(req.body?.reviewerName, 80);
  const reviewerCity = sanitizeText(req.body?.reviewerCity, 60);
  const rawRating = Number(req.body?.rating);
  const rating = Number.isFinite(rawRating) ? Math.max(1, Math.min(5, Math.floor(rawRating))) : 5;
  const title = sanitizeText(req.body?.title, 120);
  const comment = sanitizeText(req.body?.comment, 800);

  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: 'Valid fragrance selection is required.' });
    return;
  }

  const product = db
    .prepare('SELECT id FROM products WHERE id = ? AND is_visible = 1')
    .get(productId) as { id: number } | undefined;

  if (!product) {
    res.status(404).json({ error: 'Fragrance not found.' });
    return;
  }

  if (!reviewerName || reviewerName.length < 2) {
    res.status(400).json({ error: 'Please enter your name (at least 2 characters).' });
    return;
  }
  if (!comment || comment.length < 5) {
    res.status(400).json({ error: 'Please share at least a brief written impression (5+ characters).' });
    return;
  }

  let orderId: number | null = null;
  let isVerifiedPurchase = 0;

  if (orderNumber) {
    const order = db
      .prepare(
        `SELECT o.id FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE UPPER(o.order_number) = ? AND oi.product_id = ? AND o.order_status != 'cancelled'`
      )
      .get(orderNumber, productId) as { id: number } | undefined;

    if (!order) {
      res.status(403).json({
        error: 'No matching order found for this fragrance. Clear the Order # field to post as a standard review.',
      });
      return;
    }
    orderId = order.id;
    isVerifiedPurchase = 1;
  }

  const info = db
    .prepare(
      `INSERT INTO reviews (product_id, order_id, reviewer_name, reviewer_city, rating, title, comment, is_verified_purchase, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(productId, orderId, reviewerName, reviewerCity, rating, title, comment, isVerifiedPurchase);

  const createdReview = db
    .prepare(
      `SELECT id, reviewer_name, reviewer_city, rating, title, comment, is_verified_purchase, created_at
       FROM reviews WHERE id = ?`
    )
    .get(Number(info.lastInsertRowid));

  res.status(201).json({
    message: isVerifiedPurchase
      ? 'Thank you. Your verified purchase review has been published.'
      : 'Thank you. Your review has been published.',
    review: createdReview,
  });
});

app.post('/api/newsletter', rateLimit(15, 60_000), (req, res) => {
  const email = sanitizeText(req.body?.email, 120).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(email);
  if (existing) {
    res.json({
      message: 'This email is already subscribed to Al Fajr Scents updates.',
      alreadySubscribed: true,
    });
    return;
  }
  db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)').run(email);
  res.status(201).json({
    message: 'You are subscribed to Al Fajr Scents marketing updates and new releases.',
  });
});

app.post('/api/contact', rateLimit(10, 60_000), (req, res) => {
  const name = sanitizeText(req.body?.name, 100);
  const email = sanitizeText(req.body?.email, 120);
  const phone = sanitizeText(req.body?.phone, 30);
  const subject = sanitizeText(req.body?.subject, 140);
  const message = sanitizeText(req.body?.message, 1500);

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'Please fill in all required inquiry fields.' });
    return;
  }
  db.prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)').run(
    name,
    email,
    phone,
    subject,
    message
  );
  res.status(201).json({ message: 'Your message has been received by our concierge team.' });
});

// Payment Gateway Webhook Endpoint (signature-verified + idempotent)
app.post('/api/payments/webhook/:provider', (req: express.Request & { rawBody?: string }, res) => {
  const provider = sanitizeText(req.params.provider, 30);
  const sigHeader = (req.headers['x-signature'] || req.headers['x-sf-signature'] || req.headers['x-webhook-signature']) as
    | string
    | undefined;
  const rawBody = req.rawBody || JSON.stringify(req.body || {});

  if (!verifyWebhookSignature(provider, sigHeader, rawBody)) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  const eventId = sanitizeText(req.body?.event_id || req.body?.id, 100);
  const eventType = sanitizeText(req.body?.event_type || 'payment.updated', 60);
  const orderNumber = sanitizeText(req.body?.order_number, 60).toUpperCase();
  const transactionRef = sanitizeText(req.body?.transaction_ref, 100);
  const status = req.body?.status === 'paid' ? 'paid' : req.body?.status === 'cancelled' ? 'cancelled' : 'failed';

  if (!eventId || !orderNumber) {
    res.status(400).json({ error: 'Missing event_id or order_number' });
    return;
  }

  const outcome = processVerifiedWebhookEvent({
    provider,
    eventId,
    eventType,
    orderNumber,
    transactionRef,
    status,
    rawPayload: rawBody,
  });

  res.json({ ok: true, ...outcome });
});

// =======================
// ADMIN AUTH & DASHBOARD API
// =======================

app.get('/api/admin/setup-status', (_req, res) => {
  const count = (db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number }).c;
  res.json({ needsInitialSetup: count === 0 });
});

app.post('/api/admin/setup', rateLimit(5, 60_000), (req, res) => {
  const count = (db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number }).c;
  if (count > 0) {
    res.status(403).json({ error: 'Initial setup already completed. Please sign in.' });
    return;
  }
  const email = sanitizeText(req.body?.email, 120).toLowerCase();
  const name = sanitizeText(req.body?.name, 80) || 'Store Administrator';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please provide a valid administrator email.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(email, name, hash, 'super_admin');

  const payload = { id: Number(info.lastInsertRowid), email, name, role: 'super_admin' };
  const token = signAdminToken(payload);
  res.cookie('af_admin_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 });
  res.status(201).json({ admin: payload });
});

app.post('/api/admin/login', rateLimit(10, 60_000), (req, res) => {
  const email = sanitizeText(req.body?.email, 120).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as
    | { id: number; email: string; name: string; password_hash: string; role: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const payload = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signAdminToken(payload);
  res.cookie('af_admin_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 });
  res.json({ admin: payload });
});

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('af_admin_token');
  res.json({ ok: true });
});

app.get('/api/admin/me', requireAdmin, (req: AuthedRequest, res) => {
  res.json({ admin: req.admin });
});

app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN total_pkr ELSE 0 END) as verified_paid_revenue_pkr,
        SUM(CASE WHEN order_status IN ('received', 'processing', 'confirmed') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
       FROM orders`
    )
    .get();

  const bestSelling = db
    .prepare(
      `SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as units_sold, SUM(oi.line_total_pkr) as gross_pkr
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status != 'cancelled'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY units_sold DESC
       LIMIT 5`
    )
    .all();

  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  const unverifiedProducts = (db.prepare('SELECT COUNT(*) as c FROM products WHERE is_verified_data = 0').get() as { c: number }).c;
  const subscriberCount = (db.prepare('SELECT COUNT(*) as c FROM newsletter_subscribers').get() as { c: number }).c;
  const contactCount = (db.prepare('SELECT COUNT(*) as c FROM contact_messages').get() as { c: number }).c;

  res.json({
    totals,
    bestSelling,
    productCount,
    unverifiedProducts,
    subscriberCount,
    contactCount,
  });
});

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id ASC`
    )
    .all() as Record<string, unknown>[];
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  res.json({ products: hydrateProducts(rows), categories });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const body = req.body || {};
  const name = sanitizeText(body.name, 120);
  const slug = (sanitizeText(body.slug, 120) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
  if (!name || !slug) {
    res.status(400).json({ error: 'Product name and slug are required.' });
    return;
  }

  try {
    const prodId = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO products (
            category_id, name, slug, subtitle, concentration, size_ml, price_pkr, stock_quantity,
            fragrance_family, scent_profile, top_notes, heart_notes, base_notes, longevity_claim,
            accent_color, description, story, seo_title, seo_description, is_visible, is_featured, is_verified_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          body.category_id ? Number(body.category_id) : null,
          name,
          slug,
          sanitizeText(body.subtitle, 200),
          sanitizeText(body.concentration, 60) || 'Eau de Parfum',
          Math.max(1, Number(body.size_ml || 50)),
          Math.max(0, Math.round(Number(body.price_pkr || 0))),
          Math.max(0, Math.round(Number(body.stock_quantity || 0))),
          sanitizeText(body.fragrance_family, 100),
          sanitizeText(body.scent_profile, 150),
          sanitizeText(body.top_notes, 200),
          sanitizeText(body.heart_notes, 200),
          sanitizeText(body.base_notes, 200),
          sanitizeText(body.longevity_claim, 150),
          sanitizeText(body.accent_color, 20) || '#173A55',
          sanitizeText(body.description, 2000),
          sanitizeText(body.story, 2000),
          sanitizeText(body.seo_title, 160) || `${name} | Al Fajr Scents`,
          sanitizeText(body.seo_description, 300),
          body.is_visible ? 1 : 0,
          body.is_featured ? 1 : 0,
          body.is_verified_data ? 1 : 0
        );

      const id = Number(info.lastInsertRowid);
      const images = Array.isArray(body.images) ? body.images : [];
      const insertImg = db.prepare(
        'INSERT INTO product_images (product_id, image_url, alt_text, shot_type, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)'
      );
      images.forEach((img: { image_url: string; alt_text?: string; shot_type?: string }, idx: number) => {
        if (img?.image_url) {
          insertImg.run(id, img.image_url, sanitizeText(img.alt_text, 200) || name, img.shot_type || 'campaign', idx, idx === 0 ? 1 : 0);
        }
      });
      return id;
    })();

    res.status(201).json({ id: prodId });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to create product.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  try {
    db.transaction(() => {
      db.prepare(
        `UPDATE products SET
          category_id = ?, name = ?, slug = ?, subtitle = ?, concentration = ?, size_ml = ?,
          price_pkr = ?, stock_quantity = ?, fragrance_family = ?, scent_profile = ?,
          top_notes = ?, heart_notes = ?, base_notes = ?, longevity_claim = ?, accent_color = ?,
          description = ?, story = ?, seo_title = ?, seo_description = ?,
          is_visible = ?, is_featured = ?, is_verified_data = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        body.category_id ? Number(body.category_id) : null,
        sanitizeText(body.name, 120),
        sanitizeText(body.slug, 120),
        sanitizeText(body.subtitle, 200),
        sanitizeText(body.concentration, 60) || 'Eau de Parfum',
        Math.max(1, Number(body.size_ml || 50)),
        Math.max(0, Math.round(Number(body.price_pkr || 0))),
        Math.max(0, Math.round(Number(body.stock_quantity || 0))),
        sanitizeText(body.fragrance_family, 100),
        sanitizeText(body.scent_profile, 150),
        sanitizeText(body.top_notes, 200),
        sanitizeText(body.heart_notes, 200),
        sanitizeText(body.base_notes, 200),
        sanitizeText(body.longevity_claim, 150),
        sanitizeText(body.accent_color, 20) || '#173A55',
        sanitizeText(body.description, 2000),
        sanitizeText(body.story, 2000),
        sanitizeText(body.seo_title, 160),
        sanitizeText(body.seo_description, 300),
        body.is_visible ? 1 : 0,
        body.is_featured ? 1 : 0,
        body.is_verified_data ? 1 : 0,
        id
      );

      if (Array.isArray(body.images)) {
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
        const insertImg = db.prepare(
          'INSERT INTO product_images (product_id, image_url, alt_text, shot_type, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)'
        );
        body.images.forEach((img: { image_url: string; alt_text?: string; shot_type?: string }, idx: number) => {
          if (img?.image_url) {
            insertImg.run(
              id,
              img.image_url,
              sanitizeText(img.alt_text, 200) || sanitizeText(body.name, 120),
              img.shot_type || 'campaign',
              idx,
              idx === 0 ? 1 : 0
            );
          }
        });
      }
    })();

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to update product.' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch {
    // If referenced by historical order_items, hide instead of breaking foreign keys
    db.prepare("UPDATE products SET is_visible = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    res.json({ ok: true, archived: true });
  }
});

// Admin safe image upload (base64 data URI -> /public/uploads/)
app.post('/api/admin/upload', requireAdmin, (req, res) => {
  const { filename, dataUrl } = req.body || {};
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    res.status(400).json({ error: 'Invalid image payload.' });
    return;
  }
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: 'Only PNG, JPG, and WebP images are allowed.' });
    return;
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: 'Image must be smaller than 5 MB.' });
    return;
  }
  const safeBase = sanitizeText(filename || 'bottle', 40)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const outName = `${safeBase}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
  res.json({ url: `/uploads/${outName}` });
});

// Admin Order Management
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const status = sanitizeText(req.query.status, 30);
  const q = sanitizeText(req.query.q, 80);

  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: unknown[] = [];
  if (status && status !== 'all') {
    sql += ' AND order_status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR city LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY created_at DESC';

  const orders = db.prepare(sql).all(...params) as Record<string, unknown>[];
  const hydrated = orders.map((o) => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id as number),
    payment: db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(o.id as number),
  }));

  res.json({ orders: hydrated });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const orderStatus = sanitizeText(req.body?.order_status, 30);
  const paymentStatus = sanitizeText(req.body?.payment_status, 40);
  const allowedStatuses = ['received', 'processing', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

  const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as
    | { id: number; order_status: string; payment_status: string }
    | undefined;
  if (!current) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  db.transaction(() => {
    if (orderStatus && allowedStatuses.includes(orderStatus)) {
      // Restore stock if transitioning to cancelled from non-cancelled
      if (orderStatus === 'cancelled' && current.order_status !== 'cancelled') {
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id) as {
          product_id: number;
          quantity: number;
        }[];
        for (const item of items) {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(
            item.quantity,
            item.product_id
          );
        }
      }
      db.prepare("UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?").run(orderStatus, id);
    }

    if (paymentStatus && ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      db.prepare("UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?").run(paymentStatus, id);
      db.prepare("UPDATE payments SET status = ?, updated_at = datetime('now') WHERE order_id = ?").run(paymentStatus, id);
    }
  })();

  res.json({ ok: true });
});

// Admin Customers
app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const customers = db
    .prepare(
      `SELECT c.*,
        COUNT(o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_pkr ELSE 0 END), 0) as lifetime_pkr,
        MAX(o.created_at) as last_order_at
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id
       ORDER BY last_order_at DESC`
    )
    .all();
  res.json({ customers });
});

// Admin Discounts
app.get('/api/admin/discounts', requireAdmin, (_req, res) => {
  const discounts = db.prepare('SELECT * FROM discount_codes ORDER BY id DESC').all();
  res.json({ discounts });
});

app.post('/api/admin/discounts', requireAdmin, (req, res) => {
  const code = sanitizeText(req.body?.code, 40).toUpperCase();
  const discountType = req.body?.discount_type === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Math.max(1, Math.round(Number(req.body?.discount_value || 0)));
  const minOrder = Math.max(0, Math.round(Number(req.body?.min_order_pkr || 0)));
  const maxUses = req.body?.max_uses ? Math.max(1, Math.round(Number(req.body.max_uses))) : null;
  const expiresAt = sanitizeText(req.body?.expires_at, 40) || null;

  if (!code) {
    res.status(400).json({ error: 'Discount code is required.' });
    return;
  }

  try {
    db.prepare(
      `INSERT INTO discount_codes (code, discount_type, discount_value, min_order_pkr, max_uses, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(code, discountType, discountValue, minOrder, maxUses, expiresAt);
    res.status(201).json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Code already exists or invalid values.' });
  }
});

app.patch('/api/admin/discounts/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const isActive = req.body?.is_active ? 1 : 0;
  db.prepare('UPDATE discount_codes SET is_active = ? WHERE id = ?').run(isActive, id);
  res.json({ ok: true });
});

app.delete('/api/admin/discounts/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM discount_codes WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Admin Reviews Moderation
app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  const reviews = db
    .prepare(
      `SELECT r.*, p.name as product_name FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC`
    )
    .all();
  res.json({ reviews });
});

app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const isApproved = req.body?.is_approved ? 1 : 0;
  db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?').run(isApproved, id);
  res.json({ ok: true });
});

// Admin Store Settings & Inquiries
app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  const settings = getSettingsMap();
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 50').all();
  res.json({ settings, messages });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const updates = req.body?.settings;
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Invalid settings payload' });
    return;
  }
  const upsert = db.prepare(
    `INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  db.transaction(() => {
    for (const [k, v] of Object.entries(updates)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        upsert.run(sanitizeText(k, 80), String(v).slice(0, 1000));
      }
    }
  })();
  res.json({ ok: true, settings: getSettingsMap() });
});

// =======================
// TECHNICAL SEO ENDPOINTS
// =======================

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const staticPaths = [
    '/',
    '/shop',
    '/discover',
    '/our-story',
    '/journal',
    '/track-order',
    '/about',
    '/contact',
    '/faq',
    '/shipping-policy',
    '/returns-policy',
    '/privacy-policy',
    '/terms',
  ];
  const products = db.prepare('SELECT slug, updated_at FROM products WHERE is_visible = 1').all() as {
    slug: string;
    updated_at: string;
  }[];
  const articles = db.prepare('SELECT slug, published_at FROM journal_articles').all() as {
    slug: string;
    published_at: string;
  }[];

  const urls = [
    ...staticPaths.map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq></url>`),
    ...products.map(
      (p) =>
        `<url><loc>${baseUrl}/products/${p.slug}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`
    ),
    ...articles.map(
      (a) =>
        `<url><loc>${baseUrl}/journal/${a.slug}</loc><lastmod>${a.published_at.slice(0, 10)}</lastmod><changefreq>monthly</changefreq></url>`
    ),
  ];

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
  );
});

app.get('/api/merchant-feed.xml', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
       FROM products p WHERE p.is_visible = 1`
    )
    .all() as Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
    price_pkr: number;
    stock_quantity: number;
    image_url: string | null;
  }>;

  const itemsXml = rows
    .map(
      (p) => `<item>
  <g:id>${p.id}</g:id>
  <g:title><![CDATA[${p.name} Eau de Parfum 50ml]]></g:title>
  <g:description><![CDATA[${p.description}]]></g:description>
  <g:link>${baseUrl}/products/${p.slug}</g:link>
  <g:image_link>${baseUrl}${p.image_url || ''}</g:image_link>
  <g:availability>${p.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
  <g:price>${p.price_pkr} PKR</g:price>
  <g:brand>Al Fajr Scents</g:brand>
  <g:condition>new</g:condition>
</item>`
    )
    .join('\n');

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n<channel>\n<title>Al Fajr Scents Product Feed</title>\n<link>${baseUrl}</link>\n${itemsXml}\n</channel>\n</rss>`
  );
});

// =======================
// VITE / STATIC SERVING
// =======================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Al Fajr Scents server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
