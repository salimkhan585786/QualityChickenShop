import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Phone, MapPin, Edit2, Save, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'business'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const handleUpdatePrice = async (uid) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        customPrice: editPrice === '' ? null : parseFloat(editPrice),
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
        {customers.map((customer) => (
          <div key={customer.uid} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="bg-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{customer.businessName}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {customer.contact}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</p>
                <p className="font-bold text-orange-600">
                  {customer.customPrice ? formatCurrency(customer.customPrice) : 'Global Rate'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="line-clamp-1">{customer.address}</span>
            </div>

            {editingId === customer.uid ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Custom rate (leave empty for global)"
                  className="flex-1 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
                <button 
                  onClick={() => handleUpdatePrice(customer.uid)}
                  disabled={loading}
                  className="bg-green-600 text-white p-2 rounded-xl"
                >
                  <Save size={20} />
                </button>
                <button 
                  onClick={() => setEditingId(null)}
                  className="bg-gray-200 text-gray-600 p-2 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setEditingId(customer.uid);
                  setEditPrice(customer.customPrice?.toString() || '');
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Edit Pricing
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
