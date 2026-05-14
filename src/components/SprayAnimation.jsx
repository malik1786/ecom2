import React from 'react';
import { motion } from 'framer-motion';

const SprayAnimation = ({ onComplete = () => {} }) => {
  const particles = Array.from({ length: 55 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 260,
    y: Math.random() * -380 - 40,
    scale: Math.random() * 1.8 + 0.3,
    delay: Math.random() * 0.6,
    opacity: Math.random() * 0.7 + 0.3,
    size: Math.random() * 10 + 3,
    color: Math.random() > 0.5 ? '#d6b25e' : '#ffffff',
  }));

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      style={{ background: 'var(--bg-primary)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1, delay: 2.8, ease: 'easeInOut' }}
      onAnimationComplete={onComplete}
    >
      {/* Brand name reveal */}
      <motion.div
        className="absolute flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -20] }}
        transition={{ duration: 2.8, times: [0, 0.2, 0.7, 1], ease: 'easeInOut' }}
      >
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem, 5vw, 3rem)', letterSpacing: '0.4em', color: '#d6b25e', fontWeight: 700 }}>
          THE LEGACY
        </p>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 12, letterSpacing: '0.6em', color: 'rgba(255,255,255,0.4)', marginTop: 8, textTransform: 'uppercase' }}>
          BY SUFI PERFUMES
        </p>
        <motion.div
          style={{ height: 1, background: 'linear-gradient(to right, transparent, #d6b25e, transparent)', marginTop: 12 }}
          initial={{ width: 0 }}
          animate={{ width: 200 }}
          transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Particles */}
      <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: p.color,
              filter: 'blur(2px)',
            }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [0, p.opacity, 0], x: p.x, y: p.y, scale: [0, p.scale, p.scale * 0.5] }}
            transition={{ duration: 2.2, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* Center glow */}
      <motion.div
        className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full"
        style={{ width: 80, height: 80, background: 'radial-gradient(circle, rgba(214,178,94,0.6), transparent 70%)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 3, 1], opacity: [0, 0.6, 0] }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      />
    </motion.div>
  );
};

export default SprayAnimation;
