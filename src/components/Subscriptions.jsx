import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { CalendarDays, Plus, Minus, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { PRODUCT_DEFINITIONS, formatCurrency, getBusinessProductRates } from '../lib/utils';
import { useI18n } from '../lib/i18n';

const WEEKDAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

const emptyForm = {
  id: null,
  items: [],
  selectedDays: [],
  timeSlot: '08:00 AM - 10:00 AM',
  notes: '',
};

export default function Subscriptions() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [settings, setSettings] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      setSettings(settingsDoc.exists() ? settingsDoc.data() : null);
    });

    return () => unsubscribeSettings();
  }, []);

  useEffect(() => {
    if (!user) return;

    const subscriptionsQuery = query(
      collection(db, 'subscriptions'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      subscriptionsQuery,
      (snapshot) => {
        setSubscriptions(snapshot.docs.map((subscriptionDoc) => ({ id: subscriptionDoc.id, ...subscriptionDoc.data() })));
      }
    );

    return () => unsubscribe();
  }, [user]);

  const productRates = useMemo(
    () => getBusinessProductRates(settings, profile),
    [settings, profile]
  );
  const formTotal = useMemo(
    () => form.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.pricePerKg) || 0), 0),
    [form.items]
  );

  const toggleItem = (type) => {
    setForm((current) => {
      const existing = current.items.find((item) => item.type === type);
      if (existing) {
        return { ...current, items: current.items.filter((item) => item.type !== type) };
      }
      return {
        ...current,
        items: [...current.items, { type, quantity: 1, pricePerKg: productRates[type] || 0 }],
      };
    });
  };

  const updateQuantity = (index, delta) => {
    setForm((current) => {
      const items = [...current.items];
      items[index].quantity = Math.max(0.5, items[index].quantity + delta);
      return { ...current, items };
    });
  };

  const updateQuantityInput = (index, value) => {
    setForm((current) => {
      const items = [...current.items];
      const parsed = parseFloat(value);
      items[index].quantity = Number.isNaN(parsed) ? '' : Math.max(0.5, parsed);
      return { ...current, items };
    });
  };

  const toggleDay = (dayId) => {
    setForm((current) => ({
      ...current,
      selectedDays: current.selectedDays.includes(dayId)
        ? current.selectedDays.filter((day) => day !== dayId)
        : [...current.selectedDays, dayId],
    }));
  };

  const editSubscription = (subscription) => {
    setForm({
      id: subscription.id,
      items: subscription.items || [],
      selectedDays: subscription.selectedDays || [],
      timeSlot: subscription.timeSlot || '08:00 AM - 10:00 AM',
      notes: subscription.notes || '',
    });
  };

  const cancelSubscription = async (subscriptionId) => {
    await updateDoc(doc(db, 'subscriptions', subscriptionId), { active: false });
  };

  const submitSubscription = async (e) => {
    e.preventDefault();
    if (!user || form.items.length === 0 || form.selectedDays.length === 0) return;

    setLoading(true);
    const payload = {
      customerId: user.uid,
      customerName: profile?.businessName || 'Unknown',
      customerAddress: profile?.address || '',
      customerPhone: profile?.contact || '',
      items: form.items,
      selectedDays: form.selectedDays,
      timeSlot: form.timeSlot,
      notes: form.notes,
      active: true,
      generatedDates: [],
      updatedAt: serverTimestamp(),
    };

    try {
      if (form.id) {
        await updateDoc(doc(db, 'subscriptions', form.id), payload);
      } else {
        await addDoc(collection(db, 'subscriptions'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">{t('subscription.title', 'Subscriptions')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('subscription.autoInfo', 'Orders are auto-created on scheduled days using your latest subscription details.')}</p>
      </div>

      <form onSubmit={submitSubscription} className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900">{form.id ? t('subscription.edit', 'Edit Subscription') : t('subscription.new', 'New Subscription')}</h3>

        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_DEFINITIONS.map((product) => {
            const selected = form.items.some((item) => item.type === product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleItem(product.id)}
                className={`rounded-2xl border p-3 text-sm text-center transition-colors ${
                  selected ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white'
                }`}
              >
                <p className="font-bold">{product.name}</p>
                <p className="text-xs mt-1">{formatCurrency(productRates[product.id] || 0)}/kg</p>
              </button>
            );
          })}
        </div>

        {form.items.length > 0 && (
          <div className="space-y-2">
            {form.items.map((item, index) => (
              <div key={item.type} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div>
                  <p className="font-bold text-gray-900">{PRODUCT_DEFINITIONS.find((product) => product.id === item.type)?.name || item.type}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.pricePerKg)}/kg</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(index, -0.5)} className="p-1 text-gray-500"><Minus size={16} /></button>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={item.quantity}
                    onChange={(e) => updateQuantityInput(index, e.target.value)}
                    className="w-14 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm font-bold"
                  />
                  <button type="button" onClick={() => updateQuantity(index, 0.5)} className="p-1 text-gray-500"><Plus size={16} /></button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 p-3">
              <p className="text-sm font-bold text-orange-900">{t('subscription.total', 'Total Price')}</p>
              <p className="text-lg font-black text-orange-600">{formatCurrency(formTotal)}</p>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
            <CalendarDays size={12} /> {t('subscription.days', 'Delivery Days')}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`rounded-xl px-3 py-2 text-sm font-bold border ${
                  form.selectedDays.includes(day.id)
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Time Slot</label>
            <select
              value={form.timeSlot}
              onChange={(e) => setForm((current) => ({ ...current, timeSlot: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
            >
              <option>08:00 AM - 10:00 AM</option>
              <option>10:00 AM - 12:00 PM</option>
              <option>12:00 PM - 02:00 PM</option>
              <option>04:00 PM - 06:00 PM</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-2xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading
              ? t('common.save', 'Save')
              : form.id
                ? t('subscription.saveEdit', 'Update Subscription')
                : t('subscription.saveNew', 'Create Subscription')}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded-2xl border border-gray-200 px-4 py-3 font-bold text-gray-600"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {subscriptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            {t('subscription.noSubscriptions', 'No subscriptions yet')}
          </div>
        ) : subscriptions.map((subscription) => (
          <div key={subscription.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{subscription.active ? t('subscription.active', 'Active') : t('common.cancel', 'Cancelled')}</p>
                <p className="text-xs text-gray-500">{(subscription.selectedDays || []).join(', ')}</p>
                <p className="text-sm font-bold text-orange-600 mt-1">
                  {formatCurrency((subscription.items || []).reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.pricePerKg) || 0), 0))}
                </p>
              </div>
              <div className="flex gap-2">
                {subscription.active && (
                  <button
                    type="button"
                    onClick={() => editSubscription(subscription)}
                    className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700"
                  >
                    {t('subscription.edit', 'Edit Subscription')}
                  </button>
                )}
                {subscription.active && (
                  <button
                    type="button"
                    onClick={() => cancelSubscription(subscription.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                  >
                    {t('subscription.cancelSubscription', 'Cancel Subscription')}
                  </button>
                )}
              </div>
            </div>

            {(subscription.items || []).map((item) => (
              <div key={item.type} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-800">{PRODUCT_DEFINITIONS.find((product) => product.id === item.type)?.name || item.type}</p>
                <p className="text-sm font-bold text-gray-900">{item.quantity}kg</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
