import React from 'react';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';
import { NotificationProvider } from './NotificationContext';
import { useAuth } from './AuthContext';

const AuthDependentProviders = ({ children }) => {
  const { token } = useAuth();
  const sessionKey = token || 'guest';

  return (
    <CartProvider key={`cart-${sessionKey}`}>
      <WishlistProvider key={`wishlist-${sessionKey}`}>
        <NotificationProvider key={`notifications-${sessionKey}`}>
          {children}
        </NotificationProvider>
      </WishlistProvider>
    </CartProvider>
  );
};

const AppProviders = ({ children }) => (
  <AuthProvider>
    <AuthDependentProviders>{children}</AuthDependentProviders>
  </AuthProvider>
);

export default AppProviders;
