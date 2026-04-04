import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ImagePlus, Save, TrendingUp } from 'lucide-react';
import { db } from '../firebase';
import { PRODUCT_DEFINITIONS, formatCurrency, getProductImages, getProductRates } from '../lib/utils';
import { useI18n } from '../lib/i18n';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PricingControl() {
  const { t } = useI18n();
  const [settings, setSettings] = useState(null);
  const [productRates, setProductRates] = useState({});
  const [productImages, setProductImages] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      const data = settingsDoc.exists() ? settingsDoc.data() : null;
      setSettings(data);
      setProductRates(getProductRates(data));
      setProductImages(getProductImages(data));
    });

    return () => unsubscribe();
  }, []);

  const handleRateChange = (productId, value) => {
    setProductRates((current) => ({
      ...current,
      [productId]: value,
    }));
  };

  const handleImageChange = async (productId, file) => {
    if (!file) return;

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setProductImages((current) => ({
        ...current,
        [productId]: imageDataUrl,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        productRates: Object.fromEntries(
          PRODUCT_DEFINITIONS.map((product) => [product.id, parseFloat(productRates[product.id]) || 0])
        ),
        productImages,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert(t('pricing.updatedSuccess', 'Daily product rates and images updated successfully!'));
    } catch (err) {
      console.error(err);
      alert(`Error updating rates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('pricing.title', 'Pricing Control')}</h2>

      <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-lg">
        <p className="text-orange-100 text-sm font-medium">{t('pricing.globalRates', 'Global Daily Rates')}</p>
        <div className="mt-3 space-y-2">
          {PRODUCT_DEFINITIONS.map((product) => (
            <div key={product.id} className="flex items-center justify-between text-sm">
              <span>{product.name}</span>
              <span className="font-bold">{formatCurrency(getProductRates(settings)[product.id] || 0)}/kg</span>
            </div>
          ))}
        </div>
        <p className="text-orange-100 text-xs mt-3">
          {t('pricing.lastUpdated', 'Last updated: {value}', { value: settings?.updatedAt?.toDate().toLocaleString() || t('pricing.never', 'Never') })}
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <form onSubmit={handleUpdate} className="space-y-5">
          {PRODUCT_DEFINITIONS.map((product) => {
            const productImage = productImages[product.id];

            return (
              <div key={product.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                <div
                  className="relative overflow-hidden rounded-2xl min-h-40 border border-gray-200 bg-gray-200 bg-cover bg-center"
                  style={productImage ? { backgroundImage: `url(${productImage})` } : undefined}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
                  <div className="relative z-10 flex min-h-40 flex-col justify-end p-4 text-white">
                    <p className="text-lg font-black">{product.name}</p>
                    <p className="text-sm font-bold">{formatCurrency(Number(productRates[product.id]) || 0)}/kg</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <TrendingUp size={18} className="text-orange-600" />
                    {t('pricing.rate', '{name} Rate', { name: product.name })}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rs</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full bg-white border border-gray-200 pl-12 pr-4 py-4 rounded-2xl text-xl font-bold focus:ring-orange-500 focus:border-orange-500"
                      value={productRates[product.id] ?? ''}
                      onChange={(e) => handleRateChange(product.id, e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <ImagePlus size={18} className="text-orange-600" />
                    {t('pricing.image', '{name} Image', { name: product.name })}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full rounded-2xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-700"
                    onChange={(e) => handleImageChange(product.id, e.target.files?.[0])}
                  />
                </div>
              </div>
            );
          })}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? t('pricing.updating', 'Updating...') : t('pricing.updateRates', 'Update Daily Rates')}
          </button>
        </form>
      </div>
    </div>
  );
}
