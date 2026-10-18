import React from 'react';
import {
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Hourglass,
} from 'lucide-react';

/**
 * Modern minimalist badge matching clean light aesthetic.
 * Transaction: 'pending' | 'active' | 'returned' | 'rejected'
 * Inventory:   'available' | 'unavailable' | 'maintenance' | 'instock'
 */
const STATUS_CONFIG = {
  // Transaction
  pending:     { label: 'Pending',         dot: 'bg-sky-500',     colors: 'bg-sky-50 text-sky-700 border-sky-100' },
  active:      { label: 'In circulation',  dot: 'bg-orange-500',  colors: 'bg-orange-50 text-orange-700 border-orange-100/70' },
  returned:    { label: 'Returned',        dot: 'bg-emerald-500', colors: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  rejected:    { label: 'Rejected',        dot: 'bg-rose-500',    colors: 'bg-rose-50 text-rose-700 border-rose-100' },
  // Inventory
  available:   { label: 'Available',       dot: 'bg-emerald-500', colors: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  instock:     { label: 'In stock',        dot: 'bg-emerald-500', colors: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  unavailable: { label: 'Unavailable',     dot: 'bg-slate-400',   colors: 'bg-slate-50 text-slate-600 border-slate-200' },
  maintenance: { label: 'Maintenance',     dot: 'bg-amber-500',   colors: 'bg-amber-50 text-amber-700 border-amber-100' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    dot: 'bg-slate-400',
    colors: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.colors}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

