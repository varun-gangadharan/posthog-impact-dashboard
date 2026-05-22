export default function ThreadBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.07]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="thread-grid" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M0 60 Q30 40 60 60 Q90 80 120 60"
              fill="none"
              stroke="#6366f1"
              strokeWidth="0.5"
            />
            <path
              d="M60 0 Q40 30 60 60 Q80 90 60 120"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="0.5"
            />
            <circle cx="60" cy="60" r="1" fill="#6366f1" opacity="0.5" />
          </pattern>
          <pattern id="thread-web" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M100 0 L100 200 M0 100 L200 100 M0 0 L200 200 M200 0 L0 200"
              fill="none"
              stroke="#6366f1"
              strokeWidth="0.3"
              opacity="0.3"
            />
            <circle cx="100" cy="100" r="40" fill="none" stroke="#8b5cf6" strokeWidth="0.3" opacity="0.2" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#8b5cf6" strokeWidth="0.2" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#thread-grid)" />
        <rect width="100%" height="50%" fill="url(#thread-web)" />
      </svg>
    </div>
  );
}
