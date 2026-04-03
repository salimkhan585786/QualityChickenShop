import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { MapPin, Phone, Truck, CheckCircle, NotebookPen, History, Filter, Calendar, CalendarRange, IndianRupee } from 'lucide-react';
import { formatCurrency, formatOrderItems, getOrderDetailsPath } from '../lib/utils';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    if (!user) return;

    const activeQuery = query(
      collection(db, 'orders'),
      where('deliveryBoyId', '==', user.uid),
      where('status', 'in', ['packed', 'out-for-delivery']),
      orderBy('createdAt', 'desc')
    );

    const completedQuery = query(
      collection(db, 'orders'),
      where('deliveryBoyId', '==', user.uid),
      where('status', '==', 'delivered'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      setActiveOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
      setLoading(false);
    });

    const unsubscribeCompleted = onSnapshot(completedQuery, (snapshot) => {
      setCompletedOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
    });

    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
    };
  }, [user]);

  const updateStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCompletedOrders = completedOrders.filter((order) => {
    const matchesSelectedDate = !selectedDate || order.deliveryDate === selectedDate;
    const matchesDateFrom = !dateFrom || order.deliveryDate >= dateFrom;
    const matchesDateTo = !dateTo || order.deliveryDate <= dateTo;
    const matchesMinPrice = minPrice === '' || order.totalAmount >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === '' || order.totalAmount <= parseFloat(maxPrice);

    return matchesSelectedDate && matchesDateFrom && matchesDateTo && matchesMinPrice && matchesMaxPrice;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <Truck className="mx-auto text-gray-300 mb-2" size={48} />
          <p className="text-gray-500 font-medium">No active deliveries</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map((order) => (
            <div key={order.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <Link to={getOrderDetailsPath('delivery', order.id)} className="block space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg">{order.customerName}</h3>
                    <p className="text-sm text-gray-500 break-words">{formatOrderItems(order.items)}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{order.timeSlot}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-orange-600">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order ID: {order.id.slice(-6)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <MapPin size={16} className="text-orange-500 flex-shrink-0" />
                    <span>{order.customerAddress || 'Address not available'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <NotebookPen size={16} className="text-orange-500 flex-shrink-0" />
                    <span>{order.notes || 'No special instructions'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-xl font-bold">
                    <Phone size={16} />
                    <span>{order.customerPhone || 'Phone not available'}</span>
                  </div>
                </div>
              </Link>

              <div className="flex gap-2 pt-2">
                {order.status === 'packed' && (
                  <button
                    onClick={() => updateStatus(order.id, 'out-for-delivery')}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                  >
                    <Truck size={18} /> Start Delivery
                  </button>
                )}
                {order.status === 'out-for-delivery' && (
                  <button
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                  >
                    <CheckCircle size={18} /> Mark Delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History size={18} className="text-gray-500" />
            <h3 className="font-bold text-gray-900">Previous Deliveries</h3>
          </div>
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
                />
              </div>
            </div>
          </div>
        )}

        {filteredCompletedOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No completed deliveries match these filters
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCompletedOrders.map((order) => (
              <Link
                key={order.id}
                to={getOrderDetailsPath('delivery', order.id)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start gap-4 transition-colors hover:border-orange-200"
              >
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{order.customerName}</p>
                  <p className="text-sm text-gray-500 break-words">{formatOrderItems(order.items)}</p>
                  <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-600">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block bg-green-100 text-green-700">
                    Delivered
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
