import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components";
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
  title: {
    default: "Stock & Warrant Analyzer",
    template: "%s | Stock & Warrant Analyzer",
  },
  description: "Phân tích cổ phiếu và chứng quyền Việt Nam - What-if Analysis, Break-even Calculator",
  keywords: ["chứng quyền", "cổ phiếu", "warrant", "stock", "vietnam", "SSI", "phân tích", "break-even"],
  authors: [{ name: "Stock Warrant Analyzer" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    title: "Stock & Warrant Analyzer",
    description: "Công cụ phân tích chứng quyền và cổ phiếu Việt Nam",
    siteName: "Stock & Warrant Analyzer",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <QueryProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
