import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Package, Calendar } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { cn, formatCurrency, getPaymentStatusMeta, getProductLabel } from '../lib/utils';

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingPaymentId, setSubmittingPaymentId] = useState(null);

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Order History</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <Package className="mx-auto text-gray-300 mb-2" size={48} />
          <p className="text-gray-500 font-medium">No past orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const paymentMeta = getPaymentStatusMeta(order.paymentStatus);

            return (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      order.status === 'delivered' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                    )}>
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{getProductLabel(order.items?.[0]?.type)}{order.items?.length > 1 ? '...' : ''}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} /> {order.deliveryDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
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
                </div>

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
