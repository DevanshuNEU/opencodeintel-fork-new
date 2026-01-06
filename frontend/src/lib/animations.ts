/**
 * Framer Motion Animation Variants
 * Consistent, performant animations throughout the landing page
 */

import { Variants, Transition } from 'framer-motion';
import { animation } from './design-tokens';

// Default spring config - natural feeling
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 14,
};

export const snappySpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

// ============================================
// Search Bar Variants
// ============================================

export const searchBarVariants: Variants = {
  idle: {
    boxShadow: '0 0 0 1px rgba(75, 139, 190, 0.2)',
    scale: 1,
  },
  focused: {
    boxShadow: '0 0 0 2px #4B8BBE, 0 0 20px rgba(75, 139, 190, 0.3)',
    scale: 1.01,
    transition: snappySpring,
  },
  searching: {
    boxShadow: '0 0 0 2px #FFD43B, 0 0 30px rgba(255, 212, 59, 0.25)',
    transition: { duration: 0.3 },
  },
  complete: {
    boxShadow: '0 0 0 2px #22c55e, 0 0 20px rgba(34, 197, 94, 0.25)',
    transition: { duration: 0.2 },
  },
};

// ============================================
// Search Results Variants
// ============================================

export const resultListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const resultItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(2px)',
    transition: { duration: 0.15 },
  },
};

// ============================================
// Card Variants
// ============================================

export const cardVariants: Variants = {
  idle: {
    y: 0,
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.05)',
  },
  hover: {
    y: -2,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    transition: snappySpring,
  },
  tap: {
    y: 0,
    scale: 0.99,
  },
};

export const glassCardVariants: Variants = {
  idle: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    transition: { duration: 0.2 },
  },
};

// ============================================
// Button Variants
// ============================================

export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const primaryButtonVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 0 0 0 rgba(75, 139, 190, 0)',
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 0 25px rgba(75, 139, 190, 0.4)',
    transition: snappySpring,
  },
  tap: {
    scale: 0.98,
  },
};

// ============================================
// Pill/Tag Variants
// ============================================

export const pillVariants: Variants = {
  idle: {
    scale: 1,
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
  },
  hover: {
    scale: 1.05,
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    transition: { duration: 0.15 },
  },
  selected: {
    scale: 1,
    backgroundColor: 'rgba(75, 139, 190, 0.2)',
    borderColor: '#4B8BBE',
  },
  tap: {
    scale: 0.95,
  },
};

// ============================================
// Score/Progress Variants
// ============================================

export const scoreVariants: Variants = {
  hidden: { width: 0, opacity: 0 },
  visible: (score: number) => ({
    width: `${score}%`,
    opacity: 1,
    transition: {
      width: { delay: 0.2, duration: 0.6, ease: 'easeOut' },
      opacity: { delay: 0.1, duration: 0.2 },
    },
  }),
};

export const progressBarVariants: Variants = {
  idle: {
    backgroundPosition: '0% 0%',
  },
  animating: {
    backgroundPosition: ['0% 0%', '100% 0%'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// Content/Text Variants
// ============================================

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: animation.duration.normal / 1000 },
  },
};

export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

export const fadeInDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

export const blurInVariants: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: animation.duration.slow / 1000 },
  },
};

// ============================================
// Stagger Containers
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const fastStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

// ============================================
// Code Highlight Variants
// ============================================

export const highlightFlashVariants: Variants = {
  initial: {
    backgroundColor: 'rgba(255, 212, 59, 0.5)',
  },
  animate: {
    backgroundColor: 'rgba(255, 212, 59, 0.15)',
    transition: { duration: 0.8, delay: 0.3 },
  },
};

export const lineHighlightVariants: Variants = {
  idle: { backgroundColor: 'transparent' },
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    transition: { duration: 0.1 },
  },
};

// ============================================
// Explain Panel Variants
// ============================================

export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ============================================
// Loading/Spinner Variants
// ============================================

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// Page Transition Variants
// ============================================

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};
