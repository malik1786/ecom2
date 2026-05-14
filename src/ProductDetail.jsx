import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, Plus, Star, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import PurchaseSection from './components/PurchaseSection';
import CheckoutDrawer from './components/CheckoutDrawer';
import ReviewSummary from './components/ReviewSummary';
import ProductCard from './components/ProductCard';
import { fetchProductById, fetchSimilarProducts } from './lib/api';
import { formatPrice } from './lib/currency';
import heroBottle from './assets/hero-bottle.png';

/* ── Animated gold border wrapper ── */
const GoldBorderBox = ({ children, className = '', speed = '6s', always = true }) => (
  <div className={`relative ${className}`}>
    <div
      className="absolute inset-[-1.5px] z-0"
      style={{
        background: 'conic-gradient(from 0deg, #b08d41 0%, #e6c479 20%, #f3e5c2 35%, #e6c479 50%, #b08d41 65%, #f3e5c2 80%, #b08d41 100%)',
        animation: `spin ${speed} linear infinite`,
      }}
    />
    <div className="absolute inset-[1px] bg-[#0a0a0a] z-0" />
    <div className="relative z-10">{children}</div>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [similar, setSimilar]         = useState([]);
  const [selectedImage, setSelectedImage] = useState(heroBottle);
  const [isDrawerOpen, setIsDrawerOpen]   = useState(false);
  const [checkoutConfig, setCheckoutConfig] = useState({ quantity: 1, size: '100ML' });
  const [scrollY, setScrollY]         = useState(0);
  const [wishlist, setWishlist]       = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });

    fetchProductById(id)
      .then(data => {
        const p = data.product || data;
        setProduct(p);
        setSelectedImage(p.image_url || heroBottle);
        fetchSimilarProducts(id).then(setSimilar).catch(() => {});
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('scroll', onScroll);
  }, [id]);

  const displayPrice = product?.price_cents ? formatPrice(product.price_cents) : product?.price;

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

  if (!product) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center flex-col gap-6">
      <p className="text-stone-600 text-sm uppercase tracking-widest">Product not found in the Archive</p>
      <button onClick={() => navigate('/')} className="text-brand-gold text-xs uppercase tracking-widest border-b border-brand-gold/30 pb-1">
        Return to Maison
      </button>
    </div>
  );

  return (
    <div className="bg-[#080808] min-h-screen selection:bg-brand-gold/20">
      <NavBar />

      <main className="max-w-[1400px] mx-auto px-8 md:px-14 pt-36 pb-24">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-16">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] text-stone-600 hover:text-brand-gold transition-colors"
          >
            <ArrowLeft size={14} /> Archive
          </button>
          <span className="text-stone-800">/</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-500">{product.category}</span>
          <span className="text-stone-800">/</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 truncate max-w-[200px]">{product.name}</span>
        </motion.div>

        {/* Main editorial layout (Stitch Redesign) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-[120px] mb-[120px] items-start">
          {/* Left: Bottle Detail Image Gallery */}
          <div className="space-y-6">
            <div className="relative w-full aspect-[3/4] bg-[#201f1f] rounded overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-amber-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div className="absolute inset-0 border border-transparent group-hover:border-t-amber-700/30 group-hover:border-l-amber-700/30 transition-all duration-700 pointer-events-none rounded"></div>
              <img src={selectedImage} alt={product.name} className="w-full h-full object-contain p-12 md:p-16 transition-transform duration-[2000ms] group-hover:scale-105" />
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-20 aspect-[3/4] flex-shrink-0 rounded-sm overflow-hidden border transition-all duration-500 ${
                      selectedImage === img
                        ? 'border-[#e6c479] ring-2 ring-[#e6c479]/20'
                        : 'border-[#4d4639]/30 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col justify-center space-y-6 md:sticky md:top-40">
            <div className="space-y-4">
              <h1 className="font-cinzel text-5xl md:text-[72px] leading-[1.1] tracking-tighter text-[#e6c479]">{product.name}</h1>
              <p className="font-sans text-[18px] text-[#d0c5b4]">{displayPrice}</p>
            </div>
            <div className="h-px w-full bg-[#4d4639]/30"></div>
            <div className="space-y-6">
              <p className="font-sans text-[16px] text-[#e5e2e1] leading-[1.6]">
                {product.description}
              </p>

              {/* Progressive Disclosure / Scent Profile Accordion */}
              {(product.top_notes || product.heart_notes || product.base_notes) && (
                <details className="group border-b border-[#4d4639]/30 pb-4">
                  <summary className="flex justify-between items-center cursor-pointer font-sans font-semibold text-[12px] text-[#e6c479] uppercase tracking-[0.2em] list-none outline-none select-none">
                    <span>The Scent Profile</span>
                    <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <div className="pt-4 flex flex-wrap gap-2">
                    {product.top_notes && <span className="px-3 py-1 bg-[#2a2a2a] text-[#d3a473] font-sans font-semibold text-[10px] uppercase tracking-[0.2em] rounded-sm border border-[#4d4639]/20">Top: {product.top_notes}</span>}
                    {product.heart_notes && <span className="px-3 py-1 bg-[#2a2a2a] text-[#d3a473] font-sans font-semibold text-[10px] uppercase tracking-[0.2em] rounded-sm border border-[#4d4639]/20">Heart: {product.heart_notes}</span>}
                    {product.base_notes && <span className="px-3 py-1 bg-[#2a2a2a] text-[#d3a473] font-sans font-semibold text-[10px] uppercase tracking-[0.2em] rounded-sm border border-[#4d4639]/20">Base: {product.base_notes}</span>}
                  </div>
                </details>
              )}
            </div>

            {/* Purchase section wrapper for integration */}
            <div className="pt-6">
              <PurchaseSection
                product={product}
                onBuyNow={(config) => { setCheckoutConfig(config); setIsDrawerOpen(true); }}
              />
            </div>
          </div>
        </section>

        {/* Visual / Scent Essence Section */}
        <section className="w-screen relative h-[614px] min-h-[500px] mb-[120px] overflow-hidden left-[50%] right-[50%] -ml-[50vw] -mr-[50vw]">
          <div className="absolute inset-0 bg-[#131313]/50 z-10"></div>
          <img alt="Fragrance Notes Essence" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCeIuBqLKeVmK0YjTd2zJIEZEXCImSejje3EnXMBCNl6macoXvNcAphL_yowMTOEnN62Y46ihpa8tySaS_Qgq3cFsj41ycGYEkg6QLpy0OncIfUWvZE-Ny1kzfoe4cuJBJGb2Cvbt_ViZwtwSVwJujSPhQVWwNImCu3EItbS2My6bbPqnHRkr0s-Lh4AbiVRZ-hvfR7-yOmShGsVM2rGQQiVFjfIWt71QiCboKpdpvZ729g74sCcxqsRDeaSsTG_Gydq9ivg0DKnQ"/>
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-5 text-center">
            <h2 className="font-cinzel text-[32px] md:text-[56px] text-[#e6c479] mb-6">Liquid Gold</h2>
            <p className="max-w-2xl font-sans text-[18px] font-light text-[#d0c5b4]">Extracted from the rarest aquilaria trees, our oud is aged in dark cellars to achieve a complexity that defies modern perfumery conventions.</p>
          </div>
        </section>

        {/* Similar Products */}
        {similar.length > 0 && (
          <section className="mt-40 pt-16 border-t border-white/[0.06]">
            <div className="flex items-end justify-between mb-16">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.6em] text-brand-gold/50 mb-3">You Might Also Like</p>
                <h2 className="text-4xl font-cinzel text-white uppercase tracking-wider">Similar Artifacts</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {similar.slice(0, 4).map(p => <ProductCard key={p.id || p._id} {...p} />)}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="mt-32">
          <ReviewSummary productId={product?.id} />
        </section>
      </main>

      {/* Sticky Buy Bar */}
      <AnimatePresence>
        {scrollY > 600 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/[0.06] py-4 px-8 md:px-14"
          >
            {/* Gold animated top line */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background: 'linear-gradient(to right, transparent, #e6c479, transparent)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#111] border border-white/[0.06] p-2 flex-shrink-0">
                  <img src={selectedImage} alt="" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-xs font-cinzel font-bold uppercase tracking-widest text-white">{product.name}</h4>
                  <p className="text-sm font-cinzel text-brand-gold tracking-wider mt-0.5">{displayPrice}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-10 py-4 bg-brand-gold text-black text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-white transition-colors flex-shrink-0"
              >
                Secure Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />

      <CheckoutDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        product={product}
        quantity={checkoutConfig.quantity}
        size={checkoutConfig.size}
        unitPrice={checkoutConfig.unitPrice}
      />
    </div>
  );
};

export default ProductDetail;
