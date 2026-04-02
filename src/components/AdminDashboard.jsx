import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { Package, Users, TrendingUp, Clock, CheckCircle, Truck, XCircle, CreditCard } from 'lucide-react';
import { db } from '../firebase';
import { cn, formatCurrency, getPaymentStatusMeta, getProductLabel, getProductRates } from '../lib/utils';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      if (settingsDoc.exists()) setSettings(settingsDoc.data());
    });

    const qCustomers = query(collection(db, 'users'), where('role', '==', 'business'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map((customerDoc) => customerDoc.data()));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeSettings();
      unsubscribeCustomers();
    };
  }, []);

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === 'placed' || order.status === 'confirmed').length,
    collectedRevenue: orders.filter((order) => order.paymentStatus === 'paid').reduce((acc, order) => acc + order.totalAmount, 0),
    outstandingAmount: orders.filter((order) => order.status === 'delivered' && order.paymentStatus !== 'paid').reduce((acc, order) => acc + order.totalAmount, 0),
    activeCustomers: customers.length,
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus,
        paymentConfirmedAt: paymentStatus === 'paid' ? serverTimestamp() : null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const productRates = getProductRates(settings);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-bold">Breast Boneless</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(productRates['breast-boneless'] || 0)}/kg</p>
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
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Paid Revenue</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.collectedRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 mb-2">
            <Clock size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Pending</p>
          <p className="text-xl font-bold text-gray-900">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center text-red-600 mb-2">
            <CreditCard size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Outstanding</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.outstandingAmount)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-purple-50 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600">
            <Users size={16} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Customers</p>
            <p className="text-xl font-bold text-gray-900">{stats.activeCustomers}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900">Incoming Orders</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const paymentMeta = getPaymentStatusMeta(order.paymentStatus);

              return (
                <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{getProductLabel(order.items?.[0]?.type)}{order.items?.length > 1 ? '...' : ''}</p>
                      <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{formatCurrency(order.totalAmount)}</p>
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
                    {order.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => updatePaymentStatus(order.id, 'paid')}
                        className="flex-shrink-0 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <CreditCard size={14} /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
