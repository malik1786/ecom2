import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, CreditCard, ShieldCheck, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';
import { fetchAdminSettings, updateAdminSettings, getAdminToken } from '../../lib/api';

const SettingsManager = () => {
    const [settings, setSettings] = useState({
        site_name: 'Sufi Perfumes',
        contact_email: '',
        support_phone: '',
        razorpay_key_id: '',
        razorpay_key_secret: '',
        razorpay_enabled: 'false',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const token = getAdminToken();
                const data = await fetchAdminSettings(token);
                setSettings({
                    site_name: data.site_name || 'Sufi Perfumes',
                    contact_email: data.contact_email || '',
                    support_phone: data.support_phone || '',
                    razorpay_key_id: data.razorpay_key_id || '',
                    razorpay_key_secret: data.razorpay_key_secret || '',
                    razorpay_enabled: data.razorpay_enabled || 'false',
                });
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to load settings.' });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const token = getAdminToken();
            await updateAdminSettings(settings, token);
            setMessage({ type: 'success', text: 'Maison configuration updated successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-stone-500 uppercase tracking-widest text-xs font-display">Accessing House Protocols...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-cinzel text-white tracking-wider">Maison Configuration</h2>
                    <p className="text-[10px] text-stone-500 uppercase tracking-[0.3em] mt-1">Configure global store and payment parameters</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Razorpay Configuration */}
                    <div className="panel-surface rounded-[2rem] p-6 border border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-perfume-gold/10 flex items-center justify-center text-perfume-gold border border-perfume-gold/20">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Razorpay Gateway</h3>
                                <p className="text-[10px] text-stone-500 uppercase tracking-[0.1em]">Secure Transaction Layer</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2 block font-bold">Key ID</span>
                                <input
                                    type="text"
                                    value={settings.razorpay_key_id}
                                    onChange={(e) => setSettings({ ...settings, razorpay_key_id: e.target.value })}
                                    placeholder="rzp_live_..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-perfume-gold/40 transition-all"
                                />
                            </label>

                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2 block font-bold">Key Secret</span>
                                <input
                                    type="password"
                                    value={settings.razorpay_key_secret}
                                    onChange={(e) => setSettings({ ...settings, razorpay_key_secret: e.target.value })}
                                    placeholder="••••••••••••"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-perfume-gold/40 transition-all"
                                />
                            </label>

                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2 block font-bold">Gateway Status</span>
                                <select 
                                    value={settings.razorpay_enabled}
                                    onChange={(e) => setSettings({ ...settings, razorpay_enabled: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-perfume-gold/40 transition-all"
                                >
                                    <option value="false">DEACTIVATED</option>
                                    <option value="true">ACTIVE (Razorpay Enabled)</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {/* General Settings */}
                    <div className="panel-surface rounded-[2rem] p-6 border border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-perfume-gold/10 flex items-center justify-center text-perfume-gold border border-perfume-gold/20">
                                <Sliders size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Store Info</h3>
                                <p className="text-[10px] text-stone-500 uppercase tracking-[0.1em]">General Maison Details</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                             <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2 block font-bold">Site Name</span>
                                <input
                                    type="text"
                                    value={settings.site_name}
                                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-perfume-gold/40 transition-all"
                                />
                            </label>

                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2 block font-bold">Support Email</span>
                                <input
                                    type="email"
                                    value={settings.contact_email}
                                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-perfume-gold/40 transition-all"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {message.text && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                            message.type === 'success' 
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {message.text}
                    </motion.div>
                )}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-3 bg-black text-perfume-gold border border-perfume-gold/40 px-10 py-4 rounded-full font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-stone-950 transition-all duration-300 shadow-gold-glow disabled:opacity-50"
                    >
                        {saving ? 'Synchronizing...' : (
                            <>
                                <Save size={16} />
                                Commit Maison Config
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsManager;
