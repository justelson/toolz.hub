import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-destructive" />,
    info: <Info size={16} className="text-primary" />,
  };

  const styles = {
    success: 'bg-background border-green-500/30 text-foreground',
    error: 'bg-background border-destructive/30 text-foreground',
    info: 'bg-background border-primary/30 text-foreground',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 border ${styles[type]} rounded-lg shadow-lg z-50 min-w-[300px] animate-slide-in`}
    >
      {icons[type]}
      <p className="flex-1 text-xs font-medium">{message}</p>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted"
      >
        <X size={14} />
      </button>
    </div>
  );
}
