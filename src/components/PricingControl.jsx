import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { TrendingUp, Save } from 'lucide-react';
import { db } from '../firebase';
import { PRODUCT_DEFINITIONS, formatCurrency, getProductRates } from '../lib/utils';

export default function PricingControl() {
  const [settings, setSettings] = useState(null);
  const [productRates, setProductRates] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      const data = settingsDoc.exists() ? settingsDoc.data() : null;
      setSettings(data);
      setProductRates(getProductRates(data));
    });

    return () => unsubscribe();
  }, []);

  const handleRateChange = (productId, value) => {
    setProductRates((current) => ({
      ...current,
      [productId]: value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        productRates: Object.fromEntries(
          PRODUCT_DEFINITIONS.map((product) => [product.id, parseFloat(productRates[product.id]) || 0])
        ),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert('Daily product rates updated successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pricing Control</h2>

      <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-lg">
        <p className="text-orange-100 text-sm font-medium">Global Daily Rates</p>
        <div className="mt-3 space-y-2">
          {PRODUCT_DEFINITIONS.map((product) => (
            <div key={product.id} className="flex items-center justify-between text-sm">
              <span>{product.name}</span>
              <span className="font-bold">{formatCurrency(getProductRates(settings)[product.id] || 0)}/kg</span>
            </div>
          ))}
        </div>
        <p className="text-orange-100 text-xs mt-3">
          Last updated: {settings?.updatedAt?.toDate().toLocaleString() || 'Never'}
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <form onSubmit={handleUpdate} className="space-y-4">
          {PRODUCT_DEFINITIONS.map((product) => (
            <div key={product.id} className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-600" />
                {product.name} Rate
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rs</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-4 rounded-2xl text-xl font-bold focus:ring-orange-500 focus:border-orange-500"
                  value={productRates[product.id] ?? ''}
                  onChange={(e) => handleRateChange(product.id, e.target.value)}
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Updating...' : 'Update Daily Rates'}
          </button>
        </form>
      </div>
    </div>
  );
}
