import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Menu, X, ChevronDown, LogOut, Package, ChevronRight, ShoppingBag } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SearchOverlay from './SearchOverlay';
import { fetchCustomerMe } from '../lib/api';

const NAV_LINKS = [
  { label: 'Home',         href: '/' },
  { label: 'Perfumes',     href: '/search?category=perfume' },
  { label: 'Attar',        href: '/search?category=attar' },
  {
    label: 'Collections',
    href: '/search',
    children: [
      { label: 'Inspired Collection', href: '/search?category=inspired' },
      { label: 'Home Fragrance',      href: '/search?category=home-fragrance' },
      { label: 'All Products',        href: '/search' },
    ],
  },
  {
    label: 'Discover',
    href: '/search',
    children: [
      { label: 'New Arrivals',    href: '/search?category=new' },
      { label: 'Best Sellers',    href: '/search?category=bestseller' },
      { label: 'Limited Edition', href: '/search?category=limited' },
      { label: 'On Sale',         href: '/search?category=sale' },
    ],
  },
];

/* ── Dropdown ── */
const DropdownMenu = ({ items, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-52 bg-[#0d0d0d] border border-white/8 shadow-2xl z-[200] overflow-hidden"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="block px-6 py-3.5 text-[11px] uppercase tracking-[0.2em] font-medium text-stone-400 hover:text-brand-gold hover:bg-white/[0.03] transition-all duration-200 border-b border-white/[0.04] last:border-0"
          >
            {item.label}
          </Link>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── Main NavBar ── */
const NavBar = () => {
  const [scrolled,       setScrolled]       = useState(false);
  const [mobileOpen,     setMobileOpen]      = useState(false);
  const [searchOpen,     setSearchOpen]      = useState(false);
  const [activeDropdown, setActiveDropdown]  = useState(null);
  const [profileOpen,    setProfileOpen]     = useState(false);
  const [user,           setUser]            = useState(null);
  const [cartCount,      setCartCount]       = useState(0);
  const [cartItems,     setCartItems]       = useState([]);
  
  const navigate  = useNavigate();
  const location  = useLocation();
  const timerRef  = useRef(null);
  const profileRef = useRef(null);

  /* scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* User & Cart detection */
  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('sufi-cart') || '[]');
    setCartCount(cart.reduce((acc, item) => acc + item.quantity, 0));
    setCartItems(cart.slice(0, 3)); // Show first 3 items in preview
  };

  useEffect(() => {
    const fetchUser = () => {
      const token = localStorage.getItem('sufi-customer-token');
      if (token) {
        fetchCustomerMe(token)
          .then(res => {
            if (res?.status === 401) {
              setUser(null);
              return;
            }
            const userData = res.data?.user || res.user || res;
            setUser(userData);
            if (userData.email) localStorage.setItem('sufi-user-id', userData.email);
          })
          .catch(() => setUser(null));
      } else {
        setUser(null);
      }
    };

    fetchUser();
    updateCartCount();
    
    window.addEventListener('cart-updated', updateCartCount);
    window.addEventListener('auth-updated', fetchUser);
    return () => {
      window.removeEventListener('cart-updated', updateCartCount);
      window.removeEventListener('auth-updated', fetchUser);
    };
  }, [location.pathname]);

  /* Close dropdowns on click outside */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown  = (label) => { clearTimeout(timerRef.current); setActiveDropdown(label); };
  const closeDropdown = ()      => { timerRef.current = setTimeout(() => setActiveDropdown(null), 120); };

  const handleLogout = () => {
    localStorage.removeItem('sufi-customer-token');
    localStorage.removeItem('sufi-user-id');
    setUser(null);
    navigate('/login');
  };

  return (
    <>
      {/* ── Desktop / Tablet Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled
            ? 'bg-[#0d0d0d]/95 backdrop-blur-2xl border-b border-white/[0.06] py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-8 lg:px-14 flex items-center justify-between gap-8">

          {/* Brand */}
          <Link to="/" className="flex-shrink-0">
            <span className="font-cinzel text-xl lg:text-2xl text-white tracking-[0.18em] uppercase font-semibold select-none">
              Sufi <span className="text-brand-gold">Perfumes</span>
            </span>
          </Link>

          {/* Center Nav */}
          <div className="hidden lg:flex items-center gap-10">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => openDropdown(link.label)}
                  onMouseLeave={closeDropdown}
                >
                  <button className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.12em] uppercase text-stone-300 hover:text-white transition-colors duration-200">
                    {link.label}
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${activeDropdown === link.label ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <DropdownMenu items={link.children} visible={activeDropdown === link.label} />
                </div>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`text-[12px] font-medium tracking-[0.12em] uppercase transition-colors duration-200 ${
                    location.pathname === link.href
                      ? 'text-brand-gold'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="text-stone-400 hover:text-brand-gold transition-colors duration-200"
            >
              <Search size={19} strokeWidth={1.5} />
            </button>

            {/* Orders + Cart (only when logged in) */}
            {user && (
              <>
                <Link
                  to="/profile"
                  className="hidden lg:flex items-center gap-2 text-stone-400 hover:text-brand-gold transition-colors duration-200"
                >
                  <Package size={18} strokeWidth={1.5} />
                  <span className="hidden xl:block text-[10px] uppercase tracking-widest font-bold">Orders</span>
                </Link>

                <Link
                  to="/cart"
                  className="hidden lg:flex items-center gap-2 text-stone-400 hover:text-brand-gold transition-colors duration-200 relative"
                >
                  <ShoppingBag size={18} strokeWidth={1.5} />
                  <span className="hidden xl:block text-[10px] uppercase tracking-widest font-bold">Cart</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-gold text-black text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => user ? setProfileOpen(!profileOpen) : navigate('/login')}
                className="text-stone-400 hover:text-brand-gold transition-colors duration-200 flex items-center gap-2"
              >
                <User size={19} strokeWidth={1.5} />
                {user && <span className="hidden xl:block text-[10px] uppercase tracking-widest text-stone-300 font-bold max-w-[100px] truncate">{user.full_name || user.email.split('@')[0]}</span>}
              </button>

              <AnimatePresence>
                {profileOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-4 w-72 bg-[#0d0d0d] border border-white/10 shadow-2xl z-[200] overflow-hidden rounded-sm"
                  >
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                      <p className="text-[9px] uppercase tracking-[0.3em] text-brand-gold font-bold mb-1">MEMBER</p>
                      <p className="text-sm font-bold text-white truncate">{user.full_name || 'Legacy Collector'}</p>
                      <p className="text-[10px] text-stone-500 truncate mt-1">{user.email}</p>
                    </div>
                    
                    <div className="p-2">
                      {/* Orders Preview */}
                      <Link to="/profile" className="flex items-center justify-between px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-white hover:bg-white/[0.03] transition-all rounded-sm group">
                        <div className="flex items-center gap-3">
                          <Package size={14} className="text-brand-gold/60" />
                          <span>My Orders</span>
                        </div>
                        <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                      
                      <div className="h-px bg-white/5 my-1 mx-4" />

                      {/* Cart Preview */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500 font-bold">Your Bag</p>
                          <Link to="/search" className="text-[9px] uppercase tracking-[0.2em] text-brand-gold hover:underline">View All</Link>
                        </div>
                        
                        {cartItems.length > 0 ? (
                          <div className="space-y-3">
                            {cartItems.map((item, idx) => (
                              <div key={`${item.id}-${idx}`} className="flex items-center gap-3 group">
                                <div className="w-10 h-10 bg-[#1a1a1a] p-1 border border-white/5 rounded-sm">
                                  <img src={item.image} alt="" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-white truncate font-medium uppercase tracking-wider">{item.name}</p>
                                  <p className="text-[9px] text-stone-500 mt-0.5">{item.size} • Qty {item.quantity}</p>
                                </div>
                              </div>
                            ))}
                              <button 
                              onClick={() => { setProfileOpen(false); navigate('/cart'); }}
                              className="w-full mt-4 py-3 bg-brand-gold text-black text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                              <ShoppingBag size={12} /> Secure Checkout
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-600 italic py-2">Your collection is empty</p>
                        )}
                      </div>

                      <div className="h-px bg-white/5 my-2 mx-4" />

                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.03] transition-all rounded-sm flex items-center gap-2"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shop Now / Bag */}
            <div className="relative group">
              <Link
                to="/search"
                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-black text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors duration-300"
              >
                {cartCount > 0 ? `Collection (${cartCount})` : 'Shop Now'}
              </Link>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-black text-[10px] font-bold flex items-center justify-center rounded-full border border-brand-gold shadow-lg animate-pulse-slow">
                  {cartCount}
                </span>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="text-stone-300 hover:text-white transition-colors lg:hidden"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Full-Screen Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[108] bg-black/70 backdrop-blur-md"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 h-full w-80 max-w-full z-[109] bg-[#0d0d0d] border-l border-white/[0.06] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-7 border-b border-white/[0.06]">
                <span className="font-cinzel text-lg text-white tracking-[0.15em] uppercase font-semibold">
                  Sufi <span className="text-brand-gold">Perfumes</span>
                </span>
                <button onClick={() => setMobileOpen(false)} className="text-stone-500 hover:text-white transition-colors">
                  <X size={22} strokeWidth={1.5} />
                </button>
              </div>

              {/* Links */}
              <nav className="flex flex-col px-8 py-10 gap-1 flex-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-4 text-[13px] font-medium uppercase tracking-[0.2em] text-stone-400 hover:text-brand-gold transition-colors border-b border-white/[0.04]"
                    >
                      {link.label}
                    </Link>
                    {link.children?.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block py-3 pl-4 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-600 hover:text-stone-300 transition-colors border-b border-white/[0.03]"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </motion.div>
                ))}
              </nav>

              {/* Footer */}
              <div className="px-8 py-8 border-t border-white/[0.06]">
                {user && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="py-3 border border-white/[0.08] text-stone-300 text-[10px] font-bold uppercase tracking-[0.25em] text-center hover:border-brand-gold/40 hover:text-brand-gold transition-colors"
                    >
                      Orders
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setMobileOpen(false)}
                      className="py-3 border border-white/[0.08] text-stone-300 text-[10px] font-bold uppercase tracking-[0.25em] text-center hover:border-brand-gold/40 hover:text-brand-gold transition-colors"
                    >
                      Cart{cartCount > 0 ? ` (${cartCount})` : ''}
                    </Link>
                  </div>
                )}
                <Link
                  to="/search"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full py-4 bg-brand-gold text-black text-[11px] font-bold uppercase tracking-[0.3em] text-center hover:bg-white transition-colors"
                >
                  Shop Collection
                </Link>
                <p className="text-[9px] uppercase tracking-[0.4em] text-stone-700 mt-6 text-center">
                  © {new Date().getFullYear()} Sufi Perfumes
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Search Overlay ── */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

export default NavBar;
