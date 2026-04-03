import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Truck, CheckCircle } from 'lucide-react';
import { cn, formatOrderItems, getOrderDetailsPath } from '../lib/utils';

export default function DeliveryManagement() {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), where('status', 'in', ['confirmed', 'packed', 'out-for-delivery']));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
      setLoading(false);
    });

    const qStaff = query(collection(db, 'users'), where('role', '==', 'delivery'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setDeliveryBoys(snapshot.docs.map((deliveryDoc) => ({ ...deliveryDoc.data(), uid: deliveryDoc.id })));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeStaff();
    };
  }, []);

  const assignDelivery = async (orderId, deliveryBoyId) => {
    try {
      const selectedBoy = deliveryBoys.find((boy) => boy.uid === deliveryBoyId);

      await updateDoc(doc(db, 'orders', orderId), {
        deliveryBoyId: deliveryBoyId || null,
        deliveryBoyName: deliveryBoyId
          ? (
              selectedBoy?.name ||
              selectedBoy?.fullName ||
              selectedBoy?.displayName ||
              selectedBoy?.businessName ||
              selectedBoy?.email ||
              'Assigned'
            )
          : null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Delivery Management</h2>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((item) => <div key={item} className="h-32 bg-gray-200 animate-pulse rounded-3xl"></div>)
        ) : orders.map((order) => (
          <div key={order.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <Link to={getOrderDetailsPath('admin', order.id)} className="block space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900">{order.customerName}</h3>
                  <p className="text-sm text-gray-500 break-words">{formatOrderItems(order.items)}</p>
                  <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                </div>
                <div className={cn(
                  'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full',
                  order.status === 'out-for-delivery' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                )}>
                  {order.status.replace('-', ' ')}
                </div>
              </div>
            </Link>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Truck size={12} /> Assign Delivery Staff
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
                value={order.deliveryBoyId || ''}
                onChange={(e) => assignDelivery(order.id, e.target.value)}
              >
                <option value="">Unassigned</option>
                {deliveryBoys.map((boy) => (
                  <option key={boy.uid} value={boy.uid}>{boy.businessName}</option>
                ))}
              </select>
            </div>

            {order.deliveryBoyId && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg font-medium">
                <CheckCircle size={14} /> Assigned to {deliveryBoys.find((boy) => boy.uid === order.deliveryBoyId)?.businessName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
