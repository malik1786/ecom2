import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { formatPrice } from './lib/currency';

const CART_KEY = 'sufi-cart';

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
}

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => readCart());

  useEffect(() => {
    const onCartUpdated = () => setItems(readCart());
    window.addEventListener('cart-updated', onCartUpdated);
    return () => window.removeEventListener('cart-updated', onCartUpdated);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
    [items],
  );

  const subtotalCents = useMemo(
    () => items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [items],
  );

  const updateQuantity = (id, size, nextQty) => {
    const qty = Math.max(1, Math.min(10, Number(nextQty) || 1));
    const next = items.map((item) => (
      item.id === id && item.size === size ? { ...item, quantity: qty } : item
    ));
    setItems(next);
    writeCart(next);
  };

  const removeItem = (id, size) => {
    const next = items.filter((item) => !(item.id === id && item.size === size));
    setItems(next);
    writeCart(next);
  };

  const clearCart = () => {
    setItems([]);
    writeCart([]);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      <NavBar />

      <div className="pt-28 pb-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500">Collection</p>
              <h1 className="mt-2 font-cinzel text-3xl tracking-[0.08em]">
                Your Bag
              </h1>
              <p className="mt-2 text-[11px] text-stone-500 uppercase tracking-[0.25em]">
                {totalItems > 0 ? `${totalItems} item${totalItems === 1 ? '' : 's'} saved` : 'No items saved yet'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 px-5 py-3 border border-white/[0.08] text-[10px] uppercase tracking-[0.25em] text-stone-300 hover:text-white hover:border-white/20 transition-colors"
              >
                <ArrowLeft size={14} /> Continue
              </Link>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-red-500/20 text-[10px] uppercase tracking-[0.25em] text-red-300 hover:text-red-200 hover:border-red-500/40 transition-colors"
                >
                  <Trash2 size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <ShoppingBag size={22} className="mx-auto text-brand-gold/70" />
              <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-stone-400">
                Your bag is empty
              </p>
              <p className="mt-3 text-[12px] text-stone-500">
                Add perfumes you like, and come back to buy later.
              </p>
              <Link
                to="/search"
                className="mt-8 inline-flex items-center justify-center px-8 py-4 bg-brand-gold text-black text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-white transition-colors"
              >
                Explore Collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-3">
                {items.map((item) => {
                  const qty = Number(item.quantity) || 1;
                  const unitCents = Number(item.price) || 0;
                  const lineTotal = unitCents * qty;
                  const image = item.image || item.image_url;
                  return (
                    <div key={`${item.id}-${item.size}`} className="flex gap-4 p-5 border border-white/[0.06] bg-white/[0.02]">
                      <div className="w-16 h-16 bg-[#111] border border-white/[0.06] p-2 flex-shrink-0">
                        {image ? (
                          <img src={image} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-white/[0.03]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold truncate">{item.name}</p>
                            <p className="mt-1 text-[10px] text-stone-500 uppercase tracking-[0.2em]">{item.size}</p>
                            <p className="mt-2 text-[12px] text-brand-gold">{formatPrice(unitCents)}</p>
                          </div>

                          <button
                            onClick={() => removeItem(item.id, item.size)}
                            className="text-stone-500 hover:text-red-300 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="flex items-center border border-white/[0.08]">
                            <button
                              onClick={() => updateQuantity(item.id, item.size, qty - 1)}
                              className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={16} />
                            </button>
                            <div className="w-10 text-center text-[12px] font-semibold">{qty}</div>
                            <button
                              onClick={() => updateQuantity(item.id, item.size, qty + 1)}
                              className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500">Total</p>
                            <p className="text-[12px] text-white font-semibold">{formatPrice(lineTotal)}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/product/${item.id}`)}
                            className="px-5 py-3 border border-white/[0.08] text-[10px] uppercase tracking-[0.25em] text-stone-300 hover:text-white hover:border-white/20 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/product/${item.id}`)}
                            className="px-5 py-3 bg-brand-gold text-black text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-white transition-colors"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="h-fit border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Summary</p>
                <div className="mt-6 space-y-3 text-[12px]">
                  <div className="flex items-center justify-between text-stone-300">
                    <span>Subtotal</span>
                    <span className="text-white font-semibold">{formatPrice(subtotalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="h-px bg-white/[0.06] my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300">Total</span>
                    <span className="text-brand-gold font-bold">{formatPrice(subtotalCents)}</span>
                  </div>
                </div>

                <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-stone-600">
                  Tip: open a product to checkout.
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

