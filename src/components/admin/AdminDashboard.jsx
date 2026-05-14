import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import {
  Clock3,
  LogOut,
  Moon,
  Package,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Users,
  Wallet,
  Settings,
  BarChart3,
  Video,
  Activity,
  Terminal,
} from 'lucide-react';
import { ADMIN_TOKEN_KEY, fetchAdminOverview, getAdminToken } from '../../lib/api';
import { useTheme } from '../../lib/theme';

const defaultMetrics = {
  products: 0,
  customers: 0,
  orders: 0,
  pending_orders: 0,
  revenue: '$0.00',
};

const readProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('sufi-admin-profile') || '{}');
  } catch {
    return {};
  }
};

const formatToday = () =>
  new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

const AdminDashboard = () => {
  const { isLightTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const loadOverview = async () => {
      try {
        const data = await fetchAdminOverview(token);
        setMetrics(data.metrics || defaultMetrics);
        setProfile(readProfile());
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem('sufi-admin-profile');
        navigate('/admin/login');
      } finally {
        setLoadingMetrics(false);
      }
    };

    loadOverview();
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem('sufi-admin-profile');
    navigate('/admin/login');
  };

  const navItems = useMemo(
    () => [
      { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      { name: 'Products', path: '/admin/products', icon: Package },
      { name: 'Home Video', path: '/admin/vhome', icon: Video },
      { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
      { name: 'Customers', path: '/admin/customers', icon: Users },
      { name: 'Settings', path: '/admin/settings', icon: Settings },
      { name: 'System Usage', path: '/admin/system-usage', icon: Activity },
      { name: 'Live Terminal', path: '/admin/terminal', icon: Terminal },
    ],
    [],
  );

  const activeSection = navItems.find((item) => location.pathname.startsWith(item.path))?.name || 'Dashboard';
  const statCards = [
    { label: 'Products', value: metrics.products, icon: Package, accent: 'text-perfume-gold' },
    { label: 'Orders', value: metrics.orders, icon: ShoppingCart, accent: 'text-perfume-gold' },
    { label: 'Customers', value: metrics.customers, icon: Users, accent: 'text-perfume-gold' },
    { label: 'Pending', value: metrics.pending_orders, icon: Clock3, accent: 'text-perfume-gold' },
    { label: 'Revenue', value: metrics.revenue, icon: Wallet, accent: 'text-perfume-gold' },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-4 text-white md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="panel-surface self-start rounded-[2rem] p-6 lg:sticky lg:top-4 lg:w-80">
          <div className="mb-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="luxury-label mb-3">Sufi Atelier</p>
                <h2 className="text-3xl font-cormorant italic text-white">Dashboard</h2>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.26em] text-white/70 transition-colors duration-300 hover:border-perfume-gold/30 hover:text-white"
              >
                {isLightTheme ? <Moon size={14} /> : <SunMedium size={14} />}
                {isLightTheme ? 'Dark' : 'Light'}
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              Curate fashion products, manage incoming orders, and keep customer records organized.
            </p>
          </div>

          <div className="mb-8 rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-perfume-gold/35 bg-perfume-gold/10 text-perfume-gold">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{profile.full_name || 'Administrator'}</p>
                <p className="text-[10px] uppercase tracking-[0.26em] text-stone-400">{profile.username || 'admin'}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Sparkles size={14} className="text-perfume-gold" />
                Active on {formatToday()}
              </div>
              <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${
                metrics.db_status === 'supabase' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}>
                <div className={`h-1 w-1 rounded-full ${metrics.db_status === 'supabase' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                {metrics.db_status || 'Checking...'}
              </div>
            </div>
          </div>

          <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-sm uppercase tracking-[0.24em] transition-all duration-300 ${
                    isActive
                      ? 'border-perfume-gold/40 bg-black text-perfume-gold shadow-[0_0_15px_rgba(230,196,121,0.1)]'
                      : 'border-white/5 bg-[#050505] text-perfume-gold/60 hover:border-perfume-gold/30 hover:text-perfume-gold'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-[10px] font-bold">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full border border-red-500/50 bg-[#cc0000] px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-red-600 shadow-[0_0_20px_rgba(204,0,0,0.2)]"
          >
            <LogOut size={16} />
            Logout
          </button>
        </aside>

        <main className="flex-1 space-y-6">
          <section className="panel-surface rounded-[2rem] p-6 md:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="luxury-label mb-3">{activeSection}</p>
                <h1 className="text-3xl font-cinzel uppercase leading-tight md:text-4xl">
                  Commerce control with a cleaner, faster admin experience.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-stone-300 md:text-base">
                  Your stats stay visible at the top, and the content area below is focused on the section you are actively managing.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-perfume-gold">Today</p>
                <p className="mt-2 text-lg text-white">{formatToday()}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[1.35rem] border border-white/10 bg-black/[0.18] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">{card.label}</p>
                      <Icon size={15} className="text-perfume-gold" />
                    </div>
                    <p className={`mt-3 text-2xl font-semibold ${loadingMetrics ? 'text-stone-500' : card.accent}`}>
                      {loadingMetrics ? '-' : card.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel-surface rounded-[2rem] p-5 md:p-6">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
