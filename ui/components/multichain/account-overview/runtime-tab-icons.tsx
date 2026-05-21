import React from 'react';
import type { SVGProps } from 'react';

/* eslint-disable @metamask/design-tokens/color-no-hex */

type IconProps = SVGProps<SVGSVGElement>;

const ICON_CLASS = 'runtime-app-icon';

const withIconClass = (className?: string) =>
  className && className.length > 0 ? `${ICON_CLASS} ${className}` : ICON_CLASS;

export const SessionPayIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 512 512"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Session Pay icon"
    {...props}
  >
    <rect width="512" height="512" rx="120" fill="#111827" />
    <rect width="512" height="512" rx="120" fill="url(#sessionpay-grad)" />
    <circle
      cx="256"
      cy="256"
      r="140"
      stroke="white"
      strokeWidth="32"
      strokeOpacity="0.2"
    />
    <path
      d="M256 160C309.019 160 352 202.981 352 256C352 309.019 309.019 352 256 352C202.981 352 160 309.019 160 256C160 202.981 202.981 160 256 160Z"
      fill="url(#sessionpay-eye-grad)"
    />
    <path
      d="M256 224C273.673 224 288 238.327 288 256C288 273.673 273.673 288 256 288C238.327 288 224 273.673 224 256C224 238.327 238.327 224 256 224Z"
      fill="white"
    />
    <path
      d="M440 256H480"
      stroke="#10B981"
      strokeWidth="24"
      strokeLinecap="round"
    />
    <path
      d="M32 256H72"
      stroke="#10B981"
      strokeWidth="24"
      strokeLinecap="round"
    />
    <defs>
      <linearGradient id="sessionpay-grad" x1="0" y1="0" x2="512" y2="512">
        <stop stopColor="#1F2937" />
        <stop offset="1" stopColor="#000000" />
      </linearGradient>
      <linearGradient
        id="sessionpay-eye-grad"
        x1="160"
        y1="160"
        x2="352"
        y2="352"
      >
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

export const PayIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Pay icon"
    {...props}
  >
    <defs>
      <linearGradient id="pay-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a7f3d0" />
        <stop offset="60%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
    <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#pay-grad)" />
    <path
      d="M32 64 Q36 36 50 52 Q64 36 68 64"
      stroke="#ffffff"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const DexPixel = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Dex icon"
    {...props}
  >
    <defs>
      <linearGradient id="dex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e1b4b" />
        <stop offset="100%" stopColor="#4c1d95" />
      </linearGradient>
    </defs>
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      rx="20"
      fill="url(#dex-grad)"
    />
    <path
      d="M0 0 H100 A20 20 0 0 1 100 20 V50 C100 50 80 20 50 20 C20 20 0 50 0 50 V20 A20 20 0 0 1 0 0 Z"
      fill="#ffffff"
      opacity="0.15"
    />
    <rect
      x="0.6"
      y="0.6"
      width="98.8"
      height="98.8"
      rx="19.4"
      fill="none"
      stroke="#ffffff"
      strokeOpacity="0.22"
      strokeWidth="0.8"
    />
    <rect x="45" y="35" width="10" height="10" fill="#db2777" />
    <rect x="35" y="45" width="10" height="10" fill="#9333ea" />
    <rect x="45" y="45" width="10" height="10" fill="#2563eb" />
    <rect x="45" y="55" width="10" height="10" fill="#0ea5e9" />
    <rect x="55" y="45" width="10" height="10" fill="#22c55e" />
    <rect x="55" y="55" width="10" height="10" fill="#ffffff" />
  </svg>
);

export const FlashLoanPower = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Flash Loan icon"
    {...props}
  >
    <defs>
      <linearGradient id="flashloan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      rx="22"
      fill="url(#flashloan-grad)"
    />
    <path
      d="M0 0 H100 A22 22 0 0 1 100 22 V50 C100 50 80 30 50 30 C20 30 0 50 0 50 V22 A22 22 0 0 1 0 0 Z"
      fill="white"
      opacity="0.1"
    />
    <path
      d="M25 35 C25 30 29 26 34 26 H70 C75 26 79 30 79 35 V40 H70 C65 40 65 48 70 48 H79 V65 C79 70 75 74 70 74 H34 C29 74 25 70 25 65 V35 Z"
      fill="white"
    />
    <path
      d="M52 38 L45 50 H55 L48 62"
      stroke="#ea580c"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const WillMonolith = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Will icon"
    {...props}
  >
    <defs>
      <linearGradient id="will-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="40%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#fbbf24" />
      </linearGradient>
    </defs>
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      rx="24"
      fill="url(#will-grad)"
    />
    <rect
      x="6"
      y="6"
      width="88"
      height="88"
      rx="20"
      fill="#ffffff"
      opacity="0.08"
    />
    <path d="M0 70 H 100" stroke="#78350f" strokeWidth="1" opacity="0.2" />
    <rect
      x="40"
      y="25"
      width="20"
      height="50"
      fill="#171717"
      stroke="#404040"
      strokeWidth="0.5"
    />
    <circle cx="50" cy="20" r="2" fill="white" opacity="0.8" />
    <path d="M40 75 L 45 75 L 40 25" fill="black" opacity="0.3" />
  </svg>
);

export const NFTMarketVoxelDart = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="NFT Market icon"
    {...props}
  >
    <defs>
      <linearGradient id="nftmarket-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fce7f3" />
        <stop offset="100%" stopColor="#f9a8d4" />
      </linearGradient>
    </defs>
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      rx="24"
      fill="url(#nftmarket-grad)"
    />
    <rect
      x="6"
      y="6"
      width="88"
      height="88"
      rx="20"
      fill="#ffffff"
      opacity="0.08"
    />
    <path d="M50 20 L 60 25 L 50 30 L 40 25 Z" fill="#e0e7ff" />
    <path d="M50 30 L 60 35 L 60 65 L 50 60 Z" fill="#818cf8" />
    <path d="M40 25 L 50 30 L 50 60 L 40 55 Z" fill="#c7d2fe" />
    <path d="M40 45 L 30 50 L 30 60 L 40 55 Z" fill="#c7d2fe" />
    <path d="M60 45 L 70 50 L 70 60 L 60 55 Z" fill="#818cf8" />
  </svg>
);

export const RedPacketIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <rect x="20" y="15" width="60" height="70" rx="10" fill="#EF4444" />
    <path
      d="M20 30 L50 55 L80 30"
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    <circle cx="50" cy="65" r="10" fill="#FCD34D" />
    <rect x="46" y="61" width="8" height="8" rx="1" fill="#B45309" />
  </svg>
);

export const GiftIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <rect x="20" y="40" width="60" height="45" rx="4" fill="#A855F7" />
    <rect x="15" y="25" width="70" height="15" rx="2" fill="#9333EA" />
    <path d="M42 25 V85 M58 25 V85" stroke="#FDE047" strokeWidth="8" />
    <path
      d="M35 25 C35 15 45 15 50 25 C55 15 65 15 65 25"
      fill="none"
      stroke="#FDE047"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

export const MintDappIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={withIconClass(className)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <defs>
      <linearGradient id="store-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#C084FC" />
      </linearGradient>
    </defs>
    <rect
      x="15"
      y="15"
      width="70"
      height="70"
      rx="20"
      fill="none"
      stroke="#1B0D15"
      strokeWidth="4"
      strokeDasharray="8 6"
      strokeOpacity="0.2"
    />
    <path
      d="M50 35 V65 M35 50 H65"
      stroke="url(#store-grad)"
      strokeWidth="10"
      strokeLinecap="round"
    />
  </svg>
);
