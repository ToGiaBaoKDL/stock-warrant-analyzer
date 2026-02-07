import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
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
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <QueryProvider>
            <ThemeProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </ThemeProvider>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
