import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Minus, Trash2, Calendar, Clock, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { PRODUCT_DEFINITIONS, formatCurrency, getBusinessProductRates, getProductLabel } from '../lib/utils';

export default function OrderForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const isEditMode = Boolean(orderId);

  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('08:00 AM - 10:00 AM');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [editLocked, setEditLocked] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      } else {
        setSettings(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isEditMode || !orderId || !user) return;

    const loadOrder = async () => {
      setInitializing(true);

      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          navigate('/business/history');
          return;
        }

        const orderData = orderSnap.data();
        const canEdit = orderData.customerId === user.uid && ['placed', 'confirmed'].includes(orderData.status);

        if (!canEdit) {
          setEditLocked(true);
          return;
        }

        setItems(orderData.items || []);
        setDeliveryDate(orderData.deliveryDate || new Date().toISOString().split('T')[0]);
        setTimeSlot(orderData.timeSlot || '08:00 AM - 10:00 AM');
        setNotes(orderData.notes || '');
      } catch (err) {
        console.error(err);
        navigate('/business/history');
      } finally {
        setInitializing(false);
      }
    };

    loadOrder();
  }, [db, isEditMode, navigate, orderId, user]);

  const productRates = getBusinessProductRates(settings, profile);

  const toggleItem = (type) => {
    setItems((current) => {
      const existingItem = current.find((item) => item.type === type);

      if (existingItem) {
        return current.filter((item) => item.type !== type);
      }

      const rate = productRates[type] || 0;
      return [...current, { type, quantity: 1, pricePerKg: rate }];
    });
  };

  const updateQuantity = (index, delta) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(0.5, newItems[index].quantity + delta);
    setItems(newItems);
  };

  const updateQuantityInput = (index, value) => {
    const parsedValue = parseFloat(value);
    const newItems = [...items];
    newItems[index].quantity = Number.isNaN(parsedValue) ? '' : Math.max(0.5, parsedValue);
    setItems(newItems);
  };

  const removeItem = (type) => {
    setItems((current) => current.filter((item) => item.type !== type));
  };

  const totalAmount = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * curr.pricePerKg, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || !user || editLocked) return;
    setLoading(true);

    try {
      if (isEditMode && orderId) {
        await updateDoc(doc(db, 'orders', orderId), {
          items,
          totalAmount,
          deliveryDate,
          timeSlot,
          notes,
          customerName: profile?.businessName || 'Unknown',
          customerAddress: profile?.address || '',
          customerPhone: profile?.contact || '',
        });
      } else {
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
          paymentStatus: 'unpaid',
          createdAt: serverTimestamp(),
        });
      }

      navigate('/business/history');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 text-sm text-gray-500">
        Loading order...
      </div>
    );
  }

  if (editLocked) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500">
        This order can no longer be edited because it has already been packed or moved ahead.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Order' : 'New Order'}</h2>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-gray-700">Select Product</p>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_DEFINITIONS.map((product) => {
            const isSelected = items.some((item) => item.type === product.id);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleItem(product.id)}
                className={`p-3 rounded-2xl text-sm font-medium transition-all text-center border ${
                  isSelected
                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-orange-500 active:bg-orange-50'
                }`}
              >
                <p className="font-bold">{product.name}</p>
                <p className="text-xs mt-1">{formatCurrency(productRates[product.id] || 0)}/kg</p>
              </button>
            );
          })}
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-700">Your Cart</p>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.type} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{getProductLabel(item.type)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.pricePerKg)}/kg</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button type="button" onClick={() => updateQuantity(index, -0.5)} className="p-1 text-gray-500"><Minus size={16} /></button>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      className="w-14 bg-transparent text-center font-bold text-sm outline-none"
                      value={item.quantity}
                      onChange={(e) => updateQuantityInput(index, e.target.value)}
                    />
                    <span className="text-xs text-gray-500 pr-1">kg</span>
                    <button type="button" onClick={() => updateQuantity(index, 0.5)} className="p-1 text-gray-500"><Plus size={16} /></button>
                  </div>
                  <button type="button" onClick={() => removeItem(item.type)} className="text-red-400 p-1"><Trash2 size={18} /></button>
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
          {loading ? (isEditMode ? 'Updating Order...' : 'Placing Order...') : (isEditMode ? 'Update Order' : 'Place Order Now')}
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
}
