import React from "react";

/**
 * The icons the Manus preview drew with lucide-react.
 *
 * lucide is not a dependency here and the storefront already ships two icon
 * sets, so adding a third for nine glyphs would be the wrong trade. These are
 * the same lucide outlines, inlined at the same 1.75 stroke weight, sized by
 * the `size` prop the preview passed.
 */

type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const ShieldCheck: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Wrench: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const Headphones: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM18 14h3v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z" />
    <path d="M3 14a9 9 0 0 1 18 0" />
  </svg>
);

export const Camera: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

export const Network: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8" />
  </svg>
);

export const Cpu: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
  </svg>
);

export const Building: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01" />
  </svg>
);

export const Store: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M3 9l1.6-4.4A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .94.66L21 9" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

export const House: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

export const Warehouse: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 21V9l9-4 9 4v12" />
    <path d="M7 21v-8h10v8M7 17h10" />
  </svg>
);

export const Fingerprint: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2" />
  </svg>
);

export const Database: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

export const Wifi: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 20h.01M2 8.82a15 15 0 0 1 20 0M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0" />
  </svg>
);

export const Grid: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const Sparkles: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M9.94 5.33 12 2l2.06 3.33 3.94.82-2.7 2.9.46 3.95-3.76-1.7-3.76 1.7.46-3.95-2.7-2.9z" />
    <path d="M5 17l.7 1.8L7.5 19.5 5.7 20.2 5 22l-.7-1.8L2.5 19.5l1.8-.7zM18 15l.6 1.5 1.4.5-1.4.5-.6 1.5-.6-1.5-1.4-.5 1.4-.5z" />
  </svg>
);

export const Video: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m16 11 6-3v8l-6-3z" />
  </svg>
);

export const MonitorCog: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="2" y="4" width="20" height="12" rx="2" />
    <path d="M9 20h6M12 16v4" />
    <circle cx="12" cy="10" r="2.2" />
    <path d="M12 6.4v1.2M12 12.4v1.2M8.8 10h1.1M14.1 10h1.1" />
  </svg>
);

export const ClipboardList: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M8 11h.01M8 15h.01M11 11h5M11 15h5" />
  </svg>
);

export const Cart: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h2.5l2.4 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H5.2" />
  </svg>
);

/** The preview pointed every forward action with lucide's ArrowLeft, because
    it only rendered Arabic. Direction is a prop here instead. */
export const Arrow: React.FC<IconProps & { rtl?: boolean }> = ({ size = 17, className, rtl = true }) => (
  <svg {...base(size)} className={className}>
    {rtl ? <path d="M19 12H5M12 19l-7-7 7-7" /> : <path d="M5 12h14M12 5l7 7-7 7" />}
  </svg>
);
export const Chevron: React.FC<IconProps & { direction?: "left" | "right" }> = ({
  size = 20,
  className,
  direction = "left",
}) => (
  <svg {...base(size)} className={className}>
    {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>
);
export const Flame: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
export const AudioLines: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3" />
  </svg>
);
export const Phone: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
