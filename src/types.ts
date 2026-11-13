export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text: string;
  shot_type: string;
  sort_order: number;
  is_primary: number;
}

export interface Product {
  id: number;
  category_id: number | null;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug: string;
  subtitle: string;
  concentration: string;
  size_ml: number;
  price_pkr: number;
  compare_at_price_pkr?: number | null;
  stock_quantity: number;
  fragrance_family: string;
  scent_profile: string;
  top_notes: string;
  heart_notes: string;
  base_notes: string;
  longevity_claim: string;
  accent_color: string;
  description: string;
  story: string;
  seo_title: string;
  seo_description: string;
  is_visible: number;
  is_featured: number;
  is_verified_data: number;
  images: ProductImage[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

export interface CartItem {
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
}

export interface CartState {
  items: CartItem[];
  item_count: number;
  subtotal_pkr: number;
  discount_code: string | null;
  discount_pkr: number;
  shipping_pkr: number;
  free_shipping_threshold_pkr: number;
  total_pkr: number;
}

export interface PaymentMethod {
  id: 'cod' | 'bank_transfer' | 'safepay' | 'payfast' | 'jazzcash' | 'easypaisa';
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  requiresCredentials: boolean;
  sandboxMode: boolean;
}

export interface Review {
  id: number;
  product_id?: number;
  product_name?: string;
  product_slug?: string;
  reviewer_name: string;
  reviewer_city: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: number;
  is_approved?: number;
  created_at: string;
}

export interface JournalArticle {
  id: number;
  title: string;
  slug: string;
  category: string;
  read_time: string;
  excerpt: string;
  content: string;
  cover_image: string;
  related_product_slug: string | null;
  published_at: string;
}

export interface OrderRecord {
  id?: number;
  order_number: string;
  tracking_reference: string;
  customer_name: string;
  customer_phone?: string;
  city: string;
  delivery_address?: string;
  subtotal_pkr: number;
  discount_pkr: number;
  shipping_pkr: number;
  total_pkr: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at?: string;
  items: Array<{
    product_id: number;
    product_name?: string;
    name?: string;
    product_slug?: string;
    slug?: string;
    size_ml: number;
    unit_price_pkr: number;
    quantity: number;
    line_total_pkr: number;
  }>;
}
