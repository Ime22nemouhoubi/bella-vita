import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { submitOrder } from '../api/client.js';
import { WILAYAS } from '../locales/wilayas.js';
import { COMMUNES } from '../locales/communes.js';

export default function Checkout() {
  const { t, lang } = useLang();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    wilaya: '',
    commune: '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) return <Navigate to="/cart" />;

  const update = (field, value) => {
    setForm((prev) => {
      // Reset commune whenever wilaya changes — old commune may not be in new wilaya
      if (field === 'wilaya') return { ...prev, wilaya: value, commune: '' };
      return { ...prev, [field]: value };
    });
  };

  // Communes for the currently selected wilaya (empty if no wilaya yet)
  const communesForWilaya = form.wilaya && COMMUNES[form.wilaya] ? COMMUNES[form.wilaya] : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.customer_name || !form.customer_phone || !form.wilaya || !form.commune || !form.address) {
      setError(t('checkout_required'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitOrder({
        ...form,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      clear();
      navigate(`/order/${result.id}`);
    } catch (err) {
      setError(err?.response?.data?.error || t('error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300';

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 fade-in">
      <h1 className="font-display text-4xl md:text-5xl text-ink mb-3 text-center">{t('checkout_title')}</h1>
      <p className="text-center text-ink/60 mb-10 max-w-xl mx-auto">{t('checkout_intro')}</p>

      <div className="grid lg:grid-cols-3 gap-10">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-6 md:p-8 space-y-5">
          <div>
            <label className="block text-sm text-ink/70 mb-2">{t('checkout_name')} *</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => update('customer_name', e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-ink/70 mb-2">{t('checkout_phone')} *</label>
              <input
                type="tel"
                value={form.customer_phone}
                onChange={(e) => update('customer_phone', e.target.value)}
                className={inputCls}
                placeholder="+213 ..."
                required
              />
            </div>
            <div>
              <label className="block text-sm text-ink/70 mb-2">{t('checkout_wilaya')} *</label>
              <select
                value={form.wilaya}
                onChange={(e) => update('wilaya', e.target.value)}
                className={inputCls}
                required
              >
                <option value="">{t('checkout_wilaya_select')}</option>
                {WILAYAS.map(([fr, ar]) => {
                  const label = lang === 'ar' ? ar : fr;
                  return <option key={fr} value={fr}>{label}</option>;
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-2">{t('checkout_commune')} *</label>
            <select
              value={form.commune}
              onChange={(e) => update('commune', e.target.value)}
              className={inputCls + (form.wilaya ? '' : ' opacity-60 cursor-not-allowed')}
              required
              disabled={!form.wilaya}
            >
              <option value="">
                {form.wilaya ? t('checkout_commune_select') : t('checkout_select_wilaya_first')}
              </option>
              {communesForWilaya.map(({ fr, ar }) => {
                const label = lang === 'ar' ? ar : fr;
                return <option key={fr} value={fr}>{label}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-2">{t('checkout_address')} *</label>
            <textarea
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className={inputCls}
              rows="3"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-ink/70 mb-2">{t('checkout_notes')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className={inputCls}
              rows="2"
            />
          </div>
          {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-8 py-4 bg-burgundy text-cream rounded-full hover:bg-rose-700 uppercase tracking-wider text-sm disabled:opacity-50"
          >
            {submitting ? t('loading') : t('checkout_submit')}
          </button>
          <p className="text-xs text-ink/50 text-center">{t('checkout_payment_note')}</p>
        </form>

        <aside className="bg-sand/40 rounded-2xl p-6 h-fit border border-rose-100">
          <h2 className="font-display text-2xl text-ink mb-4">{t('checkout_summary')}</h2>
          <div className="space-y-3 mb-5 max-h-[400px] overflow-y-auto">
            {items.map((item) => {
              const name = lang === 'ar' ? item.name_ar : item.name_fr;
              return (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span className="flex-1 truncate pe-2">
                    {name} <span className="text-ink/50">× {item.quantity}</span>
                  </span>
                  <span className="font-medium">
                    {(item.price * item.quantity).toLocaleString()} {t('currency')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-rose-200 pt-4 flex justify-between items-baseline">
            <span className="text-sm uppercase tracking-wider text-ink/60">{t('cart_total')}</span>
            <span className="font-display text-3xl text-burgundy">
              {total.toLocaleString()} {t('currency')}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
