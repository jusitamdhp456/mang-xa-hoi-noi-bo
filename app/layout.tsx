import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";
import { IntroSplash } from "@/components/ui/IntroSplash";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";

const barlow = Barlow({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin", "vietnamese"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "IntraSocial",
  description: "Mạng xã hội giao tiếp nội bộ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "IntraSocial",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${barlow.variable} ${barlow.className} h-full antialiased`}
    >
      <head>
        {/* Warm the intro sound + logo so they're ready the moment the app opens */}
        <link rel="preload" href="/alovua.mp3" as="audio" />
        <link rel="preload" href="/logo.png" as="image" />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <IntroSplash />
        {children}
      </body>
    </html>
  );
}
