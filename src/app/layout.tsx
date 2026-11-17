import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akvaryum Ustası — Gerçekçi Balık Besleme Oyunu",
  description:
    "Gerçekçi bir akvaryum kur, balıklarını besle, büyüt. Seviyeleri tamamla, 8 farklı balık türünü keşfet ve altın kabarcıklarını yakala.",
  keywords: ["akvaryum", "balık besleme", "oyun", "simulation", "fish game"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b222a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b222a] text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
