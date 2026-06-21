/**
 * Enterprise Design System
 * Centralized design tokens and utilities for consistent UI/UX
 */

// Color Palette
export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  // Accent colors
  accent: {
    purple: {
      500: '#a855f7',
      600: '#9333ea',
    },
    green: {
      500: '#10b981',
      600: '#059669',
    },
    orange: {
      500: '#f59e0b',
      600: '#d97706',
    },
  },
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  // Neutral grays
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
}

// Typography
export const typography = {
  fontFamily: {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
}

// Spacing
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
}

// Border radius
export const borderRadius = {
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
}

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  glow: '0 0 20px rgb(59 130 246 / 0.5)',
}

// Transitions
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
}

// Component variants
export const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white font-medium',
  outline: 'border-2 border-slate-600 hover:border-blue-500 text-slate-300 hover:text-white bg-transparent',
  ghost: 'text-slate-300 hover:text-white hover:bg-slate-700/50',
  danger: 'bg-red-600 hover:bg-red-700 text-white font-medium',
  success: 'bg-green-600 hover:bg-green-700 text-white font-medium',
}

export const cardVariants = {
  default: 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl',
  elevated: 'bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl',
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl',
  flat: 'bg-slate-800 rounded-xl',
}

export const inputVariants = {
  default: 'bg-slate-900/50 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-white placeholder-slate-500',
  filled: 'bg-slate-800 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-white placeholder-slate-500',
}

// Animation keyframes
export const animations = {
  fadeIn: 'fadeIn 300ms ease-in-out',
  slideUp: 'slideUp 300ms ease-out',
  slideDown: 'slideDown 300ms ease-out',
  scaleIn: 'scaleIn 200ms ease-out',
  shimmer: 'shimmer 2s infinite',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}

// Utility functions
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function getStatusColor(status: 'active' | 'paused' | 'error' | 'pending' | 'completed') {
  const colorMap = {
    active: 'text-green-400 bg-green-400/10 border-green-500/20',
    paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20',
    error: 'text-red-400 bg-red-400/10 border-red-500/20',
    pending: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
    completed: 'text-purple-400 bg-purple-400/10 border-purple-500/20',
  }
  return colorMap[status] || colorMap.active
}

export function formatMetric(value: number, type: 'number' | 'currency' | 'percentage' = 'number') {
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
  
  if (type === 'percentage') {
    return `${value.toFixed(2)}%`
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}
