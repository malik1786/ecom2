import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Sparkles,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { loginCustomer, registerCustomer, getGoogleOAuthUrl } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [view, setView] = useState('LOGIN'); // LOGIN, REGISTER, FORGOT_PASSWORD
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [authStatus, setAuthStatus] = useState('CHECKING'); // CHECKING, ONLINE, OFFLINE
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const health = await fetchAuthHealth();
        if (health.ok) setAuthStatus('ONLINE');
        else setAuthStatus('OFFLINE');
      } catch {
        setAuthStatus('OFFLINE');
      }
    };
    checkAuth();
    
    const token = localStorage.getItem('sufi-customer-token');
    if (token) navigate('/');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (view === 'LOGIN') {
        const res = await loginCustomer({ email, password });
        if (res.accessToken) {
           localStorage.setItem('sufi-customer-token', res.accessToken);
           navigate('/');
        }
      } else if (view === 'REGISTER') {
        const res = await registerCustomer({ email, password, full_name: fullName });
        if (res.accessToken) {
          localStorage.setItem('sufi-customer-token', res.accessToken);
          navigate('/');
        }
      } else {
        setSuccess('If an account exists, a recovery link has been sent.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleView = (newView) => {
    setError(null);
    setSuccess(null);
    setView(newView);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#0D0D0D] overflow-hidden font-inter text-[#F5F5F5] selection:bg-[#D4AF37]/30"
    >
      
      {/* Left Section: Luxury Showcase (Split Screen) */}
      <div className="hidden md:flex relative w-1/2 h-screen bg-[#0D0D0D] overflow-hidden">
        
        <motion.div 
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=1920" 
            alt="The Legacy Collection" 
            className="w-full h-full object-cover opacity-30 grayscale-[100%] contrast-[1.1] brightness-[0.8]"
          />
          
          {/* Engraved Branding Overlay (Single Line) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.5, duration: 1 }}
               className="flex flex-col items-center"
            >
              <h1 className="text-[#F5D27A]/10 font-cinzel text-xl lg:text-3xl tracking-[0.6em] uppercase border-y border-white/5 py-10 px-16 backdrop-blur-[2px] whitespace-nowrap">
                The Legacy By Sufi Perfumes
              </h1>
            </motion.div>
          </div>

          {/* Solid Matte Finish Overlays */}
          <div className="absolute inset-0 bg-[#0D0D0D]/60"></div>
        </motion.div>

        {/* Content Overlay */}
        <div className="relative z-30 p-20 flex flex-col justify-between h-full w-full">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-[#D4AF37]/30 flex items-center justify-center rounded-full">
                <Sparkles size={18} className="text-[#D4AF37]" />
              </div>
              <span className="font-cinzel text-lg tracking-[0.4em] uppercase text-[#F5D27A]">Sufi</span>
            </div>
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1 }}>
            <h3 className="font-playfair text-5xl lg:text-7xl text-[#F5D27A] mb-6 leading-tight max-w-xl italic">Legacy isn’t given. It’s remembered.</h3>
          </motion.div>
        </div>
      </div>

      {/* Right Section: Modern Glassmorphism Portal */}
      <div className="flex-1 relative flex items-center justify-center p-6 md:p-12 z-20">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[460px] bg-[#151515] backdrop-blur-[12px] p-10 md:p-14 rounded-[28px] border border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="font-playfair text-4xl text-[#F5D27A] mb-3">
              {view === 'LOGIN' ? 'Welcome Back' : view === 'REGISTER' ? 'Join the Legacy' : 'Reset Access'}
            </h2>
            <p className="font-inter text-[11px] uppercase tracking-[0.3em] text-[#A1A1AA]">
              {view === 'LOGIN' ? 'Sign in to continue your journey' : view === 'REGISTER' ? 'Establish your digital signature' : 'Restore your access'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Auth Status Badge */}
            <div className="flex justify-center mb-2">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                  authStatus === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                  authStatus === 'OFFLINE' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37] animate-pulse'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  authStatus === 'ONLINE' ? 'bg-emerald-400 animate-pulse' :
                  authStatus === 'OFFLINE' ? 'bg-red-400' :
                  'bg-[#D4AF37]'
                }`} />
                {authStatus === 'CHECKING' ? 'Syncing OAuth...' : `Auth: ${authStatus}`}
                {authStatus === 'ONLINE' && <CheckCircle2 size={10} className="ml-1" />}
              </motion.div>
            </div>

            {/* Google Sign In */}
            <motion.button
              whileHover={{ scale: 1.01, backgroundColor: '#1A1A1A' }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => { window.location.href = getGoogleOAuthUrl(); }}
              className="w-full bg-[#111111] border border-white/[0.08] py-4 px-6 flex items-center justify-center gap-4 rounded-xl transition-all duration-300 group"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-5 h-5 opacity-80 group-hover:opacity-100" />
              <span className="font-inter text-[11px] uppercase tracking-[0.2em] text-[#F5F5F5] group-hover:text-white">Continue with Google</span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-grow bg-white/[0.05]"></div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#777777]">or email</span>
              <div className="h-px flex-grow bg-white/[0.05]"></div>
            </div>

            <div className="flex flex-col gap-5">
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-3 bg-red-500/[0.03] border border-red-500/10 rounded-lg text-[11px] text-red-300">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-3 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-lg text-[11px] text-emerald-300">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </motion.div>
              )}

              {view === 'REGISTER' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-medium text-[#777777] uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative group">
                    <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777777] group-focus-within:text-[#D4AF37] transition-colors" />
                    <input 
                      className="w-full bg-[#181818] border border-white/[0.06] rounded-xl py-4 pl-12 pr-4 text-[#FFFFFF] focus:ring-2 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] transition-all outline-none placeholder:text-[#777777] text-sm" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Signature Name" 
                      type="text" 
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-[#777777] uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative group">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777777] group-focus-within:text-[#D4AF37] transition-colors" />
                  <input 
                    className="w-full bg-[#181818] border border-white/[0.06] rounded-xl py-4 pl-12 pr-4 text-[#FFFFFF] focus:ring-2 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] transition-all outline-none placeholder:text-[#777777] text-sm" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@exclusive.com" 
                    type="email" 
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {view !== 'FORGOT_PASSWORD' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-medium text-[#777777] uppercase tracking-[0.2em]">Password</label>
                    {view === 'LOGIN' && (
                      <button type="button" onClick={() => toggleView('FORGOT_PASSWORD')} className="text-[10px] uppercase tracking-[0.1em] text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors">Forgot?</button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777777] group-focus-within:text-[#D4AF37] transition-colors" />
                    <input 
                      className="w-full bg-[#181818] border border-white/[0.06] rounded-xl py-4 pl-12 pr-12 text-[#FFFFFF] focus:ring-2 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] transition-all outline-none placeholder:text-[#777777] text-sm" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      type={showPassword ? "text" : "password"} 
                      autoComplete="new-password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#777777] hover:text-[#D4AF37] transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 mt-6">
              <motion.button 
                whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(212,175,55,0.18)' }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                type="submit"
                className="w-full h-14 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5D27A] font-poppins font-bold text-[12px] uppercase tracking-[0.3em] text-[#0D0D0D] flex items-center justify-center gap-2 transition-all duration-300"
              >
                {loading ? 'Processing...' : (view === 'LOGIN' ? 'Sign In' : view === 'REGISTER' ? 'Establish Access' : 'Recover')}
                {!loading && <ChevronRight size={16} />}
              </motion.button>

              <button 
                type="button"
                onClick={() => toggleView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                className="font-inter text-[11px] uppercase tracking-[0.2em] text-[#A1A1AA] hover:text-[#D4AF37] transition-all text-center"
              >
                {view === 'LOGIN' ? 'Don’t have an account? Sign Up' : 'Already a member? Sign In'}
              </button>
            </div>
          </form>

          {/* Footer Back Link */}
          <div className="mt-10 text-center pt-8 border-t border-white/[0.03]">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 mx-auto text-[10px] uppercase tracking-[0.2em] text-[#777777] hover:text-[#D4AF37] transition-all group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
              Return to Collection
            </button>
          </div>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}} />
    </motion.div>
  );
};

export default LoginForm;
