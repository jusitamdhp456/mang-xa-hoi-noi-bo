import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";
import { IntroSplash } from "@/components/ui/IntroSplash";

const barlow = Barlow({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin", "vietnamese"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "Mạng Xã Hội Nội Bộ",
  description: "Mạng xã hội giao tiếp nội bộ",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
        <IntroSplash />
        {children}
      </body>
    </html>
  );
}
