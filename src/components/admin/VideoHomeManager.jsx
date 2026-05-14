import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Video, Plus, Trash2, GripVertical, Play, ExternalLink, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { fetchAdminSettings, updateAdminSettings, getAdminToken, uploadAdminMedia } from '../../lib/api';

const VideoHomeManager = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [newUrl, setNewUrl] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const token = getAdminToken();
                const data = await fetchAdminSettings(token);
                let videoList = [];
                if (data.hero_videos) {
                    try {
                        videoList = typeof data.hero_videos === 'string' 
                            ? JSON.parse(data.hero_videos) 
                            : data.hero_videos;
                    } catch (e) {
                        console.error('Failed to parse hero_videos:', e);
                    }
                }
                setVideos(Array.isArray(videoList) ? videoList : []);
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to load video settings.' });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const token = getAdminToken();
            const currentSettings = await fetchAdminSettings(token);
            
            const payload = { 
                ...currentSettings, 
                hero_videos: JSON.stringify(videos) 
            };
            
            await updateAdminSettings(payload, token);
            setMessage({ type: 'success', text: 'Cinematic sequence deployed to the Maison.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to update visuals.' });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            setMessage({ type: 'error', text: 'Invalid format. Please provide a cinematic video file.' });
            return;
        }

        setUploading(true);
        try {
            const token = getAdminToken();
            const result = await uploadAdminMedia(file, token);
            const videoUrl = result.url || result.data?.url;
            if (videoUrl) {
                setVideos([...videos, videoUrl]);
                setMessage({ type: 'success', text: 'Asset uploaded to archives.' });
            } else {
                throw new Error('Upload successful but target location unknown.');
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Upload failed. Ensure backend services are active.' });
        } finally {
            setUploading(false);
        }
    };

    const addVideo = () => {
        if (!newUrl.trim()) return;
        setVideos([...videos, newUrl.trim()]);
        setNewUrl('');
    };

    const removeVideo = (index) => {
        setVideos(videos.filter((_, i) => i !== index));
    };

    const moveVideo = (index, direction) => {
        const newVideos = [...videos];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= videos.length) return;
        [newVideos[index], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[index]];
        setVideos(newVideos);
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-stone-500 uppercase tracking-widest text-xs font-display">Synchronizing with Maison Archives...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-cinzel text-white tracking-widest uppercase">Cinematic Loop</h2>
                    <p className="text-[10px] text-brand-gold uppercase tracking-[0.4em] mt-2 font-bold">Orchestrate your homepage atmosphere</p>
                </div>
                <div className="h-16 w-16 rounded-[1.5rem] bg-brand-gold/10 flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-[0_0_30px_rgba(214,178,94,0.1)]">
                    <Video size={28} />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Left Panel: Ingest */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="panel-surface rounded-[2.5rem] p-8 border border-white/5 bg-black/60 shadow-2xl backdrop-blur-md">
                        <div className="flex items-center gap-3 mb-8">
                            <Plus size={20} className="text-brand-gold" />
                            <h3 className="text-white font-cinzel text-lg tracking-wider">Add Asset</h3>
                        </div>
                        
                        <div 
                            onDragEnter={() => setDragActive(true)}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                            className={`relative border-2 border-dashed rounded-[2rem] p-10 transition-all flex flex-col items-center justify-center gap-5 text-center ${
                                dragActive 
                                ? 'border-brand-gold bg-brand-gold/5 scale-[0.98]' 
                                : 'border-white/5 hover:border-white/10'
                            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <input type="file" id="v-upload" className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                            <div className="h-14 w-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-stone-600 group-hover:text-brand-gold transition-colors">
                                {uploading ? <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /> : <Video size={24} />}
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">
                                    {uploading ? 'Processing File...' : 'Archive Cinematic'}
                                </p>
                                <label htmlFor="v-upload" className="text-[9px] text-brand-gold hover:text-white transition-colors cursor-pointer uppercase tracking-[0.3em] font-bold underline underline-offset-8 decoration-brand-gold/30">
                                    Select from Local
                                </label>
                            </div>
                        </div>

                        <div className="relative flex items-center justify-center my-10">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                            <span className="relative px-4 bg-[#0a0a0a] text-[8px] text-stone-700 uppercase tracking-[0.5em] font-bold">Or External</span>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-[0.3em] text-stone-600 font-bold ml-1">Stream URL (MP4 / Vimeo)</label>
                                <input 
                                    type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-gold/30 transition-all placeholder:text-stone-800 text-sm"
                                />
                            </div>
                            <button onClick={addVideo} className="w-full py-4 bg-brand-gold/5 text-brand-gold border border-brand-gold/20 rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-brand-gold hover:text-black transition-all">
                                Register Link
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSave} disabled={saving}
                        className="w-full py-6 bg-black text-brand-gold border border-brand-gold/40 rounded-full font-bold uppercase tracking-[0.5em] text-xs hover:bg-stone-950 transition-all duration-500 shadow-[0_0_50px_rgba(214,178,94,0.1)] disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                        {saving ? 'Syncing...' : <><Save size={20} /> Deploy Sequence</>}
                    </button>

                    {message.text && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-5 rounded-[1.5rem] flex items-center gap-4 text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            {message.text}
                        </motion.div>
                    )}
                </div>

                {/* Right Panel: Sequence */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Maison Sequence</span>
                            <span className="px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-[8px] text-brand-gold font-bold uppercase tracking-widest">{videos.length} Assets</span>
                        </div>
                        <p className="text-[9px] text-stone-700 italic uppercase tracking-widest font-medium">Assets will loop in order</p>
                    </div>

                    <div className="space-y-4 pr-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {videos.map((url, index) => (
                                <motion.div 
                                    key={`${url}-${index}`} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative flex items-center gap-6 p-5 rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-brand-gold/20 transition-all"
                                >
                                    {/* Video Preview Column */}
                                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0 group-hover:border-brand-gold/30 transition-colors">
                                        <video src={url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <Play size={24} className="text-brand-gold drop-shadow-lg" />
                                        </div>
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 rounded-md text-[8px] text-white font-black tracking-widest border border-white/10">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white text-xs font-bold truncate max-w-[200px]">{url.split('/').pop()}</p>
                                            <span className="px-2 py-0.5 rounded bg-brand-gold/5 text-[7px] text-brand-gold border border-brand-gold/10 font-bold uppercase tracking-widest">ACTIVE</span>
                                        </div>
                                        <p className="text-[10px] text-stone-600 truncate font-mono">{url}</p>
                                        <div className="flex items-center gap-5 pt-1">
                                            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-stone-500 hover:text-brand-gold transition-colors font-bold group/link">
                                                <Eye size={12} className="group-hover/link:scale-110 transition-transform" /> Full View
                                            </a>
                                            <div className="h-4 w-[1px] bg-white/5" />
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => moveVideo(index, -1)} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-white/5 text-stone-600 hover:text-brand-gold disabled:opacity-0 transition-all"><ChevronUp size={14} /></button>
                                                <button onClick={() => moveVideo(index, 1)} disabled={index === videos.length - 1} className="p-1.5 rounded-lg hover:bg-white/5 text-stone-600 hover:text-brand-gold disabled:opacity-0 transition-all"><ChevronDown size={14} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => removeVideo(index)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-500/0 hover:bg-red-500/10 text-stone-800 hover:text-red-500 transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {videos.length === 0 && (
                            <div className="py-24 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.01]">
                                <div className="h-20 w-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-6">
                                    <Video className="text-stone-800" size={32} strokeWidth={1} />
                                </div>
                                <p className="text-[10px] uppercase tracking-[0.5em] text-stone-600 font-bold">The archives are currently empty</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoHomeManager;
