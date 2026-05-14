import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, X, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { formatPrice } from './lib/currency';
import { fetchCustomerMe } from './lib/api';

const UserProfile = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const navigate = useNavigate();

  // We rely on the token/id stored in localStorage
  const token = localStorage.getItem('sufi-customer-token');
  const userEmail = localStorage.getItem('sufi-user-id');

  useEffect(() => {
    if (!token && !userEmail) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch User Info
        if (token) {
          const res = await fetchCustomerMe(token);
          setUser(res.data?.user || res.user || res);
        }

        // Fetch Orders
        const email = userEmail || user?.email;
        if (email) {
          const res = await fetch(`/api/my-orders?email=${encodeURIComponent(email)}`);
          if (!res.ok) throw new Error('Failed to fetch orders');
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, userEmail, navigate]);

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('sufi-cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart');
      }
    }
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    
    setCancelingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail || user?.email })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }
      
      const data = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCancelingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sufi-customer-token');
    localStorage.removeItem('sufi-user-id');
    localStorage.removeItem('sufi-refresh-token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-8">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft size={14} /> Boutique Home
            </button>
            <h1 className="text-3xl font-bold font-serif text-white">
              {user?.full_name ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Your Profile'}
            </h1>
            <p className="text-sm text-stone-500 font-mono tracking-tighter opacity-60">Identity: {userEmail || user?.email}</p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-brand-gold hover:text-brand-gold text-[10px] uppercase tracking-[0.3em] text-stone-400 transition-all bg-white/[0.02]"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Active Collection (Cart) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-3">
              <Package size={20} className="text-brand-gold" /> Current Collection
            </h2>
            <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
              {cartItems.length} items waiting
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="py-8 px-6 border border-white/5 bg-white/[0.02] rounded-sm italic text-stone-500 text-sm">
              Your fragrance collection is currently empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cartItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-4 p-4 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors group">
                  <div className="w-16 h-16 bg-stone-900 flex-shrink-0 border border-white/5 p-2 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[11px] font-bold text-white uppercase tracking-wider truncate">{item.name}</h3>
                    <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-tighter">{item.size} • Qty {item.quantity}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/checkout')}
                    className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-black transition-all"
                  >
                    Checkout
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="space-y-6 pt-8">
          <h2 className="text-xl font-bold font-serif text-white flex items-center gap-3">
            <Package size={20} className="text-stone-500" /> Archive
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-16 border border-white/5 bg-white/[0.02]">
              <p className="text-stone-500 mb-6">No historical records found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-white/5 bg-white/[0.01] p-6 flex flex-wrap items-center justify-between gap-6 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-[140px]">
                    <p className="text-[9px] uppercase tracking-widest text-stone-600 mb-1">Identifier</p>
                    <p className="text-xs font-bold text-white font-mono">{order.order_number}</p>
                  </div>
                  <div className="min-w-[100px]">
                    <p className="text-[9px] uppercase tracking-widest text-stone-600 mb-1">Timestamp</p>
                    <p className="text-xs text-stone-400">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="min-w-[80px]">
                    <p className="text-[9px] uppercase tracking-widest text-stone-600 mb-1">Total</p>
                    <p className="text-xs font-bold text-brand-gold">{formatPrice(order.total_cents)}</p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 text-[9px] uppercase tracking-widest font-bold border ${
                      order.status === 'cancelled' ? 'border-red-500/20 text-red-500/60' :
                      order.status === 'delivered' ? 'border-green-500/20 text-green-500/60' :
                      'border-brand-gold/20 text-brand-gold/60'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  {['new', 'processing'].includes(order.status) && (
                    <button 
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancelingId === order.id}
                      className="px-4 py-2 text-[9px] uppercase tracking-widest font-bold text-stone-500 border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-all disabled:opacity-50"
                    >
                      {cancelingId === order.id ? <Loader2 size={12} className="animate-spin" /> : 'Revoke'}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
