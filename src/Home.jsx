import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, TrendingUp, Clock, Plus, Star } from 'lucide-react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Hero from './components/Hero';
import CuratedCollections from './components/CuratedCollections';
import Atelier from './components/Atelier';
import TheIcons from './components/TheIcons';
import ProductCard from './components/ProductCard';
import { fetchProducts, fetchRecommendations } from './lib/api';
import heroBottle from './assets/hero-bottle.png';

/* ── Cinematic Marquee ── */
const Marquee = () => (
  <div className="border-y border-white/5 py-5 overflow-hidden bg-black relative">
    <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10 pointer-events-none" />
    <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
      {Array(8).fill(['MAISON SUFI', '✦', 'PRIVATE ARCHIVE', '✦', 'EDITION 2024', '✦', 'LIMITED RELEASE', '✦', 'ATTAR ROYALE', '✦']).flat().map((text, i) => (
        <span key={i} className={`text-[9px] font-bold uppercase tracking-[0.7em] px-10 ${text === '✦' ? 'text-brand-gold' : 'text-stone-700'}`}>
          {text}
        </span>
      ))}
    </div>
  </div>
);

/* ── Big Featured Section ── */
const FeaturedBento = ({ products, navigate }) => {
  if (!products || products.length === 0) return null;
  const main      = products[0];
  const secondary = products.slice(1, 3);

  return (
    <section className="py-32 bg-[#080808]">
      <div className="max-w-[1400px] mx-auto px-8 md:px-14">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.7em] text-brand-gold/60 mb-4">The Selection</p>
            <h2 className="text-5xl md:text-7xl font-cinzel text-white uppercase tracking-wider leading-none">
              Featured <br /><span className="text-brand-gold/80 italic font-cormorant text-4xl md:text-6xl not-italic">Vessels</span>
            </h2>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="hidden md:flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-stone-500 hover:text-brand-gold transition-colors group"
          >
            View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Big Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
          {/* Main Hero Card — with static border */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-8 group cursor-pointer relative overflow-hidden transition-transform duration-300 active:scale-[0.98] border border-brand-gold/40 hover:border-brand-gold/80 bg-[#0d0d0d] transition-colors"
            onClick={() => navigate(`/product/${main.id || main._id}`)}
          >
            {/* White flash overlay */}
            <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-150 pointer-events-none z-50" />

            <div className="relative z-10 h-full min-h-[500px] lg:min-h-full overflow-hidden">
              <img
                src={main.image_url || main.image}
                alt={main.name}
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-75 group-hover:scale-105 transition-all duration-[1500ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

              <div className="absolute bottom-0 left-0 p-10 w-full">
                <div className="flex items-end justify-between">
                  <div className="space-y-4">
                    <span className="inline-block px-4 py-1.5 text-[8px] font-bold uppercase tracking-[0.5em] text-brand-gold border border-brand-gold/30 bg-black/60 backdrop-blur-sm">
                      {main.category || 'Signature'}
                    </span>
                    <h3 className="text-4xl md:text-5xl font-cinzel text-white uppercase tracking-wider leading-tight">{main.name}</h3>
                    <p className="text-sm text-stone-400 font-body max-w-md leading-relaxed">
                      {main.tagline || main.description?.slice(0, 100)}
                    </p>
                    <p className="text-2xl font-cinzel text-brand-gold tracking-widest">
                      {main.price_cents ? `₹${(main.price_cents / 100).toLocaleString()}` : main.price}
                    </p>
                  </div>
                  <button className="h-16 w-16 flex-shrink-0 rounded-full border border-brand-gold/40 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-black transition-all duration-300 backdrop-blur-sm bg-black/40">
                    <Plus size={22} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Secondary Stack — col 4 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {secondary.map((p, i) => (
              <motion.div
                key={p.id || p._id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.7 }}
                viewport={{ once: true }}
                className="flex-1 group cursor-pointer relative overflow-hidden transition-transform duration-300 active:scale-[0.98] border border-brand-gold/40 hover:border-brand-gold/80 bg-[#0d0d0d] transition-colors"
                onClick={() => navigate(`/product/${p.id || p._id}`)}
              >
                {/* White flash overlay */}
                <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-150 pointer-events-none z-50" />

                <div className="relative z-10 h-full overflow-hidden">
                  <img
                    src={p.image_url || p.image}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-75 group-hover:scale-105 transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6">
                    <span className="inline-block text-[8px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-2">{p.category}</span>
                    <h3 className="text-2xl font-cinzel text-white uppercase tracking-wider">{p.name}</h3>
                    <p className="text-brand-gold font-cinzel text-sm mt-2">
                      {p.price_cents ? `₹${(p.price_cents / 100).toLocaleString()}` : p.price}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Limited Edition Big Section ── */
const LimitedEditionSection = ({ products, navigate }) => {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-32 bg-[#050505] relative overflow-hidden">
      {/* Ambient gold glow in background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(230,196,121,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-8 md:px-14 relative z-10">

        {/* ── BIG CONTAINER with ALWAYS ON rotating gold border ── */}
        <div className="relative overflow-hidden rounded-sm" style={{ padding: '4px' }}>

          {/* 360 Rotating Border Light Effect (Always visible, no hover needed) */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '-150%',
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 25%, #b08d41 35%, #e6c479 45%, #ffffff 50%, #e6c479 55%, #b08d41 65%, transparent 75%, transparent 100%)',
              animation: 'spin 6s linear infinite',
            }}
          />

          {/* Static base border */}
          <div className="absolute inset-0 border border-brand-gold/20" style={{ zIndex: 0 }} />

          {/* Static inner content — NEVER rotates */}
          <div className="relative bg-[#060606] h-full w-full" style={{ zIndex: 1 }}>


            {/* Gold corner ornaments */}
            {['top-0 left-0', 'top-0 right-0 scale-x-[-1]', 'bottom-0 left-0 scale-y-[-1]', 'bottom-0 right-0 scale-[-1]'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} pointer-events-none`} style={{ zIndex: 2 }}>
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <path d="M0 0 L24 0 L24 2.5 L2.5 2.5 L2.5 24 L0 24 Z" fill="#e6c479" opacity="0.5"/>
                  <path d="M6 0 L18 0 L18 1.5 L6 1.5 Z" fill="#e6c479" opacity="0.25"/>
                  <path d="M0 6 L1.5 6 L1.5 18 L0 18 Z" fill="#e6c479" opacity="0.25"/>
                </svg>
              </div>
            ))}

            <div className="px-10 py-16 md:px-16 md:py-20">

              {/* Section header */}
              <div className="text-center mb-16">
                <p className="text-[9px] font-bold uppercase tracking-[1.4em] text-brand-gold/50 mb-6">
                  ✦ &nbsp; Private Reserve &nbsp; ✦
                </p>
                <h2 className="text-5xl md:text-8xl font-cinzel uppercase tracking-[0.15em] leading-none">
                  <span className="text-white">Limited </span>
                  <span className="text-brand-gold">Edition</span>
                </h2>
                <div className="flex items-center justify-center gap-4 mt-8">
                  <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-brand-gold/30" />
                  <p className="text-[9px] uppercase tracking-[0.5em] text-stone-600 font-body">
                    Exclusively Crafted · Rare Extractions
                  </p>
                  <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-brand-gold/30" />
                </div>
              </div>

              {/* Product grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {products.slice(0, 6).map((p, i) => (
                  <motion.div
                    key={p.id || p._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.7 }}
                    viewport={{ once: true }}
                  >
                    <div
                      className="group cursor-pointer relative overflow-hidden transition-transform duration-300 active:scale-[0.98] border border-brand-gold/40 hover:border-brand-gold/80 bg-[#0c0c0c] transition-colors"
                      onClick={() => navigate(`/product/${p.id || p._id}`)}
                    >
                      {/* White flash overlay */}
                      <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-150 pointer-events-none z-50" />

                      {/* Card content — static */}
                      <div className="relative overflow-hidden" style={{ zIndex: 1 }}>

                        {/* Limited badge */}
                        <div className="absolute top-4 right-4" style={{ zIndex: 10 }}>
                          <div className="relative overflow-hidden" style={{ padding: '1px' }}>
                            <div className="absolute" style={{ inset: '-150%', background: 'conic-gradient(from 0deg, #b08d41, #e6c479, #b08d41)', animation: 'spin 4s linear infinite' }} />
                            <span className="relative block px-3 py-1 text-[7px] font-bold uppercase tracking-[0.5em] text-brand-gold bg-[#0c0c0c]" style={{ zIndex: 1 }}>
                              Limited
                            </span>
                          </div>
                        </div>

                        {/* Image */}
                        <div className="relative aspect-[3/4] overflow-hidden flex items-center justify-center p-8 bg-gradient-to-b from-[#121212] to-[#0c0c0c]">
                          <img
                            src={p.image_url || p.image || '/placeholder.png'}
                            alt={p.name}
                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                            className="w-full h-full object-contain transition-all duration-[2000ms] group-hover:scale-105 drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
                          />
                          <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(230,196,121,0.05), transparent)' }} />

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-8 px-6">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/product/${p.id || p._id}`); }}
                              className="w-full py-4 bg-brand-gold text-black text-[9px] font-bold uppercase tracking-[0.4em] hover:bg-white transition-all"
                            >
                              Acquire Now
                            </button>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="px-7 pb-8 pt-4 text-center space-y-3">
                          <p className="text-[8px] font-bold uppercase tracking-[0.7em] text-brand-gold/40">{p.category || 'Signature'}</p>
                          <h3 className="text-lg font-cinzel text-white tracking-wider uppercase">{p.name}</h3>

                          {/* Product code — light rotating border */}
                          {(p.product_code || p.sku) && (
                            <div className="flex justify-center">
                              <div className="relative overflow-hidden" style={{ padding: '1px' }}>
                                <div className="absolute" style={{ inset: '-150%', background: 'conic-gradient(from 0deg, transparent, #e6c479 25%, transparent 50%, #e6c479 75%, transparent)', animation: 'spin 5s linear infinite' }} />
                                <span className="relative block px-4 py-1 text-[7px] font-bold uppercase tracking-[0.5em] text-brand-gold/70 bg-[#0c0c0c] font-cinzel" style={{ zIndex: 1 }}>
                                  {p.product_code || p.sku}
                                </span>
                              </div>
                            </div>
                          )}

                          <p className="text-base font-cinzel text-brand-gold tracking-widest">
                            {p.price_cents ? `₹${(p.price_cents / 100).toLocaleString()}` : p.price}
                          </p>

                          <div className="flex items-center justify-center gap-1 opacity-40">
                            {[1,2,3,4,5].map(s => <Star key={s} size={8} className="text-brand-gold fill-brand-gold" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA button */}
              <div className="flex justify-center mt-14">
                <button
                  onClick={() => navigate('/search?category=limited')}
                  className="relative overflow-hidden flex items-center gap-4 px-12 py-5 text-brand-gold text-[10px] font-bold uppercase tracking-[0.5em] group"
                  style={{ border: '1px solid rgba(230,196,121,0.25)' }}
                >
                  <div className="absolute inset-0 bg-brand-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative group-hover:text-black transition-colors duration-500">Explore Full Archive</span>
                  <ArrowRight size={14} className="relative group-hover:text-black group-hover:translate-x-1 transition-all duration-500" />
                </button>
              </div>

            </div>
          </div>
        </div>
        {/* ── end big container ── */}

      </div>
    </section>
  );
};

/* ── Product Slider ── */
const ProductSlider = ({ title, label, icon: Icon, products, navigate }) => {
  const scrollRef = React.useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -scrollRef.current.clientWidth * 0.8 : scrollRef.current.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-[1400px] mx-auto px-8 md:px-14">
        
        {/* ── BIG CONTAINER ── */}
        <div className="relative overflow-hidden rounded-sm" style={{ padding: '3px' }}>
          
          {/* Rotating Border Light Effect */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '-150%',
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 30%, #b08d41 40%, #e6c479 48%, #ffffff 50%, #e6c479 52%, #b08d41 60%, transparent 70%, transparent 100%)',
              animation: 'spin 8s linear infinite',
            }}
          />
          
          {/* Static base border */}
          <div className="absolute inset-0 border border-brand-gold/20" style={{ zIndex: 0 }} />

          {/* Static inner content */}
          <div className="relative bg-[#060606] h-full w-full py-14 px-8 md:px-14" style={{ zIndex: 1 }}>
            
            <div className="flex justify-between items-end mb-12">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.6em] text-brand-gold/60 mb-3 flex items-center gap-2">
                  {Icon && <Icon size={11} />}{label}
                </p>
                <h2 className="text-3xl md:text-5xl font-cinzel text-white uppercase tracking-wider">{title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => scroll('left')} disabled={!canScrollLeft}
                  className="w-12 h-12 border border-white/10 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold transition-all disabled:opacity-20 text-stone-500 bg-black/40 backdrop-blur-sm">
                  <ChevronLeft size={18} strokeWidth={1.5} />
                </button>
                <button onClick={() => scroll('right')} disabled={!canScrollRight}
                  className="w-12 h-12 border border-white/10 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold transition-all disabled:opacity-20 text-stone-500 bg-black/40 backdrop-blur-sm">
                  <ChevronRight size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} onScroll={checkScroll} className="flex gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6">
              {products.map((p) => (
                <div key={p.id || p._id} className="w-[280px] sm:w-[320px] lg:w-[340px] flex-shrink-0 snap-start">
                  <ProductCard {...p} />
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

/* ── Big Container Grid (For non-slider sections) ── */
const BigContainerGrid = ({ title, label, icon: Icon, products, navigate }) => {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-[1400px] mx-auto px-8 md:px-14">
        
        {/* ── BIG CONTAINER ── */}
        <div className="relative overflow-hidden rounded-sm" style={{ padding: '3px' }}>
          
          {/* Rotating Border Light Effect */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '-150%',
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 30%, #b08d41 40%, #e6c479 48%, #ffffff 50%, #e6c479 52%, #b08d41 60%, transparent 70%, transparent 100%)',
              animation: 'spin 8s linear infinite',
            }}
          />
          
          {/* Static base border */}
          <div className="absolute inset-0 border border-brand-gold/20" style={{ zIndex: 0 }} />

          {/* Static inner content */}
          <div className="relative bg-[#060606] h-full w-full py-14 px-8 md:px-14" style={{ zIndex: 1 }}>
            
            <div className="mb-12 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.6em] text-brand-gold/60 mb-3 flex items-center justify-center gap-2">
                {Icon && <Icon size={11} />}{label}
              </p>
              <h2 className="text-3xl md:text-5xl font-cinzel text-white uppercase tracking-wider">{title}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id || p._id} {...p} />
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

/* ── Stats Bar ── */
const StatsBar = () => (
  <section className="py-20 bg-[#080808] border-y border-white/[0.04]">
    <div className="max-w-[1400px] mx-auto px-8 md:px-14">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Olfactory Notes', value: '300+' },
          { label: 'Global Boutiques', value: '12' },
          { label: 'Years of Heritage', value: '25' },
          { label: 'Pure Extractions', value: '100%' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className="text-center space-y-2"
          >
            <p className="text-4xl md:text-6xl font-cormorant italic text-brand-gold/80">{stat.value}</p>
            <p className="text-[9px] uppercase tracking-[0.4em] text-stone-600 font-bold">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ── Home Page ── */
const Home = () => {
  const navigate = useNavigate();
  const [products,        setProducts]        = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchProducts(), fetchRecommendations()])
      .then(([pRes, rRes]) => {
        if (pRes.status === 'fulfilled') {
          const arr = Array.isArray(pRes.value) ? pRes.value : (pRes.value.products || []);
          setProducts(arr);
        }
        if (rRes.status === 'fulfilled') {
          const arr = Array.isArray(rRes.value) ? rRes.value : (rRes.value.results || []);
          setRecommendations(arr);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => products.filter(p => p.is_featured),       [products]);
  const limited  = useMemo(() => products.filter(p => p.is_limited_edition), [products]);
  const trending = useMemo(() => products.filter(p => p.is_trending),        [products]);
  const arrivals = useMemo(() => products.filter(p => p.is_new_arrival),     [products]);

  // Fallback mocks if the database doesn't have these explicitly flagged
  const featuredDisplay = featured.length > 0 ? featured : products.slice(0, 4);
  const limitedDisplay  = limited.length  > 0 ? limited  : products.slice(0, 4);
  const trendingDisplay = trending.length > 0 ? trending : products.slice(0, 6);
  const arrivalsDisplay = arrivals.length > 0 ? arrivals : products.slice(2, 6);
  const bestSellerDisplay = products.slice(1, 5); // Mocked for display
  const saleDisplay       = products.slice(4, 8); // Mocked for display

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="relative w-16 h-16">
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
    </div>
  );

  return (
    <div className="bg-[#080808] min-h-screen relative selection:bg-brand-gold/20">
      <NavBar />
      <main>
        <Hero />
        <Marquee />

        <StatsBar />

        {/* 1. Featured (Slider) */}
        <ProductSlider title="Featured" label="Signature" icon={Star} products={featuredDisplay} navigate={navigate} />

        {/* Limited Edition (Big Container Custom) */}
        <LimitedEditionSection products={limitedDisplay} navigate={navigate} />

        {/* 2. Trending (Slider) */}
        <ProductSlider title="Trending" label="Public Edit" icon={TrendingUp} products={trendingDisplay} navigate={navigate} />

        {/* Cinematic Brand Interlude */}
        <section className="h-[40vh] relative overflow-hidden flex items-center justify-center border-y border-white/[0.04] my-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-transparent to-[#080808]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10 text-center space-y-4"
          >
            <h2 className="text-7xl md:text-[130px] font-cormorant italic text-brand-gold/[0.07] leading-none">Maison Sufi</h2>
            <p className="text-[9px] font-bold uppercase tracking-[1.2em] text-stone-700">The Eternal Scent</p>
          </motion.div>
        </section>

        {/* 3. New Arrival (Slider) */}
        <ProductSlider title="New Arrival" label="The Archive" icon={Clock} products={arrivalsDisplay} navigate={navigate} />

        {/* 4. Best Seller (Slider) */}
        <ProductSlider title="Best Seller" label="Iconic" icon={Star} products={bestSellerDisplay} navigate={navigate} />

        {/* 5. On Sale (Slider) */}
        <ProductSlider title="On Sale" label="Special Offer" icon={Zap} products={saleDisplay} navigate={navigate} />

      </main>
      <Footer />
    </div>
  );
};

export default Home;
