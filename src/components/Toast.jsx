import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const typeStyles = {
    success: 'bg-emerald-600 text-white shadow-emerald-200',
    error: 'bg-rose-600 text-white shadow-rose-200',
    warning: 'bg-amber-600 text-white shadow-amber-200',
    info: 'bg-indigo-600 text-white shadow-indigo-200'
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <XCircle className="w-4 h-4 shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-start space-x-3 text-xs font-semibold ${typeStyles[toast.type] || typeStyles.info}`}>
        <div className="mt-0.5">{icons[toast.type] || icons.info}</div>
        <div className="flex-1 leading-relaxed">{toast.text}</div>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white font-bold ml-2 text-sm leading-none"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

