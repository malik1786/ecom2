import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroBottle from '../assets/hero-bottle.png';
import { formatPrice } from '../lib/currency';

/* ─────────────────────────────────────────────────────────────────────
   CORRECT animated border technique:
   1. Outer wrapper: overflow:hidden, padding (defines border thickness)
   2. A child div with inset:-150% that SPINS (conic-gradient) — this is 
      the spinning element, much larger than the card so corners are always filled
   3. Content sits on top with solid bg and position:relative z-1
   
   The OUTER wrapper NEVER rotates — only the inner gradient child does.
───────────────────────────────────────────────────────────────────── */

const ProductCard = ({
  _id, id, name, price, price_cents,
  image, image_url, category,
  is_new_arrival, is_limited_edition,
  onAddToBag,
  product_code, sku,
}) => {
  const resolvedId    = _id || id;
  const navigate      = useNavigate();
  const resolvedImage = image_url || image || heroBottle;
  const [imgSrc, setImgSrc]   = useState(resolvedImage);
  const [hovered, setHovered] = useState(false);

  const displayPrice = price_cents ? formatPrice(price_cents) : price;
  const isLimited    = !!is_limited_edition;
  const code         = product_code || sku;

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (onAddToBag) {
      onAddToBag({ id: resolvedId, _id: resolvedId, name, price_cents, price, image: imgSrc });
    } else {
      navigate(`/product/${resolvedId}`);
    }
  };

  /* Always show static border on all product cards to keep it clean */
  const showBorder  = false;
  const borderSpeed = isLimited ? '8s' : '5s';

  return (
    /*
      OUTER: static, overflow:hidden, padding = border thickness.
      This div NEVER rotates.
    */
    <div
      className="group cursor-pointer relative overflow-hidden transition-transform duration-300 active:scale-[0.98]"
      style={{ padding: showBorder ? '1.5px' : '1px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/product/${resolvedId}`)}
    >
      {/* White flash overlay on click */}
      <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity duration-150 pointer-events-none z-50" />

      <div
        className="absolute"
        style={{
          inset: '-150%',
          background: showBorder
            ? 'conic-gradient(from 0deg, transparent 0%, transparent 35%, #e6c479 45%, #ffffff 50%, #e6c479 55%, transparent 65%, transparent 100%)'
            : 'rgba(255,255,255,0.05)',
          animation: showBorder ? `spin ${borderSpeed} linear infinite` : 'none',
          opacity: showBorder ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
      />

      {/* Static border when no hover (not limited) */}
      {!showBorder && (
        <div className="absolute inset-0 border border-brand-gold/40 group-hover:border-brand-gold/80 transition-colors" style={{ zIndex: 0 }} />
      )}

      {/* CONTENT — never rotates, sits above the spinning layer */}
      <div className="relative bg-[#0d0d0d] overflow-hidden" style={{ zIndex: 1 }}>

        {/* Limited Edition badge */}
        {isLimited && (
          <div className="absolute top-4 left-4 z-20">
            <div className="relative overflow-hidden" style={{ padding: '1px' }}>
              {/* Badge's own mini spinning border */}
              <div
                className="absolute"
                style={{
                  inset: '-150%',
                  background: 'conic-gradient(from 0deg, #b08d41, #e6c479, #b08d41)',
                  animation: 'spin 4s linear infinite',
                }}
              />
              <span className="relative block px-3 py-1 text-[7px] font-bold uppercase tracking-[0.5em] text-brand-gold bg-[#0d0d0d]" style={{ zIndex: 1 }}>
                Édition Limitée
              </span>
            </div>
          </div>
        )}

        {/* New Arrival badge */}
        {is_new_arrival && !isLimited && (
          <div className="absolute top-4 left-4 z-20">
            <span className="block px-3 py-1 text-[7px] font-bold uppercase tracking-[0.4em] text-white/40 border border-white/10 bg-black/60 backdrop-blur-sm">
              New Arrival
            </span>
          </div>
        )}

        {/* Product image */}
        <div className="relative aspect-[3/4] overflow-hidden flex items-center justify-center p-6 bg-gradient-to-b from-[#111] to-[#0d0d0d]">
          <motion.img
            src={imgSrc}
            alt={name}
            onError={() => setImgSrc(heroBottle)}
            className="w-full h-full object-contain transition-all duration-[1800ms] group-hover:scale-105 group-hover:brightness-110 drop-shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
          />

          {/* Soft reflection */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1/2 h-6 bg-black/30 blur-2xl rounded-full scale-x-150 opacity-40 pointer-events-none" />

          {/* Hover buy button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-8 px-6 pointer-events-none group-hover:pointer-events-auto z-40">
            <button
              onClick={handleBuyNow}
              className="w-full py-4 bg-brand-gold text-black text-[9px] font-bold uppercase tracking-[0.4em] hover:bg-white active:bg-white active:scale-95 transition-all shadow-2xl"
            >
              Discover Now
            </button>
          </div>
        </div>

        {/* Info area */}
        <div className="px-5 pb-7 pt-3 space-y-3 text-center">
          <p className="text-[7px] font-bold uppercase tracking-[0.8em] text-stone-600 group-hover:text-brand-gold/60 transition-colors duration-500">
            {category || 'Private Archive'}
          </p>

          <h3 className="text-base font-cormorant italic text-white leading-tight px-2">{name}</h3>

          {/* Product code — light rotating border */}
          {code && (
            <div className="flex justify-center">
              <div className="relative overflow-hidden" style={{ padding: '1px' }}>
                {/* Spinning gradient for the code box */}
                <div
                  className="absolute"
                  style={{
                    inset: '-150%',
                    background: 'conic-gradient(from 0deg, transparent 0%, #e6c479 25%, transparent 50%, #e6c479 75%, transparent 100%)',
                    animation: 'spin 5s linear infinite',
                  }}
                />
                <span
                  className="relative block px-4 py-1 text-[7px] font-bold uppercase tracking-[0.5em] font-cinzel bg-[#0d0d0d]"
                  style={{ zIndex: 1, color: 'rgba(230,196,121,0.7)' }}
                >
                  {code}
                </span>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-sm font-cinzel text-brand-gold/90 tracking-widest">{displayPrice}</p>
            <div className="h-[1px] w-8 bg-white/10 group-hover:w-14 group-hover:bg-brand-gold/30 transition-all duration-700" />
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-40 transition-opacity duration-500">
            {[1,2,3,4,5].map(s => <div key={s} className="w-1 h-1 rounded-full bg-brand-gold" />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
