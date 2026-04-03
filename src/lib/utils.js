import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export const PRODUCT_DEFINITIONS = [
  { id: 'breast-boneless', name: 'Breast Boneless', defaultRate: 220 },
  { id: 'leg-boneless', name: 'Leg Boneless', defaultRate: 220 },
  { id: 'chicken-boiler', name: 'Chicken Boiler', defaultRate: 160 },
  { id: 'lollipop', name: 'Lollipop', defaultRate: 180 },
  { id: 'chicken-curry-cut', name: 'Chicken Curry Cut', defaultRate: 200 },
  { id: 'tandoori', name: 'Tandoori', defaultRate: 170 },
  { id: 'leg-pieces', name: 'Leg Pieces', defaultRate: 170 },
  { id: 'drum-stick', name: 'Drum Stick', defaultRate: 190 },
  { id: 'liver-pota', name: 'Liver / Pota', defaultRate: 100 },
  { id: 'dress-boiler', name: 'Dress Boiler', defaultRate: 100 },
];

export const DEFAULT_PRODUCT_RATES = Object.fromEntries(
  PRODUCT_DEFINITIONS.map((product) => [product.id, product.defaultRate])
);

export const PRODUCT_LABELS = Object.fromEntries(
  PRODUCT_DEFINITIONS.map((product) => [product.id, product.name])
);

export function getProductLabel(productId) {
  return PRODUCT_LABELS[productId] || productId || 'Product';
}

export function formatOrderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No products';
  }

  return items
    .map((item) => {
      const productName = getProductLabel(item?.type);
      const quantity = Number(item?.quantity);

      if (Number.isFinite(quantity) && quantity > 0) {
        return `${productName} (${quantity} kg)`;
      }

      return productName;
    })
    .join(', ');
}

export function getOrderDetailsPath(role, orderId) {
  if (!role || !orderId) {
    return '/';
  }

  return `/${role}/orders/${orderId}`;
}

export function getProductRates(settings) {
  return {
    ...DEFAULT_PRODUCT_RATES,
    ...(settings?.productRates || {}),
  };
}

export function getBusinessProductRates(settings, profile) {
  return {
    ...getProductRates(settings),
    ...(profile?.customProductRates || {}),
  };
}

export function hasCustomProductRates(profile) {
  return Boolean(
    profile?.customProductRates &&
    Object.values(profile.customProductRates).some((value) => value !== '' && value !== null && value !== undefined)
  );
}

export function getPaymentStatusMeta(status) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', className: 'bg-green-100 text-green-700' };
    case 'payment-submitted':
      return { label: 'Payment Sent', className: 'bg-blue-100 text-blue-700' };
    default:
      return { label: 'Unpaid', className: 'bg-red-100 text-red-700' };
  }
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path, auth) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
