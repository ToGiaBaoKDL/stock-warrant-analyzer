"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStockStore } from "@/stores";
import AnalysisPage from "./[code]/page";
import { Spin } from "antd";

export default function AnalysisLandingPage() {
  const router = useRouter();
  const { currentSymbol } = useStockStore();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // If we have a stored symbol, redirect to it immediately
    if (currentSymbol) {
      router.replace(`/analysis/${currentSymbol}`);
    } else {
      // If no symbol, stop redirecting and show the Analysis UI (empty state)
      setIsRedirecting(false);
    }
  }, [currentSymbol, router]);

  // While checking persistence
  if (isRedirecting && currentSymbol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4EF]">
        <Spin size="large" />
      </div>
    );
  }

  return <AnalysisPage />;
}
