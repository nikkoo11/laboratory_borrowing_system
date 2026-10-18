import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Inline alert banner for success / error feedback (Light theme).
 * Renders nothing when `message` is falsy.
 */
export default function Alert({ type, message }) {
  if (!message) return null;

  const isSuccess = type === 'success';
  return (
    <div
      className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
        isSuccess
          ? 'bg-emerald-50 border border-emerald-100 text-emerald-800'
          : 'bg-rose-50 border border-rose-100 text-rose-800'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
      ) : (
        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
      )}
      <span className="font-medium">{message}</span>
    </div>
  );
}

