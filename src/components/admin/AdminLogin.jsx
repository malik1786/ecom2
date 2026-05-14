import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { loginAdmin, getGoogleOAuthUrl } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    
    const token = localStorage.getItem('sufi-admin-token');
    if (token && token !== 'undefined') navigate('/admin');
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginAdmin({ username, password });
      localStorage.setItem('sufi-admin-token', res.token);
      localStorage.setItem('sufi-admin-user', JSON.stringify(res.admin));
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#0D0D0D] overflow-hidden font-inter text-[#F5F5F5] selection:bg-[#D4AF37]/30"
    >
      
      {/* Left Section: Admin Identity Showcase */}
      <div className="hidden md:flex relative w-1/2 h-screen bg-[#0D0D0D] overflow-hidden">
        
        <motion.div 
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=1920" 
            alt="Legacy Admin" 
            className="w-full h-full object-cover opacity-20 grayscale-[100%] contrast-[1.2] brightness-[0.7]"
          />
          
          {/* Engraved Branding Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <h1 className="text-white/5 font-cinzel text-xl lg:text-3xl tracking-[0.6em] uppercase border-y border-white/5 py-10 px-16 backdrop-blur-[2px] whitespace-nowrap">
              The Legacy By Sufi Perfumes
            </h1>
          </div>

          <div className="absolute inset-0 bg-[#0D0D0D]/70"></div>
        </motion.div>

        {/* Content Overlay */}
        <div className="relative z-30 p-20 flex flex-col justify-between h-full w-full">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-[#D4AF37]/30 flex items-center justify-center rounded-full">
                <ShieldCheck size={20} className="text-[#D4AF37]" />
              </div>
              <span className="font-cinzel text-lg tracking-[0.4em] uppercase text-[#F5D27A]">Admin Archive</span>
            </div>
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
            <h3 className="font-playfair text-5xl lg:text-7xl text-[#F5D27A] mb-6 leading-tight max-w-xl italic">Safeguarding the Essence.</h3>
            <p className="font-inter text-[10px] tracking-[0.4em] text-[#A1A1AA] uppercase">Authorized Access Protocol</p>
          </motion.div>
        </div>
      </div>

      {/* Right Section: Modern Admin Access Portal */}
      <div className="flex-1 relative flex items-center justify-center p-6 md:p-12 z-20">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[460px] bg-[#151515] backdrop-blur-[12px] p-10 md:p-14 rounded-[28px] border border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="font-playfair text-4xl text-[#F5D27A] mb-3">Authorized Access</h2>
            <p className="font-inter text-[11px] uppercase tracking-[0.3em] text-[#A1A1AA]">Secure credential verification required</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-8">
            {/* Auth Status Badge */}
            <div className="flex justify-center -mb-4">
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
                {authStatus === 'ONLINE' && <ShieldCheck size={10} className="ml-1" />}
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
              <span className="font-inter text-[11px] uppercase tracking-[0.2em] text-[#F5F5F5] group-hover:text-white">Admin Google Login</span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-grow bg-white/[0.05]"></div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#777777]">or credentials</span>
              <div className="h-px flex-grow bg-white/[0.05]"></div>
            </div>

            <div className="flex flex-col gap-6">
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-3 bg-red-500/[0.03] border border-red-500/10 rounded-lg text-[11px] text-red-300">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-[#777777] uppercase tracking-[0.2em] ml-1">Admin Username</label>
                <div className="relative group">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777777] group-focus-within:text-[#D4AF37] transition-colors" />
                  <input 
                    className="w-full bg-[#181818] border border-white/[0.06] rounded-xl py-4 pl-12 pr-4 text-[#FFFFFF] focus:ring-2 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] transition-all outline-none placeholder:text-[#777777] text-sm" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Admin Identity" 
                    type="text" 
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-[#777777] uppercase tracking-[0.2em] ml-1">Secure Password</label>
                <div className="relative group">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777777] group-focus-within:text-[#D4AF37] transition-colors" />
                  <input 
                    className="w-full bg-[#181818] border border-white/[0.06] rounded-xl py-4 pl-12 pr-12 text-[#FFFFFF] focus:ring-2 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] transition-all outline-none placeholder:text-[#777777] text-sm" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"} 
                    required
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
            </div>

            <div className="flex flex-col gap-6 mt-4">
              <motion.button 
                whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(212,175,55,0.18)' }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                type="submit"
                className="w-full h-14 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5D27A] font-poppins font-bold text-[12px] uppercase tracking-[0.3em] text-[#0D0D0D] flex items-center justify-center gap-2 transition-all duration-300"
              >
                {loading ? 'Authenticating...' : 'Access Archive'}
                {!loading && <ChevronRight size={16} />}
              </motion.button>
            </div>
          </form>

          {/* Footer Back Link */}
          <div className="mt-12 text-center pt-8 border-t border-white/[0.03]">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 mx-auto text-[10px] uppercase tracking-[0.2em] text-[#777777] hover:text-[#D4AF37] transition-all group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
              Return to Storefront
            </button>
          </div>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}} />
    </motion.div>
  );
};

export default AdminLogin;
