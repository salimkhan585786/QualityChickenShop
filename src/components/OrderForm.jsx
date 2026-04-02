import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, Calendar, Clock, ArrowRight } from 'lucide-react';

const PRODUCT_TYPES = [
  { id: 'whole', name: 'Whole Chicken' },
  { id: 'curry-cut', name: 'Curry Cut' },
  { id: 'boneless', name: 'Boneless' },
  { id: 'custom-cut', name: 'Custom Cut' },
];

export default function OrderForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('08:00 AM - 10:00 AM');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const addItem = (type) => {
    const rate = profile?.customPrice || settings?.dailyRate || 0;
    setItems([...items, { type, quantity: 1, pricePerKg: rate }]);
  };

  const updateQuantity = (index, delta) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(0.5, newItems[index].quantity + delta);
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((acc, curr) => acc + curr.quantity * curr.pricePerKg, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || !user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'orders'), {
        customerId: user.uid,
        customerName: profile?.businessName || 'Unknown',
        customerAddress: profile?.address || '',
        customerPhone: profile?.contact || '',
        items,
        totalAmount,
        status: 'placed',
        deliveryDate,
        timeSlot,
        notes,
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
      });
      navigate('/business');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">New Order</h2>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-bold">Current Rate</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(profile?.customPrice || settings?.dailyRate || 0)}/kg</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-gray-700">Select Product</p>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_TYPES.map(p => (
            <button
              key={p.id}
              onClick={() => addItem(p.id)}
              className="bg-white border border-gray-200 p-3 rounded-2xl text-sm font-medium hover:border-orange-500 active:bg-orange-50 transition-all text-center"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-700">Your Cart</p>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 capitalize">{item.type.replace('-', ' ')}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.pricePerKg)}/kg</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button onClick={() => updateQuantity(index, -0.5)} className="p-1 text-gray-500"><Minus size={16} /></button>
                    <span className="w-12 text-center font-bold text-sm">{item.quantity}kg</span>
                    <button onClick={() => updateQuantity(index, 0.5)} className="p-1 text-gray-500"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeItem(index)} className="text-red-400 p-1"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Calendar size={12} /> Date
            </label>
            <input
              type="date"
              required
              className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Clock size={12} /> Slot
            </label>
            <select
              className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            >
              <option>08:00 AM - 10:00 AM</option>
              <option>10:00 AM - 12:00 PM</option>
              <option>12:00 PM - 02:00 PM</option>
              <option>04:00 PM - 06:00 PM</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">Special Instructions</label>
          <textarea
            placeholder="e.g. Extra small pieces, skinless..."
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
          <p className="font-bold text-orange-900">Total Amount</p>
          <p className="text-2xl font-black text-orange-600">{formatCurrency(totalAmount)}</p>
        </div>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Placing Order...' : 'Place Order Now'}
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
}
