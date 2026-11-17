import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Noto_Sans_JP({ variable: "--font-noto-sans-jp", weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap", preload: false });
const serif = Noto_Serif_JP({ variable: "--font-noto-serif-jp", weight: ["500", "600"], subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "MIYAJIMA STOCK", template: "%s | MIYAJIMA STOCK" },
  description: "宮島民泊の家具・家電・備品の購入品・購入予定品管理アプリ",
  applicationName: "MIYAJIMA STOCK",
  appleWebApp: { capable: true, title: "MIYAJIMA STOCK", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#121513" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${sans.variable} ${serif.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
