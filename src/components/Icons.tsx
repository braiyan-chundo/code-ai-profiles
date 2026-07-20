import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CloudIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6.5 19h11a4.5 4.5 0 0 0 .68-8.95A6.6 6.6 0 0 0 5.5 8.6 5.2 5.2 0 0 0 6.5 19Z" />
    <path d="m9.4 13.4 1.7 1.7 3.8-4" />
  </IconBase>
);

export const PlusIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>
);
export const RefreshIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.7-2.6L20 9M4 15l2.2 2.6A7 7 0 0 0 17.9 15" /></IconBase>
);
export const SearchIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></IconBase>
);
export const FolderIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M3.5 6.5h6l2 2H21v9.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" /><path d="M3.5 9h17" /></IconBase>
);
export const PlayIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5 3.5-5 3.5Z" /></IconBase>
);
export const StopIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M9 9h6v6H9z" /></IconBase>
);
export const TrashIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></IconBase>
);
export const EditIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m4 20 4.2-1 10.4-10.4a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" /><path d="m14.5 7.1 2.8 2.8" /></IconBase>
);
export const SettingsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
  </IconBase>
);
export const ClockIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>
);
export const HardDriveIcon = (props: IconProps) => (
  <IconBase {...props}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 15h.01M11 15h6" /></IconBase>
);
export const SparklesIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m12 3 1.2 3.2L16.5 7.5l-3.3 1.3L12 12l-1.2-3.2-3.3-1.3 3.3-1.3L12 3Z" /><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" /><path d="m6 14 .7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7L6 14Z" /></IconBase>
);
export const XIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" /></IconBase>
);
export const AlertIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5M12 17h.01" /></IconBase>
);
export const ChevronIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m8 10 4 4 4-4" /></IconBase>
);
export const UserIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></IconBase>
);
export const CodeSessionIcon = (props: IconProps) => (
  <IconBase {...props}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7.5 9 2.5 2.5L7.5 14M13 14h3.5" /></IconBase>
);
export const TransferIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M4 8h13" /><path d="m14 5 3 3-3 3" /><path d="M20 16H7" /><path d="m10 13-3 3 3 3" /></IconBase>
);
export const UnlinkIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m9.5 14.5-1 1a3.5 3.5 0 0 1-5-5l2-2a3.5 3.5 0 0 1 5 0" />
    <path d="m14.5 9.5 1-1a3.5 3.5 0 0 1 5 5l-2 2a3.5 3.5 0 0 1-5 0" />
    <path d="m4 4 16 16" />
  </IconBase>
);
