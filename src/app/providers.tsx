"use client";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/SettingsContext";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <ToastProvider>{children}</ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}
