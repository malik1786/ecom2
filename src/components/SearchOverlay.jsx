import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, History, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../lib/api';

const SearchOverlay = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        try {
          const data = await searchProducts(query);
          setResults(data.slice(0, 4));
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const handleSelect = (productId) => {
    onClose();
    navigate(`/product/${productId}`);
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-surface/95 backdrop-blur-3xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-8 md:px-20">
            <h2 className="text-3xl font-display text-primary italic">Search Archive</h2>
            <button onClick={onClose} className="p-3 text-on-surface-variant hover:text-primary transition-colors">
              <X size={32} strokeWidth={1} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop">
            <div className="w-full max-w-5xl space-y-20">
              {/* Input Section */}
              <div className="relative group w-full">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" size={48} strokeWidth={1} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="The fragrance you seek..."
                  className="w-full bg-transparent border-none text-5xl md:text-8xl font-display text-primary placeholder:text-outline-variant/30 focus:outline-none pl-20 md:pl-24 pr-12 py-10 selection:bg-primary/20"
                />
                <div className="h-[1px] w-full bg-outline-variant group-focus-within:bg-primary transition-all duration-700 origin-left" />
              </div>

              {/* Quick Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter w-full">
                {results.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleSelect(product.id)}
                    className="flex items-center gap-6 p-6 bg-surface-container/50 hover:bg-surface-container border border-outline-variant/10 hover:border-primary/30 transition-all cursor-pointer rim-light"
                  >
                    <div className="w-24 h-24 bg-surface-container-high overflow-hidden p-4">
                      <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{product.category}</p>
                      <h4 className="text-xl font-display text-on-surface">{product.name}</h4>
                    </div>
                    <ArrowRight className="text-outline-variant" size={24} strokeWidth={1} />
                  </motion.div>
                ))}
                
                {!query && (
                  <div className="md:col-span-2 py-10 border-t border-outline-variant/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-outline text-center">Suggested: Oud Imperial, Saffron Soul, Midnight Archive</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-12 text-center opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-[0.8em] text-on-surface">Maison Sufi Intelligence Engine</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
