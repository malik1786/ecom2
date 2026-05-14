import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowUpDown, SlidersHorizontal, ChevronDown } from 'lucide-react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import { fetchProducts, searchProducts } from './lib/api';

const CATEGORIES = [
  { label: 'All',              value: 'all' },
  { label: 'Perfume',          value: 'perfume' },
  { label: 'Attar',            value: 'attar' },
  { label: 'Inspired',         value: 'inspired' },
  { label: 'Home Fragrance',   value: 'home-fragrance' },
  { label: 'Limited Edition',  value: 'limited' },
];

const SORT_OPTIONS = [
  { label: 'Newest First',    value: 'newest' },
  { label: 'Price: Low',      value: 'price_asc' },
  { label: 'Price: High',     value: 'price_desc' },
  { label: 'Name A–Z',        value: 'name_asc' },
];

/* ── Spinning gold loader ── */
const GoldLoader = () => (
  <div className="flex flex-col items-center justify-center py-40 gap-8">
    <div className="relative w-14 h-14">
      <div
        className="absolute inset-0"
        style={{
          background: 'conic-gradient(from 0deg, transparent, #e6c479, transparent)',
          animation: 'spin 1.5s linear infinite',
        }}
      />
      <div className="absolute inset-[2px] bg-[#080808] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
      </div>
    </div>
    <p className="text-[10px] uppercase tracking-[0.6em] text-stone-600 font-bold">Scanning Archives…</p>
  </div>
);

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate     = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const initialCat   = searchParams.get('category') || 'all';

  const [live,     setLive]     = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [category, setCategory] = useState(initialCat);
  const [sort,     setSort]     = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef(null);

  /* ── Load products ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        let data;
        if (initialQuery.trim()) {
          data = await searchProducts(initialQuery);
        } else {
          data = await fetchProducts();
        }
        setProducts(Array.isArray(data) ? data : (data?.products || []));
      } catch (err) {
        setError(err.message || 'Unable to load products.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initialQuery]);

  /* ── Sync category from URL ── */
  useEffect(() => {
    setCategory(searchParams.get('category') || 'all');
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = live.trim();
    setSearchParams(q ? { q } : {});
  };

  const clearSearch = () => {
    setLive('');
    setSearchParams({});
    inputRef.current?.focus();
  };

  const handleCategory = (val) => {
    setCategory(val);
    const params = {};
    if (initialQuery) params.q = initialQuery;
    if (val !== 'all') params.category = val;
    setSearchParams(params);
  };

  /* ── Filter & sort ── */
  const displayed = products
    .filter(p => {
      if (category === 'all') return true;
      if (category === 'limited') return p.is_limited_edition;
      return (p.category || '').toLowerCase().includes(category.toLowerCase());
    })
    .sort((a, b) => {
      if (sort === 'price_asc')  return (a.price_cents || 0) - (b.price_cents || 0);
      if (sort === 'price_desc') return (b.price_cents || 0) - (a.price_cents || 0);
      if (sort === 'name_asc')   return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  const limitedCount  = products.filter(p => p.is_limited_edition).length;
  const featuredCount = products.filter(p => p.is_featured).length;

  return (
    <div className="bg-[#080808] min-h-screen selection:bg-brand-gold/20">
      <NavBar />

      {/* ── Hero Header ── */}
      <div className="pt-36 pb-16 px-8 md:px-14 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.8em] text-brand-gold/60 mb-5">Private Discovery</p>
          <h1 className="text-5xl md:text-8xl font-cinzel text-white uppercase tracking-wider leading-none mb-10">
            Explore the<br />
            <span className="text-brand-gold/80">Archive</span>
          </h1>

          {/* Stats row */}
          <div className="flex items-center gap-8 mb-12">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: '#e6c479', boxShadow: '0 0 8px rgba(230,196,121,0.6)' }}
              />
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-stone-500">{products.length} Fragrances</p>
            </div>
            {limitedCount > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ animation: 'spin 3s linear infinite', background: 'conic-gradient(from 0deg, #b08d41, #e6c479, #b08d41)' }}
                />
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-brand-gold/60">{limitedCount} Limited Edition</p>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="relative max-w-2xl">
            <div
              className="absolute inset-[-1px]"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(230,196,121,0.2), transparent)',
                opacity: live ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
            <div className="relative flex items-center gap-4 border border-white/[0.08] bg-white/[0.02] px-6 py-4 focus-within:border-brand-gold/30 transition-colors">
              <Search size={16} className="text-stone-600 flex-shrink-0" strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="text"
                value={live}
                onChange={e => setLive(e.target.value)}
                placeholder="Search by name, notes, collection…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-stone-700 focus:outline-none font-body"
              />
              <AnimatePresence>
                {live && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={clearSearch}
                    className="text-stone-600 hover:text-white transition-colors"
                  >
                    <X size={15} />
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="submit"
                className="flex-shrink-0 px-6 py-2.5 bg-brand-gold text-black text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-white transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* ── Filter / Sort Bar ── */}
      <div className="border-y border-white/[0.05] bg-[#080808] sticky top-16 z-40">
        <div className="max-w-[1400px] mx-auto px-8 md:px-14 py-4 flex flex-wrap items-center gap-4 justify-between">
          {/* Category pills */}
          <div className="flex items-center gap-3 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategory(cat.value)}
                className={`relative px-4 py-2 text-[9px] font-bold uppercase tracking-[0.3em] transition-all duration-300 overflow-hidden ${
                  category === cat.value
                    ? 'text-black'
                    : 'text-stone-500 hover:text-white border border-white/[0.08] hover:border-white/20'
                }`}
              >
                {category === cat.value && (
                  <>
                    {/* Animated gold background for active */}
                    <div
                      className="absolute inset-0"
                      style={{ background: '#e6c479' }}
                    />
                    <div
                      className="absolute inset-[-2px]"
                      style={{
                        background: 'conic-gradient(from 0deg, #b08d41, #e6c479, #f3e5c2, #e6c479, #b08d41)',
                        animation: 'spin 4s linear infinite',
                        zIndex: -1,
                      }}
                    />
                  </>
                )}
                <span className="relative">{cat.label}</span>
                {cat.value === 'limited' && limitedCount > 0 && (
                  <span className={`ml-1.5 text-[7px] ${category === cat.value ? 'text-black/60' : 'text-brand-gold/60'}`}>
                    ({limitedCount})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort + count */}
          <div className="flex items-center gap-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-stone-700 hidden md:block">
              {loading ? '…' : `${displayed.length} found`}
            </p>
            <div className="flex items-center gap-2 border border-white/[0.08] px-4 py-2">
              <ArrowUpDown size={12} className="text-stone-600" />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-transparent text-[9px] font-bold uppercase tracking-[0.3em] text-stone-500 focus:outline-none hover:text-white transition-colors cursor-pointer appearance-none pr-2"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#0d0d0d] text-white">
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="text-stone-600 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <main className="max-w-[1400px] mx-auto px-8 md:px-14 py-16 pb-32">

        {/* Result label */}
        {!loading && (
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-stone-700 mb-10">
            {initialQuery && (
              <span className="text-brand-gold/60 mr-3">"{initialQuery}"</span>
            )}
            {displayed.length} Fragrance{displayed.length !== 1 ? 's' : ''} in Archive
          </p>
        )}

        {loading ? (
          <GoldLoader />
        ) : error ? (
          <div className="py-24 text-center space-y-4">
            <p className="text-red-500/70 text-sm">{error}</p>
            <p className="text-stone-700 text-[10px] uppercase tracking-widest">Ensure the backend service is running.</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-32 text-center space-y-6">
            <p className="text-7xl font-cinzel text-brand-gold/[0.06]">✦</p>
            <p className="text-stone-500 text-base">No fragrances found in the archive.</p>
            <button
              onClick={clearSearch}
              className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold hover:text-white transition-colors border-b border-brand-gold/30 pb-1"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            {/* Limited Edition spotlight — show at top if filtered */}
            {category === 'all' && limitedCount > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative inline-flex items-center gap-3">
                    <div
                      className="absolute inset-[-1px]"
                      style={{
                        background: 'conic-gradient(from 0deg, #b08d41, #e6c479, #b08d41)',
                        animation: 'spin 6s linear infinite',
                      }}
                    />
                    <div className="relative px-5 py-2 bg-[#080808] flex items-center gap-3">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-brand-gold"
                        style={{ boxShadow: '0 0 6px rgba(230,196,121,0.8)' }}
                      />
                      <span className="text-[9px] font-bold uppercase tracking-[0.6em] text-brand-gold">Limited Edition</span>
                    </div>
                  </div>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-brand-gold/20 to-transparent" />
                </div>
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-6"
                >
                  {products
                    .filter(p => p.is_limited_edition)
                    .slice(0, 4)
                    .map((p, i) => (
                      <motion.div
                        key={p.id || p._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <ProductCard {...p} />
                      </motion.div>
                    ))}
                </motion.div>
              </div>
            )}

            {/* Main grid */}
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              <AnimatePresence>
                {displayed
                  .filter(p => category !== 'all' || !p.is_limited_edition)
                  .map((p, i) => (
                    <motion.div
                      key={p.id || p._id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04, duration: 0.4 }}
                    >
                      <ProductCard {...p} />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;
