import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'alfajr.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      subtitle TEXT NOT NULL DEFAULT '',
      concentration TEXT NOT NULL DEFAULT 'Eau de Parfum',
      size_ml INTEGER NOT NULL DEFAULT 50,
      price_pkr INTEGER NOT NULL CHECK(price_pkr >= 0),
      compare_at_price_pkr INTEGER,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
      fragrance_family TEXT NOT NULL DEFAULT 'Amber Woody',
      scent_profile TEXT NOT NULL DEFAULT '',
      top_notes TEXT NOT NULL DEFAULT '',
      heart_notes TEXT NOT NULL DEFAULT '',
      base_notes TEXT NOT NULL DEFAULT '',
      longevity_claim TEXT NOT NULL DEFAULT '',
      accent_color TEXT NOT NULL DEFAULT '#173A55',
      description TEXT NOT NULL DEFAULT '',
      story TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      is_visible INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_verified_data INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      shot_type TEXT NOT NULL DEFAULT 'campaign',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      city TEXT NOT NULL,
      address_line TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      discount_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      UNIQUE(cart_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS discount_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
      discount_value INTEGER NOT NULL CHECK(discount_value > 0),
      min_order_pkr INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      idempotency_key TEXT UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      city TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      order_notes TEXT DEFAULT '',
      subtotal_pkr INTEGER NOT NULL CHECK(subtotal_pkr >= 0),
      discount_code TEXT,
      discount_pkr INTEGER NOT NULL DEFAULT 0 CHECK(discount_pkr >= 0),
      shipping_pkr INTEGER NOT NULL DEFAULT 0 CHECK(shipping_pkr >= 0),
      total_pkr INTEGER NOT NULL CHECK(total_pkr >= 0),
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      order_status TEXT NOT NULL DEFAULT 'received',
      tracking_reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      product_slug TEXT NOT NULL,
      size_ml INTEGER NOT NULL,
      unit_price_pkr INTEGER NOT NULL CHECK(unit_price_pkr >= 0),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      line_total_pkr INTEGER NOT NULL CHECK(line_total_pkr >= 0)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      amount_pkr INTEGER NOT NULL CHECK(amount_pkr >= 0),
      currency TEXT NOT NULL DEFAULT 'PKR',
      transaction_ref TEXT,
      session_id TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      provider_event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      signature_verified INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_city TEXT DEFAULT '',
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT NOT NULL DEFAULT '',
      comment TEXT NOT NULL,
      is_verified_purchase INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      read_time TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      related_product_slug TEXT,
      published_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_visible ON products(is_visible);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
  `);

  seedInitialData();
}

function seedInitialData(): void {
  // Seed admin from environment variables if provided and no admins exist
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number }).c;
  if (adminCount === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(
      process.env.ADMIN_EMAIL.toLowerCase().trim(),
      'Al Fajr Administrator',
      hash,
      'super_admin'
    );
  }

  // Seed store settings if empty
  const settingCount = (db.prepare('SELECT COUNT(*) as c FROM store_settings').get() as { c: number }).c;
  if (settingCount === 0) {
    const defaults: Record<string, string> = {
      brand_name: 'Al Fajr Scents',
      brand_tagline: 'Fragrance is an identity.',
      announcement_text: 'Complimentary shipping across Pakistan on orders above PKR 12,000 · Cash on Delivery & Bank Transfer',
      shipping_fee_pkr: '250',
      free_shipping_threshold_pkr: '12000',
      contact_email: 'concierge@alfajrscents.pk',
      contact_phone: '[Editable in Admin — Business Phone]',
      whatsapp_number: '',
      business_address: '[Editable in Admin — Studio & Dispatch City, Pakistan]',
      bank_name: '[Editable in Admin — Bank Name]',
      bank_account_title: 'Al Fajr Scents',
      bank_iban: '[Editable in Admin — IBAN / Account Number]',
      instagram_url: '',
      facebook_url: '',
      cod_enabled: 'true',
      bank_transfer_enabled: 'true',
      safepay_enabled: 'false',
      payfast_enabled: 'false',
      jazzcash_enabled: 'false',
      easypaisa_enabled: 'false',
      hero_headline: 'Fragrance Is an Identity.',
      hero_subheadline: 'Fine Eau de Parfum creations crafted for quiet confidence, lasting trail, and understated elegance across Pakistan.',
    };
    const insertSetting = db.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(defaults)) {
      insertSetting.run(k, v);
    }
  }

  // Seed categories
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (catCount === 0) {
    const cats = [
      ['Oceanic & Fresh', 'oceanic-fresh', 'Crisp marine accords, sunlit citrus, and coastal clarity.', 1],
      ['Woody & Smoky', 'woody-smoky', 'Deep resinous oud, dark woods, and evening sophistication.', 2],
      ['Amber & Spiced', 'amber-spiced', 'Warm golden resins, cardamom, and luminous depth.', 3],
      ['Floral & Velvet', 'floral-velvet', 'Rich evening florals anchored by smooth dark woods.', 4],
    ];
    const insertCat = db.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)');
    for (const c of cats) {
      insertCat.run(...c);
    }
  }

  // Seed authentic products mapped strictly to supplied photographs
  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (productCount === 0) {
    const getCatId = (slug: string) =>
      (db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: number } | undefined)?.id ?? null;

    const productsSeed = [
      {
        category_id: getCatId('oceanic-fresh'),
        name: 'Blu Mare',
        slug: 'blu-mare',
        subtitle: 'Sunlit coastal clarity & sea salt freshness',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 6500,
        stock_quantity: 18,
        fragrance_family: 'Oceanic Citrus',
        scent_profile: 'Crisp, Aquatic, Salted Citrus',
        top_notes: 'Bergamot, Sea Salt, Crushed Lemon Peel (Provisional)',
        heart_notes: 'Marine Breeze, Cypress, Neroli (Provisional)',
        base_notes: 'Driftwood, White Musk, Ambergris Accord (Provisional)',
        longevity_claim: '6–8 hours (Provisional — update after wear-test)',
        accent_color: '#173A55',
        description:
          'Inspired by the open Mediterranean horizon at dawn. Blu Mare balances crisp citrus brightness with clean coastal minerality in a frosted sapphire 50ml flacon.',
        story:
          'Crafted for bright daytime wear in warm Pakistani summers, Blu Mare opens with luminous zest before settling into sunlit stone and sea air.',
        seo_title: 'Blu Mare Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Blu Mare 50ml Eau de Parfum by Al Fajr Scents in Pakistan. Crisp coastal freshness with Cash on Delivery nationwide.',
        is_featured: 1,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.28_AM_a80b65ec.jpeg',
            alt: 'Al Fajr Scents Blu Mare Eau de Parfum 50ml blue frosted bottle poolside overlooking coastal yachts',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
        ],
      },
      {
        category_id: getCatId('oceanic-fresh'),
        name: 'Blu Sea',
        slug: 'blu-sea',
        subtitle: 'Deep pelagic reserve in presentation box',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 6800,
        stock_quantity: 14,
        fragrance_family: 'Deep Aquatic',
        scent_profile: 'Deep, Marine, Aromatic',
        top_notes: 'Grapefruit Zest, Marine Mist, Mint Leaf (Provisional)',
        heart_notes: 'Clary Sage, Blue Geranium, Ozonic Accord (Provisional)',
        base_notes: 'Cedarwood, Mineral Amber, Clean Musk (Provisional)',
        longevity_claim: '7–9 hours (Provisional — update after wear-test)',
        accent_color: '#0F3A42',
        description:
          'Presented in the signature matte black Al Fajr Scents crest box, Blu Sea is a deeper, metallic-capped marine composition distinct from Blu Mare.',
        story:
          'Where Blu Mare captures sunlit coastal air, Blu Sea descends into cooler, deeper currents—balanced by aromatic herbs and structured cedar.',
        seo_title: 'Blu Sea Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Blu Sea 50ml Eau de Parfum in authentic Al Fajr Scents gift packaging. Available across Pakistan.',
        is_featured: 1,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.32_AM_0f42fbb6.jpeg',
            alt: 'Al Fajr Scents Blu Sea Eau de Parfum 50ml bottle inside black calligraphy presentation box',
            shot_type: 'packaging',
            is_primary: 1,
          },
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.32_AM__1__1e3c7d3d.jpeg',
            alt: 'Al Fajr Scents Blu Sea 50ml Eau de Parfum full packaging view',
            shot_type: 'packaging',
            is_primary: 0,
          },
        ],
      },
      {
        category_id: getCatId('amber-spiced'),
        name: 'Silver Coast',
        slug: 'silver-coast',
        subtitle: 'Emerald mineral mist meets golden sunset amber',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7200,
        stock_quantity: 20,
        fragrance_family: 'Emerald Aromatic Amber',
        scent_profile: 'Fresh Green, Golden, Radiant',
        top_notes: 'Green Mandarin, Crushed Cardamom, Coastal Mist (Provisional)',
        heart_notes: 'Vetiver, Fig Leaf, Warm Neroli (Provisional)',
        base_notes: 'Golden Amber, Sandalwood, Oakmoss (Provisional)',
        longevity_claim: '8+ hours (Provisional — update after wear-test)',
        accent_color: '#153F35',
        description:
          'Housed in an emerald-to-amber gradient glass flacon crowned with a polished gold dome, Silver Coast bridges crisp mountain greenery and warm coastal twilight.',
        story:
          'Designed as a versatile signature from morning meetings to sunset gatherings, Silver Coast evolves seamlessly from crisp botanical brightness to golden warmth.',
        seo_title: 'Silver Coast Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Silver Coast 50ml Eau de Parfum by Al Fajr Scents. Emerald freshness and golden amber depth across Pakistan.',
        is_featured: 1,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.27_AM__1__92fc8aa5.jpeg',
            alt: 'Al Fajr Scents Silver Coast Eau de Parfum 50ml emerald and amber bottle on wet stone beside mountain waterfall',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM_1cb3d924.jpeg',
            alt: 'Al Fajr Scents Silver Coast 50ml Eau de Parfum bottle on yacht deck at golden sunset',
            shot_type: 'lifestyle',
            is_primary: 0,
          },
        ],
      },
      {
        category_id: getCatId('woody-smoky'),
        name: 'Shadow X',
        slug: 'shadow-x',
        subtitle: 'Smoked bronze oud & dark incense warmth',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7800,
        stock_quantity: 15,
        fragrance_family: 'Smoky Woody Amber',
        scent_profile: 'Smoky, Resinous, Commanding',
        top_notes: 'Black Cardamom, Saffron, Roasted Pepper (Provisional)',
        heart_notes: 'Smoked Agarwood, Labdanum, Incense Smoke (Provisional)',
        base_notes: 'Dark Amber, Patchouli, Charred Cedar (Provisional)',
        longevity_claim: '10+ hours (Provisional — update after wear-test)',
        accent_color: '#4A2F1B',
        description:
          'Deep, atmospheric, and magnetic. Shadow X pairs smoked woods and dark amber resins inside a warm bronze-frosted flacon with an obsidian dome cap.',
        story:
          'Built for evening occasions, formal wear, and cooler nights—Shadow X leaves an unmistakable, composed trail without overpowering the room.',
        seo_title: 'Shadow X Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Shadow X 50ml Eau de Parfum by Al Fajr Scents. Smoked bronze woods and dark amber in Pakistan.',
        is_featured: 1,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__1__ad1ae54e.jpeg',
            alt: 'Al Fajr Scents Shadow X Eau de Parfum 50ml smoky bronze bottle beside oud wood and brass lantern',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
        ],
      },
      {
        category_id: getCatId('woody-smoky'),
        name: 'Midnight Aura',
        slug: 'midnight-aura',
        subtitle: 'Understated obsidian smoke & resinous calm',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7500,
        stock_quantity: 16,
        fragrance_family: 'Dark Woody Musk',
        scent_profile: 'Nocturnal, Smooth, Velvety',
        top_notes: 'Elemi Resin, Pink Pepper, Bergamot Rind (Provisional)',
        heart_notes: 'Oud Wood, Cashmere Iris, Frankincense (Provisional)',
        base_notes: 'Amber Resin, Black Musk, Guaiac Wood (Provisional)',
        longevity_claim: '9–11 hours (Provisional — update after wear-test)',
        accent_color: '#1F1E1C',
        description:
          'A study in quiet nocturnal luxury. Midnight Aura rests inside a matte smoky-charcoal bottle, marrying raw oud wood and golden resin with velvet musk.',
        story:
          'Formulated for those who prefer depth over volume—an intimate yet enduring signature crafted for late evenings.',
        seo_title: 'Midnight Aura Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Midnight Aura 50ml Eau de Parfum by Al Fajr Scents. Smoky oud and resinous elegance across Pakistan.',
        is_featured: 1,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__2__289636cd.jpeg',
            alt: 'Al Fajr Scents Midnight Aura Eau de Parfum 50ml matte black bottle on dark marble with oud and amber resin',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.33_AM_b00b9d5e.jpeg',
            alt: 'Al Fajr Scents Midnight Aura Eau de Parfum 50ml studio packshot on clean white background',
            shot_type: 'packshot',
            is_primary: 0,
          },
        ],
      },
      {
        category_id: getCatId('floral-velvet'),
        name: 'Rose Whisper',
        slug: 'rose-whisper',
        subtitle: 'Midnight sapphire rose & gilded velvet box',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7000,
        stock_quantity: 22,
        fragrance_family: 'Velvet Floral Amber',
        scent_profile: 'Romantic, Poised, Luminous Floral',
        top_notes: 'Saffron Thread, Mandarin Blossom, Pear Mist (Provisional)',
        heart_notes: 'Damask Rose, Midnight Peony, Jasmine Sambac (Provisional)',
        base_notes: 'Soft Cashmeran, White Amber, Creamy Sandalwood (Provisional)',
        longevity_claim: '8+ hours (Provisional — update after wear-test)',
        accent_color: '#182B49',
        description:
          'Sapphire frosted glass meets timeless Damascus rose. Rose Whisper arrives in the signature illuminated black Al Fajr presentation case with gold Arabic calligraphy.',
        story:
          'Neither overly sweet nor powdery—Rose Whisper captures cool midnight petals warmed by golden saffron and smooth sandalwood.',
        seo_title: 'Rose Whisper Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Rose Whisper 50ml Eau de Parfum by Al Fajr Scents in luxury gift packaging across Pakistan.',
        is_featured: 1,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.26_AM_c6d54422.jpeg',
            alt: 'Al Fajr Scents Rose Whisper Eau de Parfum 50ml frosted blue bottle beside midnight roses and crystal decanters',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.25_AM_2247997b.jpeg',
            alt: 'Rose Whisper 50ml inside spotlighted Al Fajr Scents luxury presentation box with Arabic calligraphy',
            shot_type: 'packaging',
            is_primary: 0,
          },
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.30_AM_49eda978.jpeg',
            alt: 'Rose Whisper 50ml presentation box on engraved brass tray with warm lantern lighting',
            shot_type: 'packaging',
            is_primary: 0,
          },
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.30_AM__1__54b82fa8.jpeg',
            alt: 'Authentic physical packaging photograph of Rose Whisper 50ml Eau de Parfum',
            shot_type: 'detail',
            is_primary: 0,
          },
        ],
      },
      {
        category_id: getCatId('amber-spiced'),
        name: 'Qamrah',
        slug: 'qamrah',
        subtitle: 'Spiced emerald-amber glow with gilded dome',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7400,
        stock_quantity: 12,
        fragrance_family: 'Oriental Amber Spice',
        scent_profile: 'Warm, Spiced, Regal',
        top_notes: 'Cinnamon Bark, Nutmeg, Green Bergamot (Provisional)',
        heart_notes: 'Roasted Praline, Dates, Myrrh (Provisional)',
        base_notes: 'Golden Amber, Tonka Bean, Benzoin (Provisional)',
        longevity_claim: '9+ hours (Provisional — update after wear-test)',
        accent_color: '#1A4738',
        description:
          'Named for moonlit warmth, Qamrah pairs glowing amber spice with polished gold presentation and an emerald-to-honey glass silhouette.',
        story:
          'Crafted for celebratory evenings and heritage gatherings, Qamrah wraps rich spices in luminous resinous sweetness.',
        seo_title: 'Qamrah Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Qamrah 50ml Eau de Parfum by Al Fajr Scents. Spiced golden amber luxury fragrance in Pakistan.',
        is_featured: 0,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.26_AM__1__5d91781b.jpeg',
            alt: 'Al Fajr Scents Qamrah Eau de Parfum 50ml bottle with gold dome cap on marble beside Al Fajr box',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
        ],
      },
      {
        category_id: getCatId('woody-smoky'),
        name: 'Gentlemen',
        slug: 'gentlemen',
        subtitle: 'Tailored matte noir, leather & vetiver',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7200,
        stock_quantity: 14,
        fragrance_family: 'Woody Leather',
        scent_profile: 'Tailored, Crisp, Leathered',
        top_notes: 'Black Pepper, Lavender, Juniper Berry (Provisional)',
        heart_notes: 'Orris Root, Aged Leather, Clary Sage (Provisional)',
        base_notes: 'Haitian Vetiver, Patchouli, Dark Cedar (Provisional)',
        longevity_claim: '8–10 hours (Provisional — update after wear-test)',
        accent_color: '#231C18',
        description:
          'Sharp tailoring in a matte obsidian vessel. Gentlemen balances aromatic spice and dry vetiver over supple dark leather.',
        story:
          'Composed for boardrooms, black-tie evenings, and composed daily discipline.',
        seo_title: 'Gentlemen Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Gentlemen 50ml Eau de Parfum by Al Fajr Scents. Tailored woody leather fragrance in Pakistan.',
        is_featured: 0,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.27_AM_30097205.jpeg',
            alt: 'Al Fajr Scents Gentlemen Eau de Parfum 50ml matte black bottle on obsidian plinth',
            shot_type: 'lifestyle',
            is_primary: 1,
          },
        ],
      },
      {
        category_id: getCatId('amber-spiced'),
        name: 'Golden Drop',
        slug: 'golden-drop',
        subtitle: 'Liquid amber reserve in collector presentation box',
        concentration: 'Eau de Parfum',
        size_ml: 50,
        price_pkr: 7600,
        stock_quantity: 10,
        fragrance_family: 'Pure Amber Honeyed Wood',
        scent_profile: 'Honeyed, Resinous, Golden',
        top_notes: 'Blood Orange, Saffron, Golden Cardamom (Provisional)',
        heart_notes: 'Wild Honey Accord, Amber Resin, Labdanum (Provisional)',
        base_notes: 'Madagascar Vanilla, Sandalwood, White Oud (Provisional)',
        longevity_claim: '9+ hours (Provisional — update after wear-test)',
        accent_color: '#6E471C',
        description:
          'Captured in an amber-tinted bottle inside the authentic Al Fajr Scents gold-calligraphy gift box, Golden Drop radiates warm resinous luxury.',
        story:
          'An opulent amber signature crafted for gifting and evening wear across every season.',
        seo_title: 'Golden Drop Eau de Parfum 50ml | Al Fajr Scents',
        seo_description:
          'Shop Golden Drop 50ml Eau de Parfum in authentic Al Fajr Scents presentation box across Pakistan.',
        is_featured: 0,
        images: [
          {
            url: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.32_AM__3__d4b25bf0.jpeg',
            alt: 'Al Fajr Scents Golden Drop 50ml Eau de Parfum inside authentic black presentation box',
            shot_type: 'packaging',
            is_primary: 1,
          },
        ],
      },
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        category_id, name, slug, subtitle, concentration, size_ml, price_pkr, stock_quantity,
        fragrance_family, scent_profile, top_notes, heart_notes, base_notes, longevity_claim,
        accent_color, description, story, seo_title, seo_description, is_visible, is_featured, is_verified_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0)
    `);
    const insertImg = db.prepare(`
      INSERT INTO product_images (product_id, image_url, alt_text, shot_type, sort_order, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedTx = db.transaction(() => {
      for (const p of productsSeed) {
        const res = insertProd.run(
          p.category_id,
          p.name,
          p.slug,
          p.subtitle,
          p.concentration,
          p.size_ml,
          p.price_pkr,
          p.stock_quantity,
          p.fragrance_family,
          p.scent_profile,
          p.top_notes,
          p.heart_notes,
          p.base_notes,
          p.longevity_claim,
          p.accent_color,
          p.description,
          p.story,
          p.seo_title,
          p.seo_description,
          p.is_featured
        );
        const prodId = Number(res.lastInsertRowid);
        p.images.forEach((img, idx) => {
          insertImg.run(prodId, img.url, img.alt, img.shot_type, idx, img.is_primary);
        });
      }
    });
    seedTx();
  }

  // Seed journal articles (the 6 fragrance education articles outlined in strategy)
  const journalCount = (db.prepare('SELECT COUNT(*) as c FROM journal_articles').get() as { c: number }).c;
  if (journalCount === 0) {
    const articles = [
      {
        title: 'How to Choose Your Signature Perfume',
        slug: 'how-to-choose-your-signature-perfume',
        category: 'Scent Discovery',
        read_time: '4 min read',
        excerpt: 'A calm, structured method for matching fragrance families to climate, personal wardrobe, and skin chemistry.',
        content: `Selecting a signature fragrance begins with understanding how scent evolves over hours rather than seconds. The opening spray reveals bright top notes—citrus, salt, or cardamom—that lift within twenty minutes to reveal the fragrance heart.\n\nIn Pakistan's varied climate, crisp oceanic and green-amber creations like Blu Mare and Silver Coast perform effortlessly through warm afternoons, while deeper woody-resinous compositions such as Shadow X and Midnight Aura project refined presence into evening gatherings.\n\nWear any candidate across a full day before deciding. Notice how it settles on fabric and skin six hours later—that enduring base is your true signature.`,
        cover_image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.27_AM__1__92fc8aa5.jpeg',
        related_product_slug: 'silver-coast',
      },
      {
        title: 'Understanding Top, Heart and Base Notes',
        slug: 'understanding-top-heart-and-base-notes',
        category: 'Fragrance Education',
        read_time: '5 min read',
        excerpt: 'Why fine perfumery unfolds in three acts, from first impression to the final lingering trail.',
        content: `Every Eau de Parfum is composed like a three-act narrative. Top notes—light molecules such as bergamot, sea salt, or pink pepper—form the opening greeting and evaporate cleanly within 15 to 45 minutes.\n\nHeart notes emerge as the warmth of skin develops the blend: Damascus rose, sage, vetiver, and aromatic spices define the character of the perfume for the next three to five hours.\n\nFinally, base notes of oud wood, amber resin, sandalwood, and clean musk anchor the composition, creating a lasting foundation that lingers quietly on pulse points and collars.`,
        cover_image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__1__ad1ae54e.jpeg',
        related_product_slug: 'shadow-x',
      },
      {
        title: 'How to Make Your Fragrance Last Longer',
        slug: 'how-to-make-your-fragrance-last-longer',
        category: 'Wear & Care',
        read_time: '3 min read',
        excerpt: 'Practical techniques for hydration, pulse-point application, and proper bottle storage away from heat.',
        content: `Fragrance evaporates rapidly from dry skin. Applying an unscented moisturizer before spraying Eau de Parfum creates a lipid barrier that slows evaporation and preserves delicate heart notes.\n\nFocus on warm pulse points—wrists, collarbones, and behind the ears—without rubbing wrists together, which crushes top-note structure. A single mist over natural-fiber clothing also extends longevity significantly.\n\nEqually important is storage: keep your Al Fajr flacon in its presentation box or a cool, shaded drawer away from direct sunlight and bathroom humidity.`,
        cover_image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.30_AM_49eda978.jpeg',
        related_product_slug: 'rose-whisper',
      },
      {
        title: 'Guide to Fresh, Woody and Amber Fragrances',
        slug: 'guide-to-fresh-woody-and-amber-fragrances',
        category: 'Olfactory Families',
        read_time: '5 min read',
        excerpt: 'Comparing crisp marine compositions, tailored dark woods, and luminous spiced ambers.',
        content: `Understanding the three core pillars of modern niche perfumery simplifies every fragrance wardrobe:\n\n1. Fresh & Oceanic (Blu Mare, Blu Sea): Built on citrus rind, marine minerality, and crisp botanicals for effortless daytime clarity.\n\n2. Woody & Smoky (Shadow X, Midnight Aura, Gentlemen): Anchored by cedar, vetiver, leather, and oud smoke for structured evening poise.\n\n3. Amber & Spiced (Silver Coast, Qamrah, Golden Drop): Rich with golden resins, warm cardamom, and smooth sandalwood that bridge heritage warmth with contemporary minimalism.`,
        cover_image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.26_AM__1__5d91781b.jpeg',
        related_product_slug: 'qamrah',
      },
      {
        title: "Perfume Layering: A Beginner's Guide",
        slug: 'perfume-layering-beginners-guide',
        category: 'Scent Stacking',
        read_time: '4 min read',
        excerpt: 'Combining two complementary Eau de Parfums to create a personal olfactory signature.',
        content: `Scent layering pairs a grounding base fragrance with a brighter top fragrance so their trails intersect without clashing. Always spray the heavier, deeper scent first—such as Midnight Aura or Shadow X—and allow it to settle for two minutes before misting a lighter aquatic or floral accent above it.\n\nRecommended Al Fajr Pairings:\n• Midnight Aura + Rose Whisper: Velvety dark smoke softened by cool sapphire rose.\n• Shadow X + Silver Coast: Resinous oud lifted by emerald citrus and golden warmth.\n• Golden Drop + Blu Mare: Crisp coastal salt grounded by warm honeyed amber.`,
        cover_image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.29_AM__2__289636cd.jpeg',
        related_product_slug: 'midnight-aura',
      },
      {
        title: 'Choosing a Fragrance for Different Occasions',
        slug: 'choosing-fragrance-for-different-occasions',
        category: 'Wardrobe Curation',
        read_time: '4 min read',
        excerpt: 'From daytime office clarity and coastal travel to formal weddings and evening gifting.',
        content: `Just as fabrics shift between linen afternoons and tailored wool evenings, a curated perfume shelf adapts to setting and season.\n\nFor daily work and sunlit travel, Blu Mare and Silver Coast deliver clean radiance without crowding shared spaces. For formal meetings and evening dinners, Gentlemen offers crisp leather-vetiver discipline. For weddings, Eid celebrations, and memorable gifting, Rose Whisper, Qamrah, and Shadow X arrive ready in gilded Al Fajr presentation cases.`,
        cover_image: '/assets/aistudio/WhatsApp_Image_2026-11-12_at_7.44.27_AM_30097205.jpeg',
        related_product_slug: 'gentlemen',
      },
    ];

    const insertArt = db.prepare(`
      INSERT INTO journal_articles (title, slug, category, read_time, excerpt, content, cover_image, related_product_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of articles) {
      insertArt.run(a.title, a.slug, a.category, a.read_time, a.excerpt, a.content, a.cover_image, a.related_product_slug);
    }
  }
}
