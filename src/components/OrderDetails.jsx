import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CreditCard, MapPin, NotebookPen, Package, Phone, Truck, User } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { cn, formatCurrency, getPaymentStatusMeta, getProductLabel } from '../lib/utils';

export default function OrderDetails() {
  const { user, profile } = useAuth();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [deliveryStaffName, setDeliveryStaffName] = useState('Unassigned');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (settingsDoc) => {
      setSettings(settingsDoc.exists() ? settingsDoc.data() : null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!orderId || !user || !profile) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (orderSnap) => {
      if (!orderSnap.exists()) {
        setOrder(null);
        setDeliveryStaffName('Unassigned');
        setLoading(false);
        return;
      }

      const orderData = { id: orderSnap.id, ...orderSnap.data() };
      const canView =
        profile.role === 'admin' ||
        (profile.role === 'business' && orderData.customerId === user.uid) ||
        (profile.role === 'delivery' && orderData.deliveryBoyId === user.uid);

      setAccessDenied(!canView);
      setOrder(canView ? orderData : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, profile, user]);

  useEffect(() => {
    if (!order?.deliveryBoyId) {
      setDeliveryStaffName('Unassigned');
      return;
    }

    setDeliveryStaffName(order.deliveryBoyName || 'Assigned');

    const unsubscribe = onSnapshot(
      doc(db, 'users', order.deliveryBoyId),
      (userSnap) => {
        if (!userSnap.exists()) {
          setDeliveryStaffName(order.deliveryBoyName || 'Assigned');
          return;
        }

        const deliveryProfile = userSnap.data();
        setDeliveryStaffName(
          deliveryProfile?.name ||
          deliveryProfile?.fullName ||
          deliveryProfile?.displayName ||
          deliveryProfile?.businessName ||
          deliveryProfile?.email ||
          order.deliveryBoyName ||
          'Assigned'
        );
      },
      () => {
        setDeliveryStaffName(order.deliveryBoyName || 'Assigned');
      }
    );

    return () => unsubscribe();
  }, [order?.deliveryBoyId, order?.deliveryBoyName]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 text-sm text-gray-500">
        Loading order details...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500">
        You do not have access to view this order.
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500">
        Order not found.
      </div>
    );
  }

  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const backPath = `/${profile.role}`;
  const productImages = settings?.productImages || {};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <Link to={backPath} className="text-sm font-medium text-orange-600">
          Dashboard
        </Link>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{order.customerName || 'Order Details'}</h2>
            <p className="text-xs text-gray-500 mt-1">Order ID: {order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-orange-600">{formatCurrency(order.totalAmount || 0)}</p>
            <p className={cn(
              'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2',
              order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            )}>
              {order.status?.replace('-', ' ')}
            </p>
            <p className={cn(
              'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2',
              paymentMeta.className
            )}>
              {paymentMeta.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Calendar size={12} /> Delivery Date
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1">{order.deliveryDate || 'Not set'}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Clock size={12} /> Time Slot
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1">{order.timeSlot || 'Not set'}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <User size={12} /> Customer
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1">{order.customerName || 'Unknown'}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Truck size={12} /> Delivery Staff
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1">{deliveryStaffName}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Package size={18} className="text-orange-600" />
            Products
          </h3>
          <div className="space-y-2">
            {(order.items || []).map((item) => (
              <div
                key={item.type}
                className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 bg-cover bg-center"
                style={productImages[item.type] ? { backgroundImage: `url(${productImages[item.type]})` } : undefined}
              >
                <div className={`absolute inset-0 ${productImages[item.type] ? 'bg-gradient-to-t from-black/80 via-black/40 to-black/20' : 'bg-white/85'}`} />
                <div className="relative z-10 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-sm font-bold ${productImages[item.type] ? 'text-white' : 'text-gray-900'}`}>{getProductLabel(item.type)}</p>
                    <p className={`text-xs ${productImages[item.type] ? 'text-white/90' : 'text-gray-500'}`}>{formatCurrency(item.pricePerKg || 0)}/kg</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${productImages[item.type] ? 'text-white' : 'text-gray-900'}`}>{item.quantity || 0} kg</p>
                    <p className={`text-xs ${productImages[item.type] ? 'text-white/90' : 'text-gray-500'}`}>{formatCurrency((item.quantity || 0) * (item.pricePerKg || 0))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
            <MapPin size={16} className="text-orange-500 flex-shrink-0" />
            <span>{order.customerAddress || 'Address not available'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
            <NotebookPen size={16} className="text-orange-500 flex-shrink-0" />
            <span>{order.notes || 'No special instructions'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
            <Phone size={16} className="text-orange-500 flex-shrink-0" />
            <span>{order.customerPhone || 'Phone not available'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
            <CreditCard size={16} className="text-orange-500 flex-shrink-0" />
            <span>{paymentMeta.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
