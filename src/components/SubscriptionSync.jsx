import { useEffect, useRef } from 'react';
import { collection, doc, getDocs, limit, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getTodayInfo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    weekday: WEEKDAY_KEYS[now.getDay()],
  };
}

export default function SubscriptionSync({ user, profile }) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!user || !profile) return;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const { dateKey, weekday } = getTodayInfo();
        const subscriptionsQuery = profile.role === 'admin'
          ? query(collection(db, 'subscriptions'), where('active', '==', true), limit(100))
          : query(
              collection(db, 'subscriptions'),
              where('customerId', '==', user.uid),
              where('active', '==', true),
              limit(100)
            );

        const snapshot = await getDocs(subscriptionsQuery);

        for (const subscriptionDoc of snapshot.docs) {
          const subscriptionRef = doc(db, 'subscriptions', subscriptionDoc.id);
          const orderRef = doc(db, 'orders', `${subscriptionDoc.id}_${dateKey}`);
          const customerRef = doc(db, 'users', subscriptionDoc.data().customerId);

          try {
            await runTransaction(db, async (transaction) => {
              const latestSubscriptionSnap = await transaction.get(subscriptionRef);
              if (!latestSubscriptionSnap.exists()) {
                return;
              }

              const subscription = latestSubscriptionSnap.data();
              const selectedDays = subscription.selectedDays || [];
              const generatedDates = subscription.generatedDates || [];

              if (!subscription.active || !selectedDays.includes(weekday) || generatedDates.includes(dateKey)) {
                return;
              }

              const existingOrderSnap = await transaction.get(orderRef);
              if (existingOrderSnap.exists()) {
                transaction.update(subscriptionRef, {
                  generatedDates: [...new Set([...generatedDates, dateKey])],
                  updatedAt: serverTimestamp(),
                });
                return;
              }

              const customerProfileSnap = await transaction.get(customerRef);
              const customerProfile = customerProfileSnap.exists() ? customerProfileSnap.data() : null;

              if (!customerProfile) {
                return;
              }

              const items = subscription.items || [];
              const totalAmount = items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.pricePerKg) || 0), 0);

              transaction.set(orderRef, {
                customerId: subscription.customerId,
                customerName: customerProfile.businessName || subscription.customerName || 'Unknown',
                customerAddress: customerProfile.address || subscription.customerAddress || '',
                customerPhone: customerProfile.contact || subscription.customerPhone || '',
                items,
                totalAmount,
                status: 'placed',
                deliveryDate: dateKey,
                timeSlot: subscription.timeSlot || '08:00 AM - 10:00 AM',
                notes: subscription.notes || '',
                paymentStatus: 'unpaid',
                createdAt: serverTimestamp(),
              });

              transaction.update(subscriptionRef, {
                generatedDates: [...new Set([...generatedDates, dateKey])],
                customerName: customerProfile.businessName || subscription.customerName || 'Unknown',
                customerAddress: customerProfile.address || subscription.customerAddress || '',
                customerPhone: customerProfile.contact || subscription.customerPhone || '',
                updatedAt: serverTimestamp(),
              });
            });
          } catch (err) {
            console.error(err);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        runningRef.current = false;
      }
    };

    run();
    const intervalId = window.setInterval(run, 60 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [profile, user]);

  return null;
}
