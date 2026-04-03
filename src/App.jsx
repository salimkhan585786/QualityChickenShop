/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { LogOut, ShoppingCart, Users, Settings, Truck, Home, History, CreditCard, Repeat, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from './lib/utils';
import { useI18n } from './lib/i18n';
import logo from './image/logo.png';

// Contexts
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Components
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import BusinessDashboard from './components/BusinessDashboard';
import DeliveryDashboard from './components/DeliveryDashboard';
import OrderForm from './components/OrderForm';
import OrderHistory from './components/OrderHistory';
import OrderDetails from './components/OrderDetails';
import Payments from './components/Payments';
import Subscriptions from './components/Subscriptions';
import CustomerManagement from './components/CustomerManagement';
import PricingControl from './components/PricingControl';
import DeliveryManagement from './components/DeliveryManagement';
import LanguageModal from './components/LanguageModal';
import SubscriptionSync from './components/SubscriptionSync';

const Layout = ({ children, role }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const navItems = {
    admin: [
      { path: '/admin', icon: Home, label: t('nav.dashboard', 'Dashboard') },
      { path: '/admin/customers', icon: Users, label: t('nav.customers', 'Customers') },
      { path: '/admin/pricing', icon: Settings, label: t('nav.pricing', 'Pricing') },
      { path: '/admin/delivery', icon: Truck, label: t('nav.delivery', 'Delivery') },
    ],
    business: [
      { path: '/business', icon: Home, label: t('nav.dashboard', 'Dashboard') },
      { path: '/business/order', icon: ShoppingCart, label: t('nav.newOrder', 'New Order') },
      { path: '/business/history', icon: History, label: t('nav.history', 'History') },
      { path: '/business/payments', icon: CreditCard, label: t('nav.payments', 'Payments') },
      { path: '/business/subscriptions', icon: Repeat, label: t('nav.subscriptions', 'Subscriptions') },
    ],
    delivery: [
      { path: '/delivery', icon: Home, label: t('nav.dashboard', 'Dashboard') },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b top-0 z-99 px-4 py-1 flex justify-between items-center">
        <img src={logo} alt="Quality Chicken Shop" className="h-20 w-auto object-contain " />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLanguageModal(true)}
            className="p-2 text-gray-500 hover:text-orange-600 transition-colors"
          >
            <Languages size={20} />
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center py-2 px-4 shadow-lg z-20">
        {navItems[role].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center p-2 transition-colors ${
              window.location.pathname === item.path ? 'text-orange-600' : 'text-gray-400'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <LanguageModal open={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile && !allowedRoles.includes(profile.role)) return <Navigate to={`/${profile.role}`} />;

  return <Layout role={profile?.role}>{children}</Layout>;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const path = `users/${user.uid}`;
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            setProfile(null);
          }
        } catch (err) {
          // Only handle if it's a permission error, otherwise it might be a new user
          if (err.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.GET, path, auth);
          }
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <SubscriptionSync user={user} profile={profile} />
      <Router>
        <Routes>
          <Route path="/login" element={user && profile ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user && profile ? <Navigate to="/" /> : <Register />} />
          
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminRoutes /></ProtectedRoute>} />
          <Route path="/business/*" element={<ProtectedRoute allowedRoles={['business']}><BusinessRoutes /></ProtectedRoute>} />
          <Route path="/delivery/*" element={<ProtectedRoute allowedRoles={['delivery']}><DeliveryRoutes /></ProtectedRoute>} />
          
          <Route path="/" element={
            loading ? <div>Loading...</div> :
            !user ? <Navigate to="/login" /> :
            !profile ? <Navigate to="/login" /> :
            <Navigate to={`/${profile.role}`} />
          } />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/orders/:orderId" element={<OrderDetails />} />
      <Route path="/customers" element={<CustomerManagement />} />
      <Route path="/pricing" element={<PricingControl />} />
      <Route path="/delivery" element={<DeliveryManagement />} />
    </Routes>
  );
}

function BusinessRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BusinessDashboard />} />
      <Route path="/order" element={<OrderForm />} />
      <Route path="/order/:orderId" element={<OrderForm />} />
      <Route path="/orders/:orderId" element={<OrderDetails />} />
      <Route path="/history" element={<OrderHistory />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/subscriptions" element={<Subscriptions />} />
    </Routes>
  );
}

function DeliveryRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DeliveryDashboard />} />
      <Route path="/orders/:orderId" element={<OrderDetails />} />
    </Routes>
  );
}
