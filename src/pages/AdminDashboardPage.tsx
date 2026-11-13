import { useEffect, useState, useCallback } from 'react';
import { Lock, LogOut, Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';
import { formatPKR } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import { useStore } from '../context/StoreContext';
import type { Category, Product } from '../types';

type AdminTab = 'analytics' | 'products' | 'orders' | 'customers' | 'discounts' | 'settings';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function AdminDashboardPage() {
  const { refreshStorefront } = useStore();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auth forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupName, setSetupName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard state
  const [tab, setTab] = useState<AdminTab>('analytics');
  const [analytics, setAnalytics] = useState<{
    totals: {
      total_orders: number;
      verified_paid_revenue_pkr: number;
      pending_orders: number;
      cancelled_orders: number;
    };
    bestSelling: Array<{ product_id: number; product_name: string; units_sold: number; gross_pkr: number }>;
    productCount: number;
    unverifiedProducts: number;
    subscriberCount: number;
    contactCount: number;
  } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [discounts, setDiscounts] = useState<Array<Record<string, unknown>>>([]);
  const [newDiscount, setNewDiscount] = useState({ code: '', discount_type: 'percentage', discount_value: '10', min_order_pkr: '0' });

  const [reviews, setReviews] = useState<Array<Record<string, unknown>>>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [contactMessages, setContactMessages] = useState<Array<Record<string, unknown>>>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadAuth = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const meRes = await fetch('/api/admin/me');
      if (meRes.ok) {
        const d = await meRes.json();
        setAdmin(d.admin);
        setNeedsSetup(false);
        return;
      }
      const setupRes = await fetch('/api/admin/setup-status');
      if (setupRes.ok) {
        const s = await setupRes.json();
        setNeedsSetup(Boolean(s.needsInitialSetup));
      }
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const loadDashboardData = useCallback(async () => {
    if (!admin) return;
    const [anRes, prRes, orRes, cuRes, diRes, rvRes, stRes] = await Promise.all([
      fetch('/api/admin/analytics'),
      fetch('/api/admin/products'),
      fetch(`/api/admin/orders?status=${encodeURIComponent(orderStatusFilter)}&q=${encodeURIComponent(orderSearch)}`),
      fetch('/api/admin/customers'),
      fetch('/api/admin/discounts'),
      fetch('/api/admin/reviews'),
      fetch('/api/admin/settings'),
    ]);

    if (anRes.ok) setAnalytics(await anRes.json());
    if (prRes.ok) {
      const pd = await prRes.json();
      setProducts(pd.products || []);
      setCategories(pd.categories || []);
    }
    if (orRes.ok) setOrders((await orRes.json()).orders || []);
    if (cuRes.ok) setCustomers((await cuRes.json()).customers || []);
    if (diRes.ok) setDiscounts((await diRes.json()).discounts || []);
    if (rvRes.ok) setReviews((await rvRes.json()).reviews || []);
    if (stRes.ok) {
      const sd = await stRes.json();
      setSettingsForm(sd.settings || {});
      setContactMessages(sd.messages || []);
    }
  }, [admin, orderSearch, orderStatusFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Authentication failed');
      return;
    }
    setAdmin(data.admin);
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch('/api/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: setupName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Setup failed');
      return;
    }
    setAdmin(data.admin);
    setNeedsSetup(false);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdmin(null);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl: reader.result }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const currentImgs = editingProduct.images || [];
        setEditingProduct({
          ...editingProduct,
          images: [
            ...currentImgs,
            {
              id: Date.now(),
              product_id: editingProduct.id || 0,
              image_url: data.url,
              alt_text: editingProduct.name || 'Al Fajr Scents bottle',
              shot_type: 'packshot',
              sort_order: currentImgs.length,
              is_primary: currentImgs.length === 0 ? 1 : 0,
            },
          ],
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const isNew = !editingProduct.id;
    const res = await fetch(isNew ? '/api/admin/products' : `/api/admin/products/${editingProduct.id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProduct),
    });
    if (res.ok) {
      setEditingProduct(null);
      await loadDashboardData();
      await refreshStorefront();
      notify(isNew ? 'Product created.' : 'Product saved.');
    } else {
      const d = await res.json();
      notify(d.error || 'Failed to save product.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadDashboardData();
      await refreshStorefront();
      notify('Product removed or archived.');
    }
  };

  const handleOrderUpdate = async (id: number, updates: { order_status?: string; payment_status?: string }) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await loadDashboardData();
      await refreshStorefront();
      notify('Order updated.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: settingsForm }),
    });
    if (res.ok) {
      await refreshStorefront();
      notify('Store settings updated.');
    }
  };

  if (checkingAuth) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-sm">Verifying session...</div>;
  }

  if (!admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <SEOHead title="Store Admin | Al Fajr Scents" description="Protected store administration portal." />
        <div className="border border-[#10100E]/15 bg-[#FAF8F5] p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#C6A46A]">
            <Lock className="h-4 w-4" />
            <span>{needsSetup ? 'First-Run Security Setup' : 'Protected Portal'}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl text-[#10100E]">
            {needsSetup ? 'Create Master Admin Account' : 'Al Fajr Store Admin'}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#302018]/75">
            {needsSetup
              ? 'No administrator account exists yet. Create your private master login below—this setup locks permanently once submitted.'
              : 'Sign in with your administrator credentials to manage products, orders, payments, and store settings.'}
          </p>

          <form onSubmit={needsSetup ? handleInitialSetup : handleLogin} className="mt-6 space-y-4">
            {needsSetup && (
              <input
                type="text"
                required
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Administrator Name"
                className="w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email"
              className="w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 characters)"
              className="w-full border border-[#10100E]/20 bg-white px-4 py-3 text-sm focus:border-[#10100E] focus:outline-none"
            />
            {authError && <p className="text-xs text-red-700">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-[#10100E] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] hover:bg-[#302018] cursor-pointer"
            >
              {needsSetup ? 'Create Admin & Enter Dashboard' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SEOHead title="Admin Dashboard | Al Fajr Scents" description="Al Fajr Scents management console." />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#10100E]/15 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#C6A46A]">Administration Console</p>
          <h1 className="mt-1 font-display text-3xl text-[#10100E]">Al Fajr Scents Operations</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#302018]">{admin.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 border border-[#10100E]/25 px-4 py-2 text-xs uppercase tracking-wider hover:bg-[#10100E] hover:text-[#FAF8F5] cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="mt-4 border border-[#153F35]/30 bg-[#153F35]/10 px-4 py-3 text-xs text-[#153F35]">
          {statusNotice}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#10100E]/10 pb-4">
        {(['analytics', 'products', 'orders', 'customers', 'discounts', 'settings'] as AdminTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] cursor-pointer ${
              tab === t ? 'bg-[#10100E] text-[#FAF8F5]' : 'border border-[#10100E]/15 bg-[#FAF8F5] text-[#302018]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && analytics && (
        <div className="mt-8 space-y-8">
          {analytics.unverifiedProducts > 0 && (
            <div className="flex items-start gap-3 border border-amber-800/30 bg-amber-50 p-4 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>{analytics.unverifiedProducts} product(s) still contain provisional placeholder pricing/notes.</strong>{' '}
                Review and mark them verified in the <strong>Products</strong> tab once your final PKR prices and olfactory notes are approved.
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-5">
              <p className="text-xs uppercase tracking-wider text-[#302018]/70">Total Orders</p>
              <p className="mt-2 tabular-nums font-display text-4xl text-[#10100E]">{analytics.totals.total_orders || 0}</p>
            </div>
            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-5">
              <p className="text-xs uppercase tracking-wider text-[#302018]/70">Verified Paid Revenue</p>
              <p className="mt-2 tabular-nums font-display text-3xl text-[#153F35]">
                {formatPKR(analytics.totals.verified_paid_revenue_pkr || 0)}
              </p>
            </div>
            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-5">
              <p className="text-xs uppercase tracking-wider text-[#302018]/70">Pending Orders</p>
              <p className="mt-2 tabular-nums font-display text-4xl text-[#10100E]">{analytics.totals.pending_orders || 0}</p>
            </div>
            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-5">
              <p className="text-xs uppercase tracking-wider text-[#302018]/70">Cancelled Orders</p>
              <p className="mt-2 tabular-nums font-display text-4xl text-[#10100E]">{analytics.totals.cancelled_orders || 0}</p>
            </div>
          </div>

          <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-6">
            <h2 className="font-display text-2xl text-[#10100E]">Best-Selling Fragrances (Real Sales Data)</h2>
            {analytics.bestSelling.length === 0 ? (
              <p className="mt-3 text-sm text-[#302018]/75">No completed order items recorded yet.</p>
            ) : (
              <table className="mt-4 w-full text-left text-sm">
                <thead className="border-b border-[#10100E]/10 text-xs uppercase text-[#302018]/70">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2">Units Sold</th>
                    <th className="py-2 text-right">Gross (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10100E]/10">
                  {analytics.bestSelling.map((b) => (
                    <tr key={b.product_id}>
                      <td className="py-2.5 font-medium">{b.product_name}</td>
                      <td className="py-2.5 tabular-nums">{b.units_sold}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatPKR(b.gross_pkr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-[#10100E]">Catalogue ({products.length})</h2>
            <button
              type="button"
              onClick={() =>
                setEditingProduct({
                  name: '',
                  slug: '',
                  subtitle: '',
                  concentration: 'Eau de Parfum',
                  size_ml: 50,
                  price_pkr: 6500,
                  stock_quantity: 10,
                  fragrance_family: 'Woody Amber',
                  scent_profile: '',
                  top_notes: '',
                  heart_notes: '',
                  base_notes: '',
                  longevity_claim: '',
                  accent_color: '#173A55',
                  description: '',
                  story: '',
                  seo_title: '',
                  seo_description: '',
                  is_visible: 1,
                  is_featured: 0,
                  is_verified_data: 1,
                  images: [],
                })
              }
              className="inline-flex items-center gap-2 bg-[#10100E] px-4 py-2.5 text-xs uppercase tracking-wider text-[#FAF8F5] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#C6A46A]" /> Add Product
            </button>
          </div>

          <div className="mt-6 overflow-x-auto border border-[#10100E]/10 bg-[#FAF8F5]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#10100E]/10 bg-[#F3E9DE]/60 text-xs uppercase text-[#302018]">
                <tr>
                  <th className="p-3.5">Fragrance</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Data Status</th>
                  <th className="p-3.5">Visibility</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10100E]/10">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 bg-[#E9DFD3]">
                          {p.images?.[0] && (
                            <img src={p.images[0].image_url} alt={p.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#10100E]">{p.name}</p>
                          <p className="text-xs text-[#302018]/70">{p.size_ml}ml · /{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 tabular-nums font-medium">{formatPKR(p.price_pkr)}</td>
                    <td className="p-3.5 tabular-nums">{p.stock_quantity}</td>
                    <td className="p-3.5 text-xs">
                      {p.is_verified_data ? (
                        <span className="inline-flex items-center gap-1 text-[#153F35]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-800">Placeholder — Edit</span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs">{p.is_visible ? 'Visible' : 'Hidden'}</td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="p-2 text-[#10100E] hover:bg-[#F3E9DE] cursor-pointer"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-red-700 hover:bg-red-50 cursor-pointer"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT EDITOR MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10100E]/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-[#FAF8F5] p-6 sm:p-8 shadow-2xl">
            <h3 className="font-display text-2xl text-[#10100E]">
              {editingProduct.id ? `Edit ${editingProduct.name}` : 'Add New Fragrance'}
            </h3>
            <form onSubmit={handleSaveProduct} className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <label className="text-xs uppercase text-[#302018]">Name *</label>
                <input
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Slug *</label>
                <input
                  required
                  value={editingProduct.slug || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Price (PKR) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price_pkr ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price_pkr: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock_quantity ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Size (ml)</label>
                <input
                  type="number"
                  value={editingProduct.size_ml ?? 50}
                  onChange={(e) => setEditingProduct({ ...editingProduct, size_ml: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Category</label>
                <select
                  value={editingProduct.category_id || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category_id: Number(e.target.value) || null })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase text-[#302018]">Subtitle</label>
                <input
                  value={editingProduct.subtitle || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subtitle: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Top Notes</label>
                <input
                  value={editingProduct.top_notes || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, top_notes: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Heart Notes</label>
                <input
                  value={editingProduct.heart_notes || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, heart_notes: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Base Notes</label>
                <input
                  value={editingProduct.base_notes || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, base_notes: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">Campaign Accent Color (Hex)</label>
                <input
                  value={editingProduct.accent_color || '#173A55'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, accent_color: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase text-[#302018]">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">SEO Title</label>
                <input
                  value={editingProduct.seo_title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, seo_title: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#302018]">SEO Description</label>
                <input
                  value={editingProduct.seo_description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, seo_description: e.target.value })}
                  className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2"
                />
              </div>

              {/* Image Upload */}
              <div className="sm:col-span-2 border-t border-[#10100E]/10 pt-3">
                <label className="block text-xs uppercase text-[#302018]">Product Images</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(editingProduct.images || []).map((img, i) => (
                    <div key={i} className="relative h-20 w-16 border border-[#10100E]/15">
                      <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            images: (editingProduct.images || []).filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center bg-red-700 text-[10px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center border border-dashed border-[#10100E]/30 bg-white text-[11px] text-[#302018]">
                    <Upload className="h-4 w-4 mb-1" />
                    Upload
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.is_visible)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_visible: e.target.checked ? 1 : 0 })}
                  />
                  Visible in Storefront
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.is_featured)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked ? 1 : 0 })}
                  />
                  Featured on Homepage
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.is_verified_data)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_verified_data: e.target.checked ? 1 : 0 })}
                  />
                  Mark Specifications &amp; Price Verified
                </label>
              </div>

              <div className="sm:col-span-2 mt-4 flex justify-end gap-3 border-t border-[#10100E]/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="border border-[#10100E]/20 px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#10100E] px-6 py-2.5 text-xs uppercase tracking-wider text-[#FAF8F5] cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search order #, name, phone, city..."
              className="border border-[#10100E]/20 bg-white px-4 py-2 text-xs"
            />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="border border-[#10100E]/20 bg-white px-4 py-2 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="received">Received</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {orders.length === 0 ? (
            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-8 text-sm text-[#302018]/75">
              No orders found matching your filter.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div key={String(ord.id)} className="border border-[#10100E]/15 bg-[#FAF8F5] p-5 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#10100E]/10 pb-3">
                    <div>
                      <p className="font-semibold text-[#10100E] tabular-nums">{String(ord.order_number)}</p>
                      <p className="text-xs text-[#302018]/75">
                        {String(ord.customer_name)} · {String(ord.customer_phone)} · {String(ord.city)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#302018]/70">{String(ord.delivery_address)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums font-semibold text-[#10100E]">
                        {formatPKR(Number(ord.total_pkr))}
                      </p>
                      <p className="text-xs uppercase text-[#302018]/70">
                        {String(ord.payment_method)} · {String(ord.payment_status)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-[#302018]">
                      {(ord.items as Array<Record<string, unknown>>)?.map((it, idx) => (
                        <span key={idx} className="mr-3">
                          {String(it.product_name)} × {String(it.quantity)}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={String(ord.order_status)}
                        onChange={(e) => handleOrderUpdate(Number(ord.id), { order_status: e.target.value })}
                        className="border border-[#10100E]/20 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="received">Received</option>
                        <option value="processing">Processing</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled (Restores Stock)</option>
                      </select>

                      <select
                        value={String(ord.payment_status)}
                        onChange={(e) => handleOrderUpdate(Number(ord.id), { payment_status: e.target.value })}
                        className="border border-[#10100E]/20 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="pending">Payment: Pending</option>
                        <option value="awaiting_verification">Awaiting Verification</option>
                        <option value="paid">Payment: Verified Paid</option>
                        <option value="failed">Payment: Failed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {tab === 'customers' && (
        <div className="mt-8 overflow-x-auto border border-[#10100E]/10 bg-[#FAF8F5]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#10100E]/10 bg-[#F3E9DE]/60 text-xs uppercase text-[#302018]">
              <tr>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Orders</th>
                <th className="p-3.5 text-right">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10100E]/10">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-[#302018]/70">
                    No customer orders recorded yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={String(c.id)}>
                    <td className="p-3.5 font-medium">{String(c.full_name)}</td>
                    <td className="p-3.5 tabular-nums">{String(c.phone)}</td>
                    <td className="p-3.5 text-xs">{String(c.email || '—')}</td>
                    <td className="p-3.5 tabular-nums">{String(c.order_count)}</td>
                    <td className="p-3.5 text-right tabular-nums font-medium">{formatPKR(Number(c.lifetime_pkr || 0))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DISCOUNTS TAB */}
      {tab === 'discounts' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDiscount),
              });
              if (res.ok) {
                setNewDiscount({ code: '', discount_type: 'percentage', discount_value: '10', min_order_pkr: '0' });
                await loadDashboardData();
                notify('Discount code created.');
              }
            }}
            className="space-y-3 border border-[#10100E]/10 bg-[#FAF8F5] p-6 lg:col-span-4"
          >
            <h2 className="font-display text-2xl">Create Discount Code</h2>
            <input
              required
              placeholder="Code (e.g., FAJR10)"
              value={newDiscount.code}
              onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
              className="w-full border border-[#10100E]/20 bg-white px-3 py-2 text-sm uppercase"
            />
            <select
              value={newDiscount.discount_type}
              onChange={(e) => setNewDiscount({ ...newDiscount, discount_type: e.target.value })}
              className="w-full border border-[#10100E]/20 bg-white px-3 py-2 text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (PKR)</option>
            </select>
            <input
              type="number"
              required
              placeholder="Value"
              value={newDiscount.discount_value}
              onChange={(e) => setNewDiscount({ ...newDiscount, discount_value: e.target.value })}
              className="w-full border border-[#10100E]/20 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Minimum Order (PKR)"
              value={newDiscount.min_order_pkr}
              onChange={(e) => setNewDiscount({ ...newDiscount, min_order_pkr: e.target.value })}
              className="w-full border border-[#10100E]/20 bg-white px-3 py-2 text-sm"
            />
            <button type="submit" className="w-full bg-[#10100E] py-2.5 text-xs uppercase tracking-wider text-[#FAF8F5] cursor-pointer">
              Add Discount
            </button>
          </form>

          <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-6 lg:col-span-8">
            <h2 className="font-display text-2xl">Active &amp; Archived Codes</h2>
            <div className="mt-4 space-y-2.5 text-sm">
              {discounts.length === 0 ? (
                <p className="text-[#302018]/70">No discount codes created yet.</p>
              ) : (
                discounts.map((d) => (
                  <div key={String(d.id)} className="flex items-center justify-between border border-[#10100E]/10 bg-white p-3.5">
                    <div>
                      <span className="font-semibold tracking-wider">{String(d.code)}</span>
                      <span className="ml-3 text-xs text-[#302018]/75">
                        {d.discount_type === 'percentage' ? `${d.discount_value}% off` : `PKR ${d.discount_value} off`} · Used {String(d.used_count)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/discounts/${d.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ is_active: !d.is_active }),
                          });
                          loadDashboardData();
                        }}
                        className="border border-[#10100E]/20 px-3 py-1 text-xs cursor-pointer"
                      >
                        {d.is_active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/discounts/${d.id}`, { method: 'DELETE' });
                          loadDashboardData();
                        }}
                        className="p-1 text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS & MODERATION TAB */}
      {tab === 'settings' && (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <form onSubmit={handleSaveSettings} className="space-y-4 border border-[#10100E]/10 bg-[#FAF8F5] p-6 lg:col-span-7 text-sm">
            <h2 className="font-display text-2xl text-[#10100E]">Store, Shipping &amp; Payment Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['announcement_text', 'Announcement Banner Text'],
                ['shipping_fee_pkr', 'Standard Shipping Fee (PKR)'],
                ['free_shipping_threshold_pkr', 'Free Shipping Threshold (PKR)'],
                ['contact_email', 'Concierge Email'],
                ['contact_phone', 'Business Phone'],
                ['whatsapp_number', 'WhatsApp Order Number (e.g., 92300...)'],
                ['bank_name', 'Bank Transfer — Bank Name'],
                ['bank_account_title', 'Bank Transfer — Account Title'],
                ['bank_iban', 'Bank Transfer — IBAN / Account No.'],
                ['business_address', 'Studio / Dispatch Address'],
              ].map(([key, label]) => (
                <div key={key} className={key === 'announcement_text' || key === 'business_address' ? 'sm:col-span-2' : ''}>
                  <label className="text-xs uppercase text-[#302018]/75">{label}</label>
                  <input
                    value={settingsForm[key] || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.value })}
                    className="mt-1 w-full border border-[#10100E]/20 bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-[#10100E]/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#10100E]">Payment Method Toggles</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {[
                  ['cod_enabled', 'Cash on Delivery'],
                  ['bank_transfer_enabled', 'Bank Transfer'],
                  ['safepay_enabled', 'Safepay Adapter'],
                  ['payfast_enabled', 'PayFast Adapter'],
                  ['jazzcash_enabled', 'JazzCash Adapter'],
                  ['easypaisa_enabled', 'Easypaisa Adapter'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm[key] === 'true'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, [key]: e.target.checked ? 'true' : 'false' })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#10100E] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] cursor-pointer"
            >
              Save Store Settings
            </button>
          </form>

          <div className="space-y-6 lg:col-span-5">
            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-6">
              <h2 className="font-display text-2xl text-[#10100E]">Review Moderation ({reviews.length})</h2>
              <div className="mt-4 space-y-3 text-xs">
                {reviews.length === 0 ? (
                  <p className="text-[#302018]/70">No customer reviews submitted yet.</p>
                ) : (
                  reviews.map((r) => (
                    <div key={String(r.id)} className="border border-[#10100E]/10 bg-white p-3">
                      <p className="font-semibold">
                        {String(r.product_name)} · {String(r.reviewer_name)} ({String(r.rating)}★)
                      </p>
                      <p className="mt-1 text-[#302018]">{String(r.comment)}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/reviews/${r.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ is_approved: !r.is_approved }),
                          });
                          loadDashboardData();
                        }}
                        className="mt-2 border border-[#10100E]/20 px-2.5 py-1 cursor-pointer"
                      >
                        {r.is_approved ? 'Approved (Click to Hide)' : 'Pending (Click to Approve)'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-6">
              <h2 className="font-display text-2xl text-[#10100E]">Concierge Messages ({contactMessages.length})</h2>
              <div className="mt-4 space-y-3 text-xs">
                {contactMessages.length === 0 ? (
                  <p className="text-[#302018]/70">No inquiries received yet.</p>
                ) : (
                  contactMessages.map((m) => (
                    <div key={String(m.id)} className="border border-[#10100E]/10 bg-white p-3">
                      <p className="font-semibold">{String(m.subject)} — {String(m.name)}</p>
                      <p className="text-[#302018]/70">{String(m.email)} {m.phone ? `· ${String(m.phone)}` : ''}</p>
                      <p className="mt-1.5 text-[#10100E]">{String(m.message)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
