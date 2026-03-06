import React from 'react';
import { motion } from 'framer-motion';

const BUTTERFLIES = [
  { id: 1, x: '8%', y: '15%', size: 36, delay: 0, color1: 'hsl(280, 60%, 55%)', color2: 'hsl(330, 70%, 60%)' },
  { id: 2, x: '85%', y: '25%', size: 30, delay: 1.2, color1: 'hsl(330, 70%, 65%)', color2: 'hsl(280, 50%, 60%)' },
  { id: 3, x: '92%', y: '70%', size: 34, delay: 2.5, color1: 'hsl(280, 55%, 60%)', color2: 'hsl(330, 60%, 70%)' },
  { id: 4, x: '5%', y: '80%', size: 28, delay: 0.8, color1: 'hsl(330, 65%, 55%)', color2: 'hsl(290, 60%, 65%)' },
  { id: 5, x: '50%', y: '5%', size: 32, delay: 1.8, color1: 'hsl(290, 60%, 55%)', color2: 'hsl(330, 70%, 60%)' },
];

const ButterflyShape: React.FC<{ size: number; color1: string; color2: string }> = ({ size, color1, color2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left wing */}
    <motion.path
      d="M12 12C10 8 6 4 3 5C0 6 1 10 4 12C1 14 0 18 3 19C6 20 10 16 12 12Z"
      fill={color1}
      fillOpacity={0.5}
      animate={{ rotateY: [0, 50, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: 'right center' }}
    />
    {/* Right wing */}
    <motion.path
      d="M12 12C14 8 18 4 21 5C24 6 23 10 20 12C23 14 24 18 21 19C18 20 14 16 12 12Z"
      fill={color2}
      fillOpacity={0.5}
      animate={{ rotateY: [0, -50, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: 'left center' }}
    />
    {/* Body */}
    <ellipse cx="12" cy="12" rx="0.8" ry="4" fill={color1} fillOpacity={0.7} />
  </svg>
);

const FloatingButterflies: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {BUTTERFLIES.map((b) => (
      <motion.div
        key={b.id}
        className="absolute"
        style={{ left: b.x, top: b.y }}
        animate={{
          x: [0, 30, -20, 15, 0],
          y: [0, -25, 10, -15, 0],
        }}
        transition={{
          duration: 8 + b.delay,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: b.delay,
        }}
      >
        <motion.div
          animate={{ rotate: [-5, 10, -8, 5, -5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        >
          <ButterflyShape size={b.size} color1={b.color1} color2={b.color2} />
        </motion.div>
      </motion.div>
    ))}
  </div>
);

export default FloatingButterflies;
