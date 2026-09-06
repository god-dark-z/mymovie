import type { SVGProps } from 'react';

/**
 * Original line icons on a 24-unit grid, 1.75 stroke, round caps.
 *
 * Hand-drawn rather than pulled from an icon library: it keeps the bundle to a
 * few hundred bytes per icon and lets the weight match the display type.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path d="M15.4 15.4 20.5 20.5" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.75 10.3 12 3.5l8.25 6.8V19a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M9.5 20.5v-5.75h5v5.75" />
    </Icon>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M8 4.5v15M16 4.5v15M3 12h18M3 8.25h5M16 8.25h5M3 15.75h5M16 15.75h5" />
    </Icon>
  );
}

export function TvIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="5" width="18.5" height="12.5" rx="2.25" />
      <path d="M8.75 20.5h6.5" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.25c.9 3.9 2.1 5.1 6 6-3.9.9-5.1 2.1-6 6-.9-3.9-2.1-5.1-6-6 3.9-.9 5.1-2.1 6-6Z" />
      <path d="M18.75 15.5c.4 1.7.9 2.2 2.6 2.6-1.7.4-2.2.9-2.6 2.6-.4-1.7-.9-2.2-2.6-2.6 1.7-.4 2.2-.9 2.6-2.6Z" />
    </Icon>
  );
}

export function BookmarkIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M6.25 4.5h11.5a.75.75 0 0 1 .75.75V20.5L12 16.9l-6.5 3.6V5.25a.75.75 0 0 1 .75-.75Z" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon fill="currentColor" strokeWidth={2.5} {...props}>
      <path d="M8.5 5.6 19 12l-10.5 6.4z" />
    </Icon>
  );
}

export function PlayCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.25 8.6 15.5 12l-5.25 3.4z" fill="currentColor" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 9.25 12 15.75l6.5-6.5" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 12H5M11 5.5 4.5 12l6.5 6.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function ServerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="4" width="17.5" height="6" rx="1.75" />
      <rect x="3.25" y="14" width="17.5" height="6" rx="1.75" />
      <path d="M7 7h.01M7 17h.01" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.4 9.5h17.2M3.4 14.5h17.2" />
      <path d="M12 3c-2.4 2.4-3.6 5.4-3.6 9s1.2 6.6 3.6 9c2.4-2.4 3.6-5.4 3.6-9S14.4 5.4 12 3Z" />
    </Icon>
  );
}

export function CaptionsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="2.5" />
      <path d="M9.75 10.4a2.6 2.6 0 1 0 0 3.2M17.75 10.4a2.6 2.6 0 1 0 0 3.2" />
    </Icon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.5h6M14 7.5h6M4 16.5h10M18 16.5h2" />
      <circle cx="12" cy="7.5" r="2.25" />
      <circle cx="16" cy="16.5" r="2.25" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.75 12.75 9.5 17.5 19.25 7" />
    </Icon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Icon fill="currentColor" strokeWidth={0} {...props}>
      <path d="M12 3.6l2.46 5.06 5.54.78-4.02 3.9.96 5.56L12 16.3l-4.94 2.6.96-5.56-4.02-3.9 5.54-.78z" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4.25M12 17.2h.01" />
    </Icon>
  );
}

export function OfflineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 8.6a15 15 0 0 1 6-3.4M15.6 5.3a15 15 0 0 1 5.9 3.3M6.3 12.3a10 10 0 0 1 3-1.6M14.9 10.8a10 10 0 0 1 2.8 1.5M9.8 15.9a5.5 5.5 0 0 1 4.4 0M12 19.6h.01" />
      <path d="M3.5 3.5 20.5 20.5" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" />
    </Icon>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.5 4.5V10h-5.4" />
    </Icon>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 6.2 14 12l-8.5 5.8z" fill="currentColor" strokeWidth={1.5} />
      <path d="M18 6v12" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.25V12l3.25 2" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.25" />
      <path d="M3.5 10h17M8.5 3.5v3M15.5 3.5v3" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15M9.5 7V4.75h5V7M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.25M12 7.9h.01" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.75" y="10.5" width="14.5" height="9.75" rx="2.25" />
      <path d="M8.25 10.5V8a3.75 3.75 0 0 1 7.5 0v2.5" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 4.5h6v6M19.5 4.5 11 13" />
      <path d="M18 14.5v3.75a2.25 2.25 0 0 1-2.25 2.25H6.25A2.25 2.25 0 0 1 4 18.25V8.75A2.25 2.25 0 0 1 6.25 6.5H10" />
    </Icon>
  );
}

export function SpinnerIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="origin-center animate-ring"
      />
    </svg>
  );
}

/* Account and settings. Same grid and stroke as the rest, drawn here rather than
   imported so the set keeps one hand. */

export function UserIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.25" r="3.75" fill={filled ? 'currentColor' : 'none'} />
      <path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0" fill={filled ? 'currentColor' : 'none'} />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5l7 2.5v5.6c0 4.2-2.8 7.4-7 8.9-4.2-1.5-7-4.7-7-8.9V6z" />
      <path d="M9.25 12.1 11.4 14.2l3.6-4" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0c0 3 .6 4.6 1.5 5.75H5c.9-1.15 1.5-2.75 1.5-5.75z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 12S6.5 5.75 12 5.75 21.25 12 21.25 12 17.5 18.25 12 18.25 2.75 12 2.75 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4.5 20 20.5" />
      <path d="M9.6 6.3A9.6 9.6 0 0 1 12 6c5.5 0 9.25 6 9.25 6a17 17 0 0 1-3 3.7" />
      <path d="M17.1 17.2A9.4 9.4 0 0 1 12 18.25C6.5 18.25 2.75 12 2.75 12a17.6 17.6 0 0 1 4-4.4" />
      <path d="M10.1 10.2a2.75 2.75 0 0 0 3.8 3.8" />
    </Icon>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.25" cy="8.25" r="4" />
      <path d="M11.1 11.1 20 20" />
      <path d="M16.5 16.5 18.5 14.5M14 14l2 2" />
    </Icon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2.5" />
      <path d="m4.5 7.5 6.4 4.7a2 2 0 0 0 2.2 0l6.4-4.7" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 4.75h3a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2h-3" />
      <path d="M10.5 8.25 6.75 12l3.75 3.75M6.75 12h8.25" />
    </Icon>
  );
}

export function DeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="5" width="12.5" height="9.5" rx="1.75" />
      <path d="M2 18.5h11" />
      <rect x="17" y="9.5" width="4.5" height="9" rx="1.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.75v10.5M8 10.5l4 4 4-4" />
      <path d="M4.75 17.5v.75a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2v-.75" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.25 5.5v13M14.75 5.5v13" />
    </Icon>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.75a8.25 8.25 0 0 0 0 16.5c1.3 0 1.75-.8 1.75-1.6 0-1.5-1.2-1.7-1.2-2.9 0-1 .8-1.5 2-1.5h1.7a3.8 3.8 0 0 0 3.8-3.8c0-3.9-3.6-6.7-8.05-6.7z" />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.75" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.75" cy="9.75" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function AccessibilityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <path d="M5.5 8.75c2 .8 4.2 1.2 6.5 1.2s4.5-.4 6.5-1.2" />
      <path d="M12 9.95v4.3M9.25 20.25 12 14.25l2.75 6" />
    </Icon>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.25V9.75M8 13.25l4-4 4 4" />
      <path d="M4.75 6.5V5.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v.75" />
    </Icon>
  );
}





