import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { Package, Users, TrendingUp, Clock, CheckCircle, Truck, XCircle, CreditCard, Calendar, CalendarRange, IndianRupee, Building2, Filter } from 'lucide-react';
import { db } from '../firebase';
import { cn, formatCurrency, formatOrderItems, getOrderDetailsPath, getPaymentStatusMeta } from '../lib/utils';
import { useI18n } from '../lib/i18n';

export default function AdminDashboard() {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
      setCustomers(snapshot.docs.map((customerDoc) => ({ uid: customerDoc.id, ...customerDoc.data() })));
    });

    const qDelivery = query(collection(db, 'users'), where('role', '==', 'delivery'));
    const unsubscribeDelivery = onSnapshot(qDelivery, (snapshot) => {
      setDeliveryBoys(snapshot.docs.map((deliveryDoc) => ({ uid: deliveryDoc.id, ...deliveryDoc.data() })));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeSettings();
      unsubscribeCustomers();
      unsubscribeDelivery();
    };
  }, []);

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === 'placed' || order.status === 'confirmed').length,
    collectedRevenue: orders.filter((order) => order.paymentStatus === 'paid').reduce((acc, order) => acc + order.totalAmount, 0),
    outstandingAmount: orders.filter((order) => order.status === 'delivered' && order.paymentStatus !== 'paid').reduce((acc, order) => acc + order.totalAmount, 0),
    activeCustomers: customers.length,
  };

  const updateOrderStatus = async (orderId, status, order) => {
    try {
      const updatePayload = { status };

      if (status === 'confirmed' && !order?.deliveryBoyId && deliveryBoys.length > 0) {
        const currentCursor = settings?.autoAssignCursor || 0;
        const nextAssignee = deliveryBoys[currentCursor % deliveryBoys.length];
        updatePayload.deliveryBoyId = nextAssignee.uid;
        updatePayload.deliveryBoyName =
          nextAssignee.name ||
          nextAssignee.fullName ||
          nextAssignee.displayName ||
          nextAssignee.businessName ||
          nextAssignee.email ||
          t('common.assigned', 'Assigned');

        await setDoc(doc(db, 'settings', 'global'), {
          autoAssignCursor: (currentCursor + 1) % deliveryBoys.length,
        }, { merge: true });
      }

      await updateDoc(doc(db, 'orders', orderId), updatePayload);
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

  const filteredOrders = orders.filter((order) => {
    const matchesSelectedDate = !selectedDate || order.deliveryDate === selectedDate;
    const matchesDateFrom = !dateFrom || order.deliveryDate >= dateFrom;
    const matchesDateTo = !dateTo || order.deliveryDate <= dateTo;
    const matchesCustomer = !selectedCustomer || order.customerId === selectedCustomer;
    const matchesMinPrice = minPrice === '' || order.totalAmount >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === '' || order.totalAmount <= parseFloat(maxPrice);

    return matchesSelectedDate && matchesDateFrom && matchesDateTo && matchesCustomer && matchesMinPrice && matchesMaxPrice;
  });

  const filteredPaymentRequests = filteredOrders.filter((order) => order.status === 'delivered' && order.paymentStatus === 'payment-submitted');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('admin.title', 'Admin Panel')}</h2>
      </div>

      <div className="flex justify-end">
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
            <h3 className="font-bold text-gray-900">{t('common.filters', 'Filters')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Calendar size={12} /> {t('common.exactDate', 'Exact Date')}
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
                <CalendarRange size={12} /> {t('common.dateFrom', 'Date From')}
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
                <CalendarRange size={12} /> {t('common.dateTo', 'Date To')}
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
                <Building2 size={12} /> {t('register.business', 'Business')}
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">{t('common.allBusinesses', 'All Businesses')}</option>
                {customers.map((customer) => (
                  <option key={customer.uid || customer.email || customer.businessName} value={customer.uid}>
                    {customer.businessName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <IndianRupee size={12} /> {t('common.minPrice', 'Min Price')}
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
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <IndianRupee size={12} /> {t('common.maxPrice', 'Max Price')}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-orange-50 w-8 h-8 rounded-lg flex items-center justify-center text-orange-600 mb-2">
            <Package size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{t('admin.ordersToday', 'Orders Today')}</p>
          <p className="text-xl font-bold text-gray-900">{stats.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-green-50 w-8 h-8 rounded-lg flex items-center justify-center text-green-600 mb-2">
            <TrendingUp size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{t('admin.paidRevenue', 'Paid Revenue')}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.collectedRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 mb-2">
            <Clock size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{t('admin.pending', 'Pending')}</p>
          <p className="text-xl font-bold text-gray-900">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center text-red-600 mb-2">
            <CreditCard size={16} />
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{t('admin.outstanding', 'Outstanding')}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.outstandingAmount)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-purple-50 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600">
            <Users size={16} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{t('admin.customers', 'Customers')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.activeCustomers}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-gray-900">{t('admin.paymentRequests', 'Payment Requests')}</h3>
        {filteredPaymentRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            {t('admin.noPaymentRequests', 'No payment confirmations from business yet')}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPaymentRequests.map((order) => (
              <div key={order.id} className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center gap-3">
                <Link to={getOrderDetailsPath('admin', order.id)} className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900">{order.customerName}</p>
                  <p className="text-xs text-gray-600 break-words">{formatOrderItems(order.items)}</p>
                  <p className="text-xs text-blue-700 font-medium">{t('admin.businessMarkedPaid', 'Business marked this order as paid')}</p>
                </Link>
                <button
                  onClick={() => updatePaymentStatus(order.id, 'paid')}
                  className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 flex-shrink-0"
                >
                  <CreditCard size={14} /> {t('admin.confirmPaid', 'Confirm Paid')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900">{t('admin.incomingOrders', 'Incoming Orders')}</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const paymentMeta = getPaymentStatusMeta(order.paymentStatus);

              return (
                <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <Link to={getOrderDetailsPath('admin', order.id)} className="flex justify-between items-start gap-4 transition-colors hover:text-orange-600">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900">{order.customerName}</p>
                      <p className="text-xs text-gray-500 break-words">{formatOrderItems(order.items)}</p>
                      <p className="text-xs text-gray-500">{order.deliveryDate} • {order.timeSlot}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
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
                  </Link>

                  <div className="border-t pt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {order.status === 'placed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'confirmed', order)}
                        className="flex-shrink-0 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCircle size={14} /> {t('admin.confirm', 'Confirm')}
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'packed', order)}
                        className="flex-shrink-0 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Package size={14} /> {t('admin.packed', 'Packed')}
                      </button>
                    )}
                    {order.status === 'packed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'out-for-delivery', order)}
                        className="flex-shrink-0 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Truck size={14} /> {t('admin.outForDelivery', 'Out for Delivery')}
                      </button>
                    )}
                    {order.status !== 'delivered' && order.status !== 'rejected' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'rejected', order)}
                        className="flex-shrink-0 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <XCircle size={14} /> {t('admin.reject', 'Reject')}
                      </button>
                    )}
                    {order.status === 'delivered' && order.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => updatePaymentStatus(order.id, 'paid')}
                        className="flex-shrink-0 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <CreditCard size={14} /> {t('admin.markPaid', 'Mark Paid')}
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
