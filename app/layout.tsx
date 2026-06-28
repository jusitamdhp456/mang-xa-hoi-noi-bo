import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin", "vietnamese"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "Mạng Xã Hội Nội Bộ",
  description: "Mạng xã hội giao tiếp nội bộ",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
