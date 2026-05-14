import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import SprayAnimation from './components/SprayAnimation';
import WelcomeText from './components/WelcomeText';
import LoginForm from './components/LoginForm';
import Home from './Home';
import ProductDetail from './ProductDetail';
import SearchPage from './SearchPage';
import UserProfile from './UserProfile';
import AuthSuccess from './components/AuthSuccess';
import CartPage from './CartPage';

import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import ProductManager from './components/admin/ProductManager';
import OrdersManager from './components/admin/OrdersManager';
import CustomersManager from './components/admin/CustomersManager';
import SettingsManager from './components/admin/SettingsManager';
import AdminAnalytics from './components/admin/AdminAnalytics';
import VideoHomeManager from './components/admin/VideoHomeManager';
import SystemUsage from './components/admin/SystemUsage';
import TerminalLive from './components/admin/TerminalLive';

// Page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    className="relative w-full"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

// Skip intro for admin & non-root routes
const INTRO_SKIP_ROUTES = ['/admin', '/login'];

// Admin route guard
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('sufi-admin-token');
  const isValid = token && token !== 'undefined' && token !== 'null' && token.length > 10;
  
  if (!isValid) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  const [step, setStep] = useState('spray');
  const navigate = useNavigate();

  // Safety fallback — ensures intro never gets stuck
  React.useEffect(() => {
    const t = setTimeout(() => setStep('main'), 8000);
    return () => clearTimeout(t);
  }, []);

  // Skip intro if user navigated to admin/login directly
  React.useEffect(() => {
    if (INTRO_SKIP_ROUTES.some(r => window.location.pathname.startsWith(r))) {
      setStep('main');
    }
  }, []);

  return (
    <div className="app-shell min-h-shell relative w-full overflow-x-hidden bg-bg-primary text-white font-sans">
      <Routes>
        {/* ── Root with Intro Sequence ── */}
        <Route
          path="/"
          element={
            <div className="w-full min-h-screen relative">
              <AnimatePresence mode="wait">
                {step === 'spray' && (
                  <SprayAnimation key="spray" onComplete={() => setStep('welcome')} />
                )}
                {step === 'welcome' && (
                  <WelcomeText key="welcome" onComplete={() => setStep('main')} />
                )}
              </AnimatePresence>

              {step === 'main' && (
                <motion.div
                  key="main"
                  className="relative w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                >
                  <Home />
                </motion.div>
              )}
            </div>
          }
        />

        {/* ── Customer Routes ── */}
        <Route path="/home"       element={<PageTransition><Home /></PageTransition>} />
        <Route path="/search"     element={<PageTransition><SearchPage /></PageTransition>} />
        <Route path="/product/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
        <Route path="/cart"       element={<PageTransition><CartPage /></PageTransition>} />
        <Route path="/profile"    element={<PageTransition><UserProfile /></PageTransition>} />
        <Route path="/login"      element={<PageTransition><LoginForm onLogin={() => navigate('/home')} /></PageTransition>} />
        <Route path="/auth-success" element={<AuthSuccess />} />

        {/* ── Admin Routes ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="products"  element={<ProductManager />} />
          <Route path="vhome"     element={<VideoHomeManager />} />
          <Route path="orders"    element={<OrdersManager />} />
          <Route path="customers" element={<CustomersManager />} />
          <Route path="settings"  element={<SettingsManager />} />
          <Route path="system-usage" element={<SystemUsage />} />
          <Route path="terminal" element={<TerminalLive />} />
        </Route>

        {/* ── 404 Fallback ── */}
        <Route path="*" element={
          <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-bg-primary">
            <p className="text-[60px] font-bold text-stone-900">404</p>
            <p className="text-[10px] uppercase tracking-[0.5em] text-stone-600">Page not found in the Archive</p>
            <button
              onClick={() => navigate('/')}
              className="btn-gold-luxury px-10 py-4 text-[9px]"
              style={{ backgroundColor: '#d6b25e' }}
            >
              Return to Maison
            </button>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
