import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const { message, type } = toast;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} color="#10B981" />;
      case 'error':
        return <AlertTriangle size={16} color="#EF4444" />;
      default:
        return <Info size={16} color="#A1A1AA" />;
    }
  };

  return (
    <div className="toast-container">
      <div className={`toast ${type || ''}`}>
        {renderIcon()}
        <span>{message}</span>
      </div>
    </div>
  );
}
