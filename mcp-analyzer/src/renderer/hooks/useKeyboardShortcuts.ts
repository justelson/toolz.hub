import { useEffect } from 'react';

interface KeyboardShortcuts {
  onScan?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

export function useKeyboardShortcuts({ onScan, onExport, onRefresh }: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R - Scan
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        onScan?.();
      }

      // Ctrl/Cmd + E - Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        onExport?.();
      }

      // F5 - Refresh
      if (e.key === 'F5') {
        e.preventDefault();
        onRefresh?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, onExport, onRefresh]);
}
