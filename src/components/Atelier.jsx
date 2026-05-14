import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import collectionImg from '../assets/collection.png';

const Atelier = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <section ref={ref} className="relative bg-bg-primary px-8 py-40 overflow-hidden" id="atelier">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
        
        {/* Left: Cinematic Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          className="relative group"
        >
          <div className="relative aspect-video lg:aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/5">
            <motion.img
              src={collectionImg}
              alt="Maison Sufi Atelier"
              className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2000ms]"
              style={{ y: imgY }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
          </div>
          
          {/* Accent Badge */}
          <div className="absolute -bottom-8 -right-8 bg-gold-shimmer p-8 rounded-2xl shadow-2xl hidden md:block">
             <p className="text-[10px] font-bold text-black uppercase tracking-widest text-center">
                Sufi Atelier <br /> Archive 01
             </p>
          </div>
        </motion.div>

        {/* Right: Narrative */}
        <div className="space-y-12">
          <div className="space-y-4">
              <p className="luxury-label text-stone-500">The Heritage</p>
              <h2 className="text-6xl md:text-8xl font-display font-black text-white uppercase tracking-tighter">
                Our <span className="text-gold-leaf italic font-cormorant">Story</span>
              </h2>
          </div>
          
          <p className="text-lg md:text-xl text-stone-400 leading-relaxed font-body font-light max-w-xl">
            Founded in 1996, Maison Sufi has been the cornerstone of premium olfactory extraction in the region. Our master perfumers combine decades of traditional knowledge with modern architectural techniques to deliver scents that aren't just worn—they're experienced.
          </p>

          <div className="grid grid-cols-2 gap-12 py-12 border-y border-white/5">
            <div className="space-y-2">
              <p className="text-4xl font-cormorant italic text-perfume-gold">100+</p>
              <p className="text-[8px] uppercase tracking-[0.4em] text-stone-500 font-bold">Rare Botanicals</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-cormorant italic text-perfume-gold">24</p>
              <p className="text-[8px] uppercase tracking-[0.4em] text-stone-500 font-bold">Months Aging</p>
            </div>
          </div>

          <div className="pt-8">
            <button 
                onClick={() => navigate('/search')}
                className="group flex items-center gap-6 text-[10px] uppercase tracking-[0.5em] text-white hover:text-perfume-gold transition-all duration-500"
            >
              The Archive Journey
              <div className="w-16 h-[1px] bg-white/20 group-hover:bg-perfume-gold group-hover:w-24 transition-all duration-500" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Atelier;
