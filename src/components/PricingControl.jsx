import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, Save } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function PricingControl() {
  const [settings, setSettings] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSettings(data);
        setNewRate(data.dailyRate.toString());
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        dailyRate: parseFloat(newRate),
        updatedAt: serverTimestamp(),
      });
      alert('Price updated successfully!');
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
        <p className="text-orange-100 text-sm font-medium">Current Daily Rate</p>
        <h3 className="text-4xl font-black mt-1">{settings ? formatCurrency(settings.dailyRate) : '---'}<span className="text-lg font-normal">/kg</span></h3>
        <p className="text-orange-100 text-xs mt-2">Last updated: {settings?.updatedAt?.toDate().toLocaleString() || 'Never'}</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-600" />
              Set New Daily Rate (per kg)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-gray-50 border border-gray-200 pl-8 pr-4 py-4 rounded-2xl text-xl font-bold focus:ring-orange-500 focus:border-orange-500"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Updating...' : 'Update Price Instantly'}
          </button>
        </form>
      </div>

      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Pro Tip:</strong> Updating the daily rate will instantly reflect for all business users when they place new orders. Custom pricing for specific clients will override this global rate.
        </p>
      </div>
    </div>
  );
}
