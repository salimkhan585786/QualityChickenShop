import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, Users, TrendingUp, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all orders
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch global settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data());
    });

    // Fetch customers
    const qCustomers = query(collection(db, 'users'), where('role', '==', 'business'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeSettings();
      unsubscribeCustomers();
    };
  }, []);

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'placed' || o.status === 'confirmed').length,
    totalRevenue: orders.filter(o => o.status === 'delivered').reduce((acc, curr) => acc + curr.totalAmount, 0),
    activeCustomers: customers.length,
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-bold">Daily Rate</p>
          <p className="text-lg font-bold text-orange-600">{settings ? formatCurrency(settings.dailyRate) : '---'}/kg</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-orange-50 w-8 h-8 rounded-lg flex items-center justify-center text-orange-600 mb-2">
            <Package size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Orders Today</p>
          <p className="text-xl font-bold text-gray-900">{stats.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-green-50 w-8 h-8 rounded-lg flex items-center justify-center text-green-600 mb-2">
            <TrendingUp size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 mb-2">
            <Clock size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Pending</p>
          <p className="text-xl font-bold text-gray-900">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-purple-50 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 mb-2">
            <Users size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Customers</p>
          <p className="text-xl font-bold text-gray-900">{stats.activeCustomers}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900">Incoming Orders</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{formatCurrency(order.totalAmount)}</p>
                    <p className={cn(
                      "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block",
                      order.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {order.status.replace('-', ' ')}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {order.status === 'placed' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      className="flex-shrink-0 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <CheckCircle size={14} /> Confirm
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'packed')}
                      className="flex-shrink-0 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Package size={14} /> Packed
                    </button>
                  )}
                  {order.status === 'packed' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'out-for-delivery')}
                      className="flex-shrink-0 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Truck size={14} /> Out for Delivery
                    </button>
                  )}
                  {order.status !== 'delivered' && order.status !== 'rejected' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'rejected')}
                      className="flex-shrink-0 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
