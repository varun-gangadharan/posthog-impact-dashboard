type Props = {
  label: string;
  sublabel?: string;
};

export default function SectionDivider({ label, sublabel }: Props) {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-navy-600 to-transparent" />
      <div className="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-indigo-accent opacity-50">
          <circle cx="6" cy="6" r="2" fill="currentColor" />
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        </svg>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-slate-600">{sublabel}</span>
        )}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-navy-600 to-transparent" />
    </div>
  );
}
