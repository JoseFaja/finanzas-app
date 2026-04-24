"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Dashboard } from "@/components/figma/Dashboard";
import { LoginPage } from "@/components/figma/LoginPage";

export function FinanceDashboard() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <LoginPage onLogin={() => void signIn("google")} />;
  }

  return <Dashboard onLogout={() => void signOut()} />;
}