import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Users, Phone, MapPin, Save } from 'lucide-react';
import { db } from '../firebase';
import { PRODUCT_DEFINITIONS, formatCurrency, getBusinessProductRates, getProductRates } from '../lib/utils';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftRates, setDraftRates] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'business'));
    const unsubscribeCustomers = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map((customerDoc) => ({ ...customerDoc.data(), uid: customerDoc.id })));
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      setSettings(settingsDoc.exists() ? settingsDoc.data() : null);
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeSettings();
    };
  }, []);

  const startEditing = (customer) => {
    setEditingId(customer.uid);
    setDraftRates(getBusinessProductRates(settings, customer));
  };

  const handleDraftRateChange = (productId, value) => {
    setDraftRates((current) => ({
      ...current,
      [productId]: value,
    }));
  };

  const saveCustomRates = async (customer) => {
    setLoading(true);

    try {
      const globalRates = getProductRates(settings);
      const customProductRates = {};

      PRODUCT_DEFINITIONS.forEach((product) => {
        const rawValue = draftRates[product.id];
        const parsedValue = parseFloat(rawValue);

        if (!Number.isNaN(parsedValue) && parsedValue !== globalRates[product.id]) {
          customProductRates[product.id] = parsedValue;
        }
      });

      await updateDoc(doc(db, 'users', customer.uid), {
        customProductRates,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Customers</h2>

      <div className="space-y-4">
        {customers.map((customer) => {
          const effectiveRates = getBusinessProductRates(settings, customer);

          return (
            <div key={customer.uid} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex gap-3">
                <div className="bg-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{customer.businessName}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {customer.contact}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
                <MapPin size={14} className="flex-shrink-0" />
                <span className="line-clamp-1">{customer.address}</span>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">Business Rates</p>
                  {editingId === customer.uid ? (
                    <button
                      onClick={() => saveCustomRates(customer)}
                      disabled={loading}
                      className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {loading ? 'Saving...' : 'Save Rates'}
                    </button>
                  ) : (
                    <button
                      onClick={() => startEditing(customer)}
                      className="bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-bold"
                    >
                      Edit Custom Rates
                    </button>
                  )}
                </div>

                {PRODUCT_DEFINITIONS.map((product) => (
                  <div key={product.id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        Global: {formatCurrency(getProductRates(settings)[product.id] || 0)}/kg
                      </p>
                    </div>
                    {editingId === customer.uid ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-28 bg-white border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-right"
                        value={draftRates[product.id] ?? ''}
                        onChange={(e) => handleDraftRateChange(product.id, e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-bold text-orange-600">{formatCurrency(effectiveRates[product.id] || 0)}/kg</p>
                    )}
                  </div>
                ))}

                {editingId === customer.uid && (
                  <p className="text-xs text-gray-500">
                    Leave any product equal to the global rate if you do not want a special business rate for that product.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
