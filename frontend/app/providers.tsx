"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TourProvider } from "@/components/tour/guided-tour";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={140}>
        <TourProvider>
          {children}
        </TourProvider>
        <Toaster
          position="bottom-right"
          theme="dark"
          closeButton
          toastOptions={{
            style: {
              background: "#0d0d0f",
              border: "1px solid #27405e",
              color: "#eef3f8",
              fontSize: "12px",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}