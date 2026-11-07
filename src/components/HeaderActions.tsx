"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "inverse";

function classNameFor(variant: Variant, iconOnly: boolean | undefined, className: string | undefined) {
  return ["header-btn", `header-btn-${variant}`, iconOnly ? "header-btn-icon" : "", className || ""].filter(Boolean).join(" ");
}

function Inner({ icon, iconOnly, children }: { icon?: ReactNode; iconOnly?: boolean; children?: ReactNode }) {
  return (
    <>
      {icon}
      {children ? <span className={iconOnly ? "sr-only" : "header-label"}>{children}</span> : null}
    </>
  );
}

export function HeaderActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`header-actions ${className}`}>{children}</div>;
}

export function HeaderButton({
  variant = "secondary",
  iconOnly,
  icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  iconOnly?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button type={type} className={classNameFor(variant, iconOnly, className)} {...props}>
      <Inner icon={icon} iconOnly={iconOnly}>{children}</Inner>
    </button>
  );
}

export function HeaderLink({
  href,
  variant = "secondary",
  iconOnly,
  icon,
  className,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  iconOnly?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={classNameFor(variant, iconOnly, className)} {...props}>
      <Inner icon={icon} iconOnly={iconOnly}>{children}</Inner>
    </Link>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function IconSun() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function IconSettings() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
    </Svg>
  );
}

export function IconClose() {
  return (
    <Svg>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconPlus() {
  return (
    <Svg>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconScan() {
  return (
    <Svg>
      <path d="M7 4H4v3M17 4h3v3M7 20H4v-3M17 20h3v-3M4 12h16" />
    </Svg>
  );
}

export function IconMic() {
  return (
    <Svg>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    </Svg>
  );
}

export function IconFilter() {
  return (
    <Svg>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" />
    </Svg>
  );
}
