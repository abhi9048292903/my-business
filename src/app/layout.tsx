import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Hisaab",
  description: "Fast billing and amount-locked UPI QR for small shops.",
  applicationName: "Hisaab",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Hisaab", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c6b52",
  viewportFit: "cover",
};

const themeBoot = `try{var t=localStorage.getItem("hisaab-theme")||"light";document.documentElement.dataset.theme=t;var p=localStorage.getItem("hisaab-print")||"58";document.documentElement.dataset.print=p;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
