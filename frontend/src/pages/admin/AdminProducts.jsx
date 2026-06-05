import { useEffect, useState } from 'react';
import { useLang } from '../../context/LanguageContext.jsx';
import {
  adminFetchProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  fetchCategories,
} from '../../api/client.js';

const blank = {
  name_fr: '',
  name_ar: '',
  description_fr: '',
  description_ar: '',
  price: '',
  stock: '',
  category_id: '',
  is_active: 1,
};

export default function AdminProducts() {
  const { t, localized } = useLang();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | product object
  const [form, setForm] = useState(blank);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = () => adminFetchProducts().then(setProducts);

  useEffect(() => {
    reload();
    fetchCategories().then(setCategories);
  }, []);

  const openNew = () => {
    setForm(blank);
    setImageFile(null);
    setEditing('new');
  };

  const openEdit = (p) => {
    setForm({
      name_fr: p.name_fr || '',
      name_ar: p.name_ar || '',
      description_fr: p.description_fr || '',
      description_ar: p.description_ar || '',
      price: p.price ?? '',
      stock: p.stock ?? '',
      category_id: p.category_id || '',
      is_active: p.is_active,
    });
    setImageFile(null);
    setEditing(p);
  };

  const close = () => {
    setEditing(null);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (editing === 'new') await adminCreateProduct(fd);
      else await adminUpdateProduct(editing.id, fd);
      await reload();
      close();
    } catch (err) {
      setError(err?.response?.data?.error || t('error_generic'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(t('products_confirm_delete'))) return;
    await adminDeleteProduct(p.id);
    reload();
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-4xl text-ink">{t('admin_products')}</h1>
        <button
          onClick={openNew}
          className="px-5 py-2.5 bg-burgundy text-cream rounded-full hover:bg-rose-700 text-sm uppercase tracking-wider"
        >
          + {t('products_add')}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand/50 text-ink/60 uppercase text-xs">
              <tr>
                <th className="text-start p-4">Image</th>
                <th className="text-start p-4">{t('products_name_fr')}</th>
                <th className="text-start p-4">{t('products_category')}</th>
                <th className="text-start p-4">{t('products_price')}</th>
                <th className="text-start p-4">{t('products_stock')}</th>
                <th className="text-start p-4">{t('products_active')}</th>
                <th className="text-end p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-cream/50">
                  <td className="p-3">
                    <div className="w-12 h-12 rounded-lg bg-sand overflow-hidden">
                      {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-ink">{p.name_fr}</td>
                  <td className="p-4 text-ink/60">{p.category_name_fr || '—'}</td>
                  <td className="p-4 text-burgundy font-semibold">
                    {Number(p.price).toLocaleString()} {t('currency')}
                  </td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4">
                    {p.is_active ? (
                      <span className="text-emerald-700">●</span>
                    ) : (
                      <span className="text-ink/30">○</span>
                    )}
                  </td>
                  <td className="p-4 text-end whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="text-burgundy hover:underline mr-3">
                      {t('products_edit')}
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-rose-600 hover:underline">
                      {t('products_delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="7" className="p-8 text-center text-ink/40">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <div
          className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-2 md:p-4"
          onClick={close}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col"
            style={{ maxHeight: 'calc(100dvh - 1rem)', height: 'auto' }}
          >
            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-rose-100 flex-shrink-0">
              <h2 className="font-display text-2xl text-ink">
                {editing === 'new' ? t('products_add') : t('products_edit')}
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-ink/50 hover:text-ink text-3xl leading-none w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >×</button>
            </div>
            <div
              ref={(el) => { if (el) el.scrollTop = 0; }}
              className="overflow-y-auto px-6 md:px-8 py-5 space-y-4 flex-1"
              style={{ minHeight: 0 }}
            >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_name_fr')} *</label>
                <input
                  required
                  className={inputCls}
                  value={form.name_fr}
                  onChange={(e) => setForm({ ...form, name_fr: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_name_ar')} *</label>
                <input
                  required
                  dir="rtl"
                  className={inputCls}
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_desc_fr')}</label>
                <textarea
                  className={inputCls}
                  rows="3"
                  value={form.description_fr}
                  onChange={(e) => setForm({ ...form, description_fr: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_desc_ar')}</label>
                <textarea
                  dir="rtl"
                  className={inputCls}
                  rows="3"
                  value={form.description_ar}
                  onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_price')} *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_stock')}</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_category')}</label>
                <select
                  className={inputCls}
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">{t('products_no_category')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{localized(c, 'name')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">{t('products_active')}</label>
                <select
                  className={inputCls}
                  value={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
                >
                  <option value={1}>✓</option>
                  <option value={0}>✗</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-ink/60 mb-1">{t('products_image')}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full text-sm"
                />
                {editing !== 'new' && editing.image_url && !imageFile && (
                  <img src={editing.image_url} alt="" className="mt-2 w-24 h-24 object-cover rounded-lg" />
                )}
              </div>
            </div>
            </div>
            <div className="px-6 md:px-8 py-4 border-t border-rose-100 flex-shrink-0 bg-white rounded-b-3xl space-y-3">
              {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm">{error}</div>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={close} className="px-5 py-2.5 rounded-full border border-rose-200 text-sm">
                  {t('products_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-burgundy text-cream rounded-full text-sm uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? '...' : t('products_save')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
