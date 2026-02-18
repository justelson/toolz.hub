import { X, FileJson, FileText, Files, Download, Info } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'markdown' | 'both') => void;
  serverCount: number;
  analysisCount: number;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  serverCount,
  analysisCount,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground leading-tight">Export Analysis</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Format Selection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-all p-1.5 rounded-lg hover:bg-muted border border-transparent hover:border-border"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Banner */}
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-primary" />
               <span className="text-foreground font-bold">{serverCount}</span> Servers
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-primary/50" />
               <span className="text-foreground font-bold">{analysisCount}</span> Active Analyses
            </div>
          </div>

          <div className="grid gap-3">
            {/* JSON Option */}
            <button
              onClick={() => {
                onExport('json');
                onClose();
              }}
              className="w-full p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-start gap-4 group"
            >
              <div className="p-3 bg-muted rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-transparent group-hover:border-primary/20">
                 <FileJson size={22} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">JSON Structure</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Raw machine-readable data for external tool integration and API automation.</p>
              </div>
            </button>

            {/* Markdown Option */}
            <button
              onClick={() => {
                onExport('markdown');
                onClose();
              }}
              className="w-full p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-start gap-4 group"
            >
              <div className="p-3 bg-muted rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-transparent group-hover:border-primary/20">
                <FileText size={22} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Markdown Report</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Human-friendly documentation formatted for GitHub or internal technical wikis.</p>
              </div>
            </button>

            {/* Both Option */}
            <button
              onClick={() => {
                onExport('both');
                onClose();
              }}
              className="w-full p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left flex items-start gap-4 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-1.5 bg-primary/10 text-[8px] font-bold text-primary uppercase tracking-tighter rounded-bl-lg border-l border-b border-primary/20">
                Recommended
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-primary border border-primary/20">
                <Files size={22} />
              </div>
              <div>
                <p className="font-bold text-sm text-primary">Unified Archive</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Export all formats compressed into a single ZIP file for full portability.</p>
              </div>
            </button>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-lg border border-border/50">
            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-normal">
              Exports are generated locally. No data is sent to external servers during the export process.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
