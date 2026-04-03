import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Package, Calendar, CalendarRange, IndianRupee, Filter } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import { cn, formatCurrency, formatOrderItems, getOrderDetailsPath, getPaymentStatusMeta } from '../lib/utils';

export default function OrderHistory() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingPaymentId, setSubmittingPaymentId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markPaymentSubmitted = async (orderId) => {
    setSubmittingPaymentId(orderId);

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: 'payment-submitted',
        paymentSubmittedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPaymentId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSelectedDate = !selectedDate || order.deliveryDate === selectedDate;
    const matchesDateFrom = !dateFrom || order.deliveryDate >= dateFrom;
    const matchesDateTo = !dateTo || order.deliveryDate <= dateTo;
    const matchesMinPrice = minPrice === '' || order.totalAmount >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === '' || order.totalAmount <= parseFloat(maxPrice);

    return matchesSelectedDate && matchesDateFrom && matchesDateTo && matchesMinPrice && matchesMaxPrice;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          className={`p-2 rounded-xl border transition-colors ${showFilters ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500'}`}
        >
          <Filter size={18} />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-orange-600" />
            <h3 className="font-bold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Calendar size={12} /> Exact Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <CalendarRange size={12} /> Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <CalendarRange size={12} /> Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <IndianRupee size={12} /> Min Price
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="0"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <IndianRupee size={12} /> Max Price
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <Package className="mx-auto text-gray-300 mb-2" size={48} />
          <p className="text-gray-500 font-medium">No orders match these filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const paymentMeta = getPaymentStatusMeta(order.paymentStatus);

            return (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <Link to={getOrderDetailsPath(profile?.role, order.id)} className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      order.status === 'delivered' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                    )}>
                      <Package size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 break-words">{formatOrderItems(order.items)}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} /> {order.deliveryDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                    <p className={cn(
                      'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block',
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    )}>
                      {order.status.replace('-', ' ')}
                    </p>
                    <p className={cn(
                      'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-1',
                      paymentMeta.className
                    )}>
                      {paymentMeta.label}
                    </p>
                  </div>
                </Link>

                {order.status === 'delivered' && order.paymentStatus !== 'paid' && (
                  <button
                    onClick={() => markPaymentSubmitted(order.id)}
                    disabled={order.paymentStatus === 'payment-submitted' || submittingPaymentId === order.id}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    {order.paymentStatus === 'payment-submitted'
                      ? 'Payment Waiting for Admin Confirmation'
                      : submittingPaymentId === order.id
                        ? 'Updating...'
                        : 'I Have Paid'}
                  </button>
                )}

                {['placed', 'confirmed'].includes(order.status) && (
                  <Link
                    to={`/business/order/${order.id}`}
                    className="block w-full bg-orange-100 text-orange-700 py-2.5 rounded-xl text-sm font-bold text-center"
                  >
                    Edit Order
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
