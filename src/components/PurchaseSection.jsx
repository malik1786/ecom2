import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronRight, Truck, ShieldCheck, RotateCcw, Minus, Plus, Check } from 'lucide-react';
import { formatPrice } from '../lib/currency';

const TRUST_ITEMS = [
  { icon: Truck,        label: 'Free Delivery',       sub: 'Worldwide Complimentary' },
  { icon: ShieldCheck,  label: 'Authenticated',        sub: 'Certificate of Origin' },
  { icon: RotateCcw,    label: '14-Day Returns',       sub: 'Sealed Packaging Only' },
];

const ML_OPTIONS = [
  { label: '50ML',  sub: 'Compact' },
  { label: '100ML', sub: 'Classic' },
  { label: '200ML', sub: 'Heritage' },
];

const PurchaseSection = ({ product, onBuyNow }) => {
  const variants = Array.isArray(product?.variants) && product.variants.length > 0 
    ? product.variants.map(v => ({ label: v.size, price: v.price }))
    : ML_OPTIONS;

  const [size, setSize] = useState(variants[0]?.label || '100ML');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [bagAdded, setBagAdded] = useState(false);

  const selectedVariant = variants.find(v => v.label === size) || variants[0];
  const unitPrice = selectedVariant?.price 
    ? Math.round(parseFloat(selectedVariant.price) * 100) 
    : (product?.sale_price_cents || product?.price_cents || 0);

  const handleBuyNow = async () => {
    if (!product) return;
    setSubmitting(true);
    try {
      if (typeof onBuyNow === 'function') {
        onBuyNow({ quantity, size, unitPrice });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBagAdd = () => {
    const productId = product?._id ?? product?.id ?? product?.product_id;
    if (!productId) return;
    
    const cartItem = {
      id: productId,
      name: product.name,
      price: unitPrice,
      image: product.image_url || product.image,
      size,
      quantity,
      timestamp: Date.now()
    };

    const existingCart = JSON.parse(localStorage.getItem('sufi-cart') || '[]');
    // For simplicity, we just append or update if same ID + size
    const existingIndex = existingCart.findIndex(item => item.id === productId && item.size === size);
    if (existingIndex > -1) {
      existingCart[existingIndex].quantity += quantity;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem('sufi-cart', JSON.stringify(existingCart));
    setBagAdded(true);
    setTimeout(() => setBagAdded(false), 2000);
    
    // Dispatch custom event to notify NavBar
    window.dispatchEvent(new Event('cart-updated'));
  };

  return (
    <div className="space-y-12">
      {/* Volume Selection */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Volume Selection</h4>
          <span className="text-[8px] text-outline uppercase tracking-widest">Archive Ref: {String(product?.id || '').slice(-4)}</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {variants.map(opt => (
            <button
              key={opt.label}
              onClick={() => setSize(opt.label)}
              className={`flex-1 py-5 px-4 border transition-all duration-500 relative overflow-hidden group ${
                size === opt.label ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
              }`}
            >
              <p className={`text-xs font-bold tracking-[0.2em] transition-colors ${size === opt.label ? 'text-primary' : 'text-on-surface-variant'}`}>{opt.label}</p>
              {opt.price && <p className="text-[9px] font-bold text-outline mt-1 italic">₹{opt.price}</p>}
              {size === opt.label && <motion.div layoutId="active-size" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Action Suite */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-outline-variant/30 h-[56px] rounded bg-surface">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-full flex items-center justify-center text-outline-variant hover:text-primary transition-colors"><Minus size={16} /></button>
            <span className="w-10 text-center font-sans font-semibold text-sm text-on-surface">{quantity}</span>
            <button onClick={() => setQuantity(q => Math.min(10, q + 1))} className="w-12 h-full flex items-center justify-center text-outline-variant hover:text-primary transition-colors"><Plus size={16} /></button>
          </div>
          <motion.button
            onClick={handleBuyNow}
            disabled={submitting}
            className="flex-1 h-[56px] bg-[#c9a961] text-[#131313] font-sans font-semibold text-[12px] uppercase tracking-[0.2em] rounded flex items-center justify-center gap-3 hover:bg-gradient-to-r hover:from-[#8b6914] hover:to-[#c9a961] hover:shadow-[0_0_15px_rgba(139,105,20,0.3)] transition-all duration-300 disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Buy Now'}
            <ChevronRight size={16} />
          </motion.button>
        </div>
        
        <button 
          onClick={handleBagAdd}
          className="w-full h-[56px] border border-outline-variant/30 bg-transparent text-[#d0c5b4] font-sans font-semibold text-[12px] uppercase tracking-[0.2em] rounded hover:border-primary hover:text-primary transition-all duration-300 flex items-center justify-center gap-2"
        >
          {bagAdded ? <><Check size={16}/> Added to Bag</> : <><ShoppingBag size={16}/> Add to Collection</>}
        </button>
      </div>

      {/* Trust Grid */}
      <div className="grid grid-cols-3 gap-8 pt-8 border-t border-outline-variant/10">
        {TRUST_ITEMS.map(item => (
          <div key={item.label} className="text-center space-y-2 group">
            <item.icon size={20} className="mx-auto text-outline-variant group-hover:text-primary transition-all" strokeWidth={1} />
            <h5 className="text-[8px] font-bold uppercase tracking-widest text-on-surface">{item.label}</h5>
            <p className="text-[7px] text-outline leading-tight">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseSection;
