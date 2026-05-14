import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ className = "" }) => {
  return (
    <motion.div 
      className={`flex flex-col items-center justify-center select-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="relative group flex flex-col items-center">
        {/* Main Brand Name */}
        <h1 className="font-cinzel text-xl md:text-2xl tracking-[0.4em] font-bold relative z-10"
          style={{ color: 'var(--text-primary)' }}>
          SUFI <span className="text-brand-gold opacity-90">PERFUMES</span>
        </h1>
        
        {/* Elegant Subtitle */}
        <p className="font-cormorant italic text-[8px] md:text-[9px] tracking-[0.6em] mt-1 uppercase"
          style={{ color: 'var(--text-muted)' }}>
          Atelier de Parfum
        </p>

        {/* Subtle decorative underlining element */}
        <motion.div 
          className="h-[1px] w-0 bg-gradient-to-r from-transparent via-perfume-gold to-transparent mt-2"
          whileInView={{ width: '80%' }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
        />
        
        {/* Glow effect on hover */}
        <div className="absolute inset-x-0 -inset-y-2 bg-perfume-gold/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
      </div>
    </motion.div>
  );
};

export default Logo;
