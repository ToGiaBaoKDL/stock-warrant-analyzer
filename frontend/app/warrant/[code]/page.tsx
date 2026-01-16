"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /warrant/[code] to /analysis/[code]
 * We consolidate warrant detail into the analysis page for consistency
 */
export default function WarrantDetailPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const { code } = use(params);
  const router = useRouter();
  
  useEffect(() => {
    router.replace(`/analysis/${code.toUpperCase()}`);
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-[#CC785C] border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
