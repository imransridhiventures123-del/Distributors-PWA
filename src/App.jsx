// FILE: src/App.jsx
// UPDATED — routes now match the new 5-tab bottom nav (Home / Customers
// / Orders / Ledger / Profile) from the reference design. The old
// "/request-batter" route has been removed from here since it's no
// longer in the nav — see chat notes on what to do with that file.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DistributorAuthProvider } from "./context/DistributorAuthContext";
import { CartProvider } from "./context/CartContext";
import PrivateRoute from "./components/PrivateRoute";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CustomersPage from "./pages/CustomersPage";
import OrdersPage from "./pages/OrdersPage";
import LedgerPage from "./pages/LedgerPage";
import ProfilePage from "./pages/ProfilePage";
import CheckoutPage from "./pages/CheckoutPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <DistributorAuthProvider>
        {/* NEW — Feature: e-commerce-style Request Batter flow. Wraps
            everything so the cart (built on the Customers page) survives
            navigating to Checkout, Home, etc. */}
        <CartProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
            <Route path="/customers/:id" element={<PrivateRoute><CustomerDetailPage /></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
            <Route path="/ledger" element={<PrivateRoute><LedgerPage /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </DistributorAuthProvider>
    </BrowserRouter>
  );
}