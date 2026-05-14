import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Loader2, ShieldCheck, Package, Truck, CreditCard } from 'lucide-react';
import {
  createOrder,
  createPaymentOrder,
  fetchCustomerMe,
  fetchPublicSettings,
  getCustomerToken,
  startPayment,
  verifyGatewayPayment,
} from '../lib/api';
import { formatPrice } from '../lib/currency';

// ENV-driven Razorpay public key (fallback)
const VITE_RAZORPAY_KEY = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
const SHIPPING_KEY = 'sufi-shipping';

const StepDots = ({ current, total }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`h-[2px] transition-all duration-500 ${i < current ? 'w-6 bg-brand-gold' : i === current - 1 ? 'w-8 bg-brand-gold' : 'w-4 bg-white/10'}`} />
    ))}
  </div>
);

const Field = ({ label, name, type = 'text', value, onChange, required, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[8px] uppercase tracking-[0.4em] font-bold text-stone-600">{label}{required && <span className="text-brand-gold ml-1">*</span>}</label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} className="w-full bg-white/[0.02] border border-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-800 focus:outline-none focus:border-brand-gold/40 transition-colors" />
  </div>
);

const STEPS = ['Review', 'Details', 'Payment', 'Confirmed'];

const CheckoutDrawer = ({ isOpen, onClose, product, quantity = 1, size = '100ML', unitPrice: passedUnitPrice }) => {
  const [step, setStep]               = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState('');
  const [orderId, setOrderId]         = useState('');
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const topRef = useRef(null);

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    address: '', city: '', state: '', country: 'India',
  });

  const readSavedShipping = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SHIPPING_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  };

  const unitPrice  = passedUnitPrice || product?.price_cents || 0;
  const totalCents = unitPrice * quantity;
  const displayUnit  = unitPrice  ? formatPrice(unitPrice)  : product?.price || 'Rs. 0';
  const displayTotal = totalCents ? formatPrice(totalCents) : 'Rs. 0';

  useEffect(() => {
    if (!isOpen) return;
    fetchPublicSettings().then(d => {
        setRazorpayEnabled(d?.razorpay_enabled === 'true' || d?.razorpay_enabled === true);
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setError('');
        setPaymentMethod('online');
        const saved = readSavedShipping();
        setForm({
          fullName: saved.fullName || '',
          email: saved.email || '',
          phone: saved.phone || '',
          address: saved.address || '',
          city: saved.city || '',
          state: saved.state || '',
          country: saved.country || 'India',
        });
      }, 400);
      return;
    }

    // When opening: prefill from saved shipping + logged-in user (Google/email login).
    const saved = readSavedShipping();
    setForm((prev) => ({
      ...prev,
      ...saved,
      country: saved.country || prev.country || 'India',
    }));

    const token = getCustomerToken();
    if (token) {
      fetchCustomerMe(token)
        .then((res) => {
          const user = res?.data?.user || res?.user || res?.data || null;
          if (!user) return;
          setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || user.full_name || user.fullName || '',
            email: prev.email || user.email || '',
          }));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => { topRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      try {
        localStorage.setItem(SHIPPING_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors (private mode / quota)
      }
      return next;
    });
  };

  const handleNext = () => {
    // If we already have the required client fields, skip the details step.
    if (step === 1 && form.fullName.trim() && form.email.trim() && form.address.trim()) {
      setStep(3);
      setError('');
      return;
    }
    if (step === 2 && (!form.fullName.trim() || !form.email.trim() || !form.address.trim())) {
      setError('Please fill in all required fields.'); return;
    }
    setStep(s => s + 1); setError('');
  };

  const ensureRazorpayScript = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleSubmit = async () => {
    setIsSubmitting(true); setError('');
    try {
      const resolvedProductId = product?._id ?? product?.id ?? product?.product_id;
      if (!resolvedProductId) throw new Error('Product context lost. Please refresh.');

      const result = await createOrder({
        customer: { full_name: form.fullName, email: form.email, phone: form.phone, address: form.address, city: form.city, state: form.state, country: form.country },
        items: [{ product_id: resolvedProductId, quantity }],
        notes: `Volume: ${size}`,
        payment_method: paymentMethod,
      });

      if (paymentMethod === 'online') {
        const customerToken = getCustomerToken();
        const amountInRupees = Number(((totalCents || 0) / 100).toFixed(2));
        const userId = localStorage.getItem('sufi-user-id') || form.email;
        
        const paymentOrder = await createPaymentOrder({ user_id: userId, amount: amountInRupees, currency: 'INR' }, customerToken);
        const poData = paymentOrder?.data || paymentOrder;

        const started = await startPayment({ order_id: poData.order_id, customerDetails: { firstname: form.fullName, email: form.email, phone: form.phone, productinfo: product?.name } }, customerToken);
        const stData = started?.data || started;

        if (stData?.gateway === 'RAZORPAY') {
          await ensureRazorpayScript();
          const rzpKey = stData.key || VITE_RAZORPAY_KEY;
          if (!rzpKey) throw new Error('Gateway configuration incomplete.');

          await new Promise((resolve, reject) => {
            const rzp = new window.Razorpay({
              key: rzpKey, amount: stData.amount, currency: stData.currency, name: 'Sufi Perfume',
              description: result?.order?.order_number, order_id: stData.razorpay_order_id,
              handler: async (resp) => {
                try {
                  await verifyGatewayPayment({ order_id: poData.order_id, razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature }, 'RAZORPAY', customerToken);
                  resolve();
                } catch (e) { reject(e); }
              },
              prefill: { name: form.fullName, email: form.email, contact: form.phone },
              theme: { color: '#d6b25e' },
              modal: { ondismiss: () => reject(new Error('Payment cancelled.')) }
            });
            rzp.open();
          });
        } else {
          throw new Error('Online gateway unreachable. Use COD.');
        }
      }

      setOrderId(result?.order?.order_number || 'SF-CONFIRMED');
      setStep(4);
    } catch (err) { setError(err.message || 'Process interrupted.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60]" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-[#050505] border-l border-white/5 z-[70] flex flex-col shadow-2xl">
            <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-2"><p className="text-[9px] uppercase tracking-[0.5em] font-bold text-brand-gold">{STEPS[step - 1]}</p><StepDots current={step} total={4} /></div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-stone-600 hover:text-white border border-white/5 transition-all"><X size={18} /></button>
            </div>

            <div ref={topRef} className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-8">
                    <p className="text-[9px] uppercase tracking-widest text-stone-600">Review Selection</p>
                    <div className="flex gap-6 p-6 bg-white/[0.02] border border-white/5">
                      <div className="w-24 aspect-[3/4] bg-[#0a0a0a] border border-white/5 flex items-center justify-center p-4 flex-shrink-0"><img src={product?.image_url || product?.image} className="w-full h-full object-contain" /></div>
                      <div className="flex-1 space-y-2"><p className="font-bold text-white text-lg">{product?.name}</p><p className="text-[10px] uppercase tracking-widest text-brand-gold">{size} · {quantity} UNIT</p><p className="text-xl text-white font-light">{displayTotal}</p></div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6">
                    <p className="text-[9px] uppercase tracking-widest text-stone-600">Client Details</p>
                    <Field label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} required />
                    <Field label="Email Address" name="email" value={form.email} onChange={handleChange} required type="email" />
                    <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
                    <Field label="Delivery Address" name="address" value={form.address} onChange={handleChange} required />
                    <div className="grid grid-cols-2 gap-4"><Field label="City" name="city" value={form.city} onChange={handleChange} /><Field label="State" name="state" value={form.state} onChange={handleChange} /></div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-8">
                    <p className="text-[9px] uppercase tracking-widest text-stone-600">Payment Protocol</p>
                    <div className="space-y-4">
                      <button onClick={() => setPaymentMethod('online')} className={`w-full p-6 border text-left transition-all ${paymentMethod === 'online' ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5'}`}>
                        <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white uppercase tracking-widest">Pay Online</p><p className="text-[9px] text-stone-500 mt-1">RAZORPAY · CARDS · UPI · NETBANKING</p></div><CreditCard size={20} className={paymentMethod === 'online' ? 'text-brand-gold' : 'text-stone-800'} /></div>
                      </button>
                      <button onClick={() => setPaymentMethod('cod')} className={`w-full p-6 border text-left transition-all ${paymentMethod === 'cod' ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5'}`}>
                        <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white uppercase tracking-widest">Cash on Delivery</p><p className="text-[9px] text-stone-500 mt-1">PAY UPON ARRIVAL</p></div><Truck size={20} className={paymentMethod === 'cod' ? 'text-brand-gold' : 'text-stone-800'} /></div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center"><Check size={40} className="text-brand-gold" /></div>
                    <div className="space-y-4"><p className="text-3xl font-cinzel text-white">Confirmed</p><p className="text-[10px] uppercase tracking-[0.6em] text-brand-gold">{orderId}</p><p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto italic">"A scent is the most intense form of memory." · Your selection is being prepared for transit.</p></div>
                    <button onClick={onClose} className="px-12 py-5 bg-brand-gold text-black uppercase tracking-[0.4em] font-bold text-[10px] hover:brightness-110 transition-all">Maison Home</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {step < 4 && (
              <div className="p-8 border-t border-white/5 space-y-4">
                {error && <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold">⚠ {error}</p>}
                <div className="flex gap-4">
                  {step > 1 && <button onClick={() => setStep(s => s - 1)} className="flex-1 py-5 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-stone-500 hover:text-white transition-all">Back</button>}
                  <button onClick={step === 3 ? handleSubmit : handleNext} disabled={isSubmitting} className="flex-[2] py-5 bg-brand-gold text-black text-[10px] font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-50 transition-all">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>{step === 3 ? 'Authorize' : 'Continue'}<ChevronRight size={16} /></>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CheckoutDrawer;
