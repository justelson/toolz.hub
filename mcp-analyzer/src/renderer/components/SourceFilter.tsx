import { Layers } from 'lucide-react';

interface SourceFilterProps {
  sources: string[];
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
  serverCounts: Record<string, number>;
}

export default function SourceFilter({
  sources,
  selectedSource,
  onSelectSource,
  serverCounts,
}: SourceFilterProps) {
  const totalCount = Object.values(serverCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelectSource(null)}
        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between group ${
          selectedSource === null
            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          <Layers size={14} className={selectedSource === null ? 'opacity-100' : 'opacity-70'} />
          <span>All Sources</span>
        </div>
        <span className={`text-[10px] py-0.5 px-1.5 rounded-full ${
            selectedSource === null 
            ? 'bg-primary-foreground/20 text-primary-foreground' 
            : 'bg-muted-foreground/10 text-muted-foreground group-hover:bg-muted-foreground/20'
        }`}>
          {totalCount}
        </span>
      </button>

      {sources.map((source) => (
        <button
          key={source}
          onClick={() => onSelectSource(source)}
          className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between group ${
            selectedSource === source
              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${selectedSource === source ? 'bg-white' : 'bg-muted-foreground/50'}`} />
            <span className="truncate max-w-[120px]" title={source}>{source}</span>
          </div>
          <span className={`text-[10px] py-0.5 px-1.5 rounded-full ${
            selectedSource === source 
            ? 'bg-primary-foreground/20 text-primary-foreground' 
            : 'bg-muted-foreground/10 text-muted-foreground group-hover:bg-muted-foreground/20'
          }`}>
            {serverCounts[source] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
