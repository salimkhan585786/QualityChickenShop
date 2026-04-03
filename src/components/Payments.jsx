import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CreditCard, Package, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { cn, formatCurrency, getPaymentStatusMeta, getProductLabel } from '../lib/utils';

const UPI_ID = 'sk9022522568@okhdfcbank';
const G_PAY_PAYEE_NAME = 'Quality Chicken Shop';

function buildGooglePayLink(order) {
  const amount = Number(order.totalAmount || 0).toFixed(2);
  const note = encodeURIComponent(`Order ${order.id.slice(-6)} payment`);
  const payeeName = encodeURIComponent(G_PAY_PAYEE_NAME);
  const upiId = encodeURIComponent(UPI_ID);
  return `tez://upi/pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;
}

export default function Payments() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      where('status', '==', 'delivered'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const payableOrders = orders.filter((order) => order.paymentStatus !== 'paid');

  const handlePay = async (order) => {
    setProcessingId(order.id);

    try {
      window.location.href = buildGooglePayLink(order);

      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: 'payment-submitted',
        paymentSubmittedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-sm text-gray-500">Delivered orders waiting for payment or admin confirmation</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-bold">UPI ID</p>
          <p className="text-sm font-bold text-orange-600">{UPI_ID}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : payableOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
          <CreditCard className="mx-auto text-gray-300 mb-2" size={40} />
          <p className="text-gray-500 font-medium">No unpaid delivered orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payableOrders.map((order) => {
            const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
            const isSubmitted = order.paymentStatus === 'payment-submitted';

            return (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{getProductLabel(order.items?.[0]?.type)}{order.items?.length > 1 ? '...' : ''}</p>
                      <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                    <p className={cn(
                      'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block text-center',
                      paymentMeta.className
                    )}>
                      {paymentMeta.label}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                  <span>Order ID: {order.id.slice(-6)}</span>
                  <span>Pay to {UPI_ID}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handlePay(order)}
                  disabled={processingId === order.id || isSubmitted}
                  className="w-full bg-orange-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ExternalLink size={16} />
                  {isSubmitted
                    ? 'Payment Sent, Waiting for Admin'
                    : processingId === order.id
                      ? 'Opening Google Pay...'
                      : 'Pay with Google Pay'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
