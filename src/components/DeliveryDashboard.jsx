import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { MapPin, Phone, Truck, CheckCircle, NotebookPen, History } from 'lucide-react';
import { formatCurrency, getProductLabel } from '../lib/utils';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-2xl"></div>)}
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{order.customerName}</h3>
                  <p className="text-sm text-gray-500">{getProductLabel(order.items?.[0]?.type)}{order.items?.length > 1 ? '...' : ''}</p>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{order.timeSlot}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order ID: {order.id.slice(-6)}</p>
                </div>
              </div>

              <div className="space-y-2">
<div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
  <MapPin size={16} className="text-orange-500 flex-shrink-0" />
  <span className="line-clamp-2">{order.customerAddress || 'Address not available'}</span>
</div>
                 <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  <NotebookPen size={16} className="text-orange-500 flex-shrink-0" />
                  <span className="line-clamp-2">{order.notes || 'No special instructions'}</span>
                </div>
               <a
  href={order.customerPhone ? `tel:${order.customerPhone}` : undefined}
  className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-xl font-bold"
>
  <Phone size={16} /> {order.customerPhone || 'Phone not available'}
</a>
              </div>

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
        <div className="flex items-center gap-2">
          <History size={18} className="text-gray-500" />
          <h3 className="font-bold text-gray-900">Previous Deliveries</h3>
        </div>
        {completedOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No completed deliveries yet
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{order.customerName}</p>
                  <p className="text-sm text-gray-500">{getProductLabel(order.items?.[0]?.type)}{order.items?.length > 1 ? '...' : ''}</p>
                  <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block bg-green-100 text-green-700">
                    Delivered
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
