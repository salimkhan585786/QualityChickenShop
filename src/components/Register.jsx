import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { UserCircle, MapPin, Phone, Building2, Mail, Lock } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function Register() {
  const { t } = useI18n();
  const [role, setRole] = useState('business');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match.'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const { user } = userCredential;
      const path = `users/${user.uid}`;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        role,
        businessName: businessName.trim(),
        address: address.trim(),
        contact: contact.trim(),
        email: user.email || email.trim(),
        createdAt: serverTimestamp(),
      });

      navigate('/');
    }catch (err) {
  console.error(err);

  switch (err.code) {
    case 'auth/email-already-in-use':
      setError(t('auth.emailExists', 'This email is already registered. Please login instead.'));
      break;

    case 'auth/invalid-email':
      setError(t('auth.invalidEmail', 'Invalid email format.'));
      break;

    case 'auth/weak-password':
      setError(t('auth.weakPassword', 'Password should be at least 6 characters.'));
      break;

    case 'auth/network-request-failed':
      setError(t('auth.networkError', 'Network error. Check your internet connection.'));
      break;

    default: {
      const currentUser = auth.currentUser;

      if (currentUser) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${currentUser.uid}`,
          auth
        );
      }

      setError(t('auth.registrationFailed', 'We could not complete registration. Please try again.'));
    }
  }
} finally {
      setLoading(false);
    }
  };

  const title = role === 'business' ? t('register.businessName', 'Business Name') : t('register.fullName', 'Full Name');
  const subtitle = role === 'business'
    ? t('register.businessSubtitle', 'Create your business account to place orders')
    : t('register.deliverySubtitle', 'Create your delivery staff account to manage assigned orders');
  const namePlaceholder = role === 'business'
    ? t('register.businessPlaceholder', 'e.g. Royal Restaurant')
    : t('register.staffPlaceholder', 'Enter staff full name');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="text-orange-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('register.title', 'Create Account')}</h2>
          <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{t('register.as', 'Register as')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('business')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                  role === 'business' 
                    ? 'bg-orange-50 border-orange-600 text-orange-600' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
              >
                {t('register.business', 'Business')}
              </button>
              <button
                type="button"
                onClick={() => setRole('delivery')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                  role === 'delivery' 
                    ? 'bg-orange-50 border-orange-600 text-orange-600' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
              >
                {t('register.delivery', 'Delivery Staff')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{title}</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                placeholder={namePlaceholder}
                className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{t('register.addressLabel', 'Full Address')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                placeholder={t('register.addressPlaceholder', 'Shop no, Street, Area')}
                className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{t('register.contactLabel', 'Contact Number')}</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                required
                placeholder={t('register.contactPlaceholder', 'Mobile Number')}
                className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{t('register.emailLabel', 'Email Address')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                placeholder={t('register.emailPlaceholder', 'name@example.com')}
                className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{t('register.passwordLabel', 'Password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                minLength="6"
                placeholder={t('register.passwordPlaceholder', 'Minimum 6 characters')}
                className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">{t('register.confirmPasswordLabel', 'Confirm Password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                minLength="6"
                placeholder={t('register.confirmPasswordPlaceholder', 'Re-enter your password')}
                className="w-full bg-gray-50 border border-gray-200 pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? t('auth.creatingAccount', 'Creating account...') : t('register.button', 'Create Account')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <Link to="/login" className="font-bold text-orange-600 hover:text-orange-700">
            {t('register.loginHere', 'Login here')}
          </Link>
        </p>
      </div>
    </div>
  );
}
