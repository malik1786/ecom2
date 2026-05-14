import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPublicSettings } from '../lib/api';
import { Search, MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [heroVideos, setHeroVideos] = useState([]);

  useEffect(() => {
    fetchPublicSettings()
      .then(res => {
        const raw = res?.hero_videos || res?.results || res;
        let list = [];

        if (Array.isArray(raw)) {
          list = raw;
        } else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            list = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            list = raw ? [raw] : [];
          }
        }

        const sanitized = list.filter(v => v && typeof v === 'string' && v.trim().length > 0);
        
        // ── Fallback Bridge ──
        // If DB is empty, use the known existing video to ensure UI doesn't break
        if (sanitized.length === 0) {
          console.log("[Hero] Database empty, using cinematic fallback.");
          setHeroVideos(["/uploads/vid_b9504ca0eb03.mp4"]);
        } else {
          setHeroVideos(sanitized);
        }
      })
      .catch(err => {
        console.error('Failed to sync cinematic archives:', err);
        setHeroVideos(["/uploads/vid_b9504ca0eb03.mp4"]);
      });
  }, []);

  const handleVideoEnd = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % heroVideos.length);
  };

  return (
    <header className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Background Video Layer */}
      <div className="absolute inset-0 z-0 bg-[#050505] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {heroVideos.length > 0 ? (
            <motion.div
              key={currentVideoIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: [0.43, 0.13, 0.23, 0.96] }}
              className="absolute inset-0 w-full h-full"
            >
              {heroVideos[currentVideoIndex].includes('vimeo.com') || heroVideos[currentVideoIndex].includes('youtube.com') ? (
                <iframe
                  src={`${heroVideos[currentVideoIndex]}${heroVideos[currentVideoIndex].includes('?') ? '&' : '?'}autoplay=1&muted=1&background=1&loop=1`}
                  className="w-full h-full object-cover scale-[1.5]"
                  frameBorder="0"
                  allow="autoplay; fullscreen"
                />
              ) : (
                <video
                  src={heroVideos[currentVideoIndex]}
                  autoPlay
                  muted
                  playsInline
                  loop={heroVideos.length === 1}
                  onEnded={handleVideoEnd}
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-brand-gold/20 font-cinzel italic tracking-[0.5em] text-xs animate-pulse">
                INITIALIZING MAISON ARCHIVES...
              </div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black" />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-20 w-full max-w-7xl px-8 text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="max-w-2xl"
        >
          <p className="text-brand-gold text-[10px] uppercase tracking-[0.8em] font-bold mb-6">
            The Essence of Legacy
          </p>
          <h1 className="text-6xl lg:text-8xl font-cinzel text-white leading-tight mb-8">
            Sufi <span className="text-brand-gold/80 italic">Perfumes</span>
          </h1>
          <p className="text-stone-400 text-sm tracking-widest leading-relaxed mb-10 max-w-md uppercase font-light">
            Crafting liquid emotions through centuries of traditional artistry and modern refinement.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <button 
              onClick={() => navigate('/products')}
              className="px-12 py-5 bg-brand-gold text-black uppercase tracking-[0.4em] font-bold text-[10px] hover:brightness-110 transition-all shadow-2xl shadow-brand-gold/20"
            >
              Explore Collection
            </button>
            <button 
              onClick={() => navigate('/story')}
              className="px-10 py-5 border border-white/10 text-white uppercase tracking-[0.4em] font-bold text-[10px] hover:bg-white/5 transition-all"
            >
              Our Heritage
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
      >
        <div className="w-[1px] h-20 bg-gradient-to-b from-brand-gold/0 via-brand-gold/50 to-brand-gold/0" />
        <p className="text-[8px] uppercase tracking-[0.5em] text-stone-600 font-bold">Discover More</p>
      </motion.div>
    </header>
  );
};

export default Hero;
