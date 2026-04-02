import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Package, Clock, CreditCard, ChevronRight, ShoppingCart } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function BusinessDashboard() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch orders
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch global settings (daily rate)
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeSettings();
    };
  }, [user]);

  const outstandingPayment = orders
    .filter(o => o.paymentStatus === 'pending')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const upcomingDeliveries = orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected');

  return (
    <div className="space-y-6">
      <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-orange-100 text-sm font-medium">Welcome back,</p>
          <h2 className="text-2xl font-bold">{profile?.businessName}</h2>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-orange-100 text-xs uppercase tracking-wider">Today's Rate</p>
              <p className="text-3xl font-bold">{settings ? formatCurrency(settings.dailyRate) : '---'}<span className="text-sm font-normal">/kg</span></p>
            </div>
            <Link 
              to="/business/order"
              className="bg-white text-orange-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-transform"
            >
              <ShoppingCart size={18} />
              Order Now
            </Link>
          </div>
        </div>
        <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-orange-500 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-3">
            <Clock size={20} />
          </div>
          <p className="text-gray-500 text-xs font-medium">Pending Orders</p>
          <p className="text-xl font-bold text-gray-900">{upcomingDeliveries.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-red-50 w-10 h-10 rounded-xl flex items-center justify-center text-red-600 mb-3">
            <CreditCard size={20} />
          </div>
          <p className="text-gray-500 text-xs font-medium">Outstanding</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(outstandingPayment)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Recent Orders</h3>
          <Link to="/business/history" className="text-orange-600 text-sm font-medium flex items-center">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
            <Package className="mx-auto text-gray-300 mb-2" size={40} />
            <p className="text-gray-500 text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    order.status === 'delivered' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                  )}>
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{order.items[0]?.type.replace('-', ' ')}...</p>
                    <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                  <p className={cn(
                    "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block",
                    order.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {order.status.replace('-', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        onClick={() => window.open('https://wa.me/917039728960', '_blank')}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        Support on WhatsApp
      </button>
    </div>
  );
}
