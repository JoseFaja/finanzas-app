"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ProfileEditor } from "./ProfileEditor";
import { AccountsView } from "./AccountsView";
import { TransactionsView } from "./TransactionsView";
import { DebtsView } from "./DebtsView";
import { GoalsView } from "./GoalsView";
import { ScoreView } from "./ScoreView";
import { fetchJson } from "./figma-api";
import {
  Wallet,
  Receipt,
  CreditCard,
  Target,
  TrendingUp,
  LogOut,
  User,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface CatalogItem {
  id: number;
  nombre: string;
}

interface UserProfile {
  id: number;
  nombre: string | null;
  apellido: string | null;
  correo: string;
  numeroDocumento: string | null;
  idTipoDocumento: number | null;
  googleImage: string | null;
  tipoDocumento: CatalogItem | null;
  estado: CatalogItem | null;
}

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<
    "accounts" | "transactions" | "debts" | "goals" | "score"
  >("accounts");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<CatalogItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const [perfil, tiposDocumento] = await Promise.all([
          fetchJson<UserProfile | null>("/api/perfil"),
          fetchJson<CatalogItem[]>("/api/catalogos/tipo-documento"),
        ]);

        if (!active) {
          return;
        }

        setUserProfile(perfil);
        setDocumentTypes(tiposDocumento);
      } catch (error) {
        if (!active) {
          return;
        }

        setProfileError(
          error instanceof Error ? error.message : "No se pudo cargar el perfil",
        );
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const menuItems = [
    { id: "accounts", label: "Cuentas", icon: Wallet },
    { id: "transactions", label: "Transacciones", icon: Receipt },
    { id: "debts", label: "Deudas", icon: CreditCard },
    { id: "goals", label: "Objetivos", icon: Target },
    { id: "score", label: "Score", icon: TrendingUp },
  ];

  const handleSaveProfile = async (profile: UserProfile) => {
    const updated = await fetchJson<UserProfile>("/api/perfil", {
      method: "PUT",
      body: JSON.stringify({
        nombre: profile.nombre,
        apellido: profile.apellido,
        numeroDocumento: profile.numeroDocumento,
        idTipoDocumento: profile.idTipoDocumento,
      }),
    });

    setUserProfile(updated);
  };

  const renderView = () => {
    switch (currentView) {
      case "accounts":
        return <AccountsView />;
      case "transactions":
        return <TransactionsView />;
      case "debts":
        return <DebtsView />;
      case "goals":
        return <GoalsView />;
      case "score":
        return <ScoreView />;
      default:
        return <AccountsView />;
    }
  };

  const displayName =
    [userProfile?.nombre, userProfile?.apellido].filter(Boolean).join(" ") ||
    session?.user?.name ||
    "Usuario";
  const displayEmail = userProfile?.correo || session?.user?.email || "";
  const avatarUrl = userProfile?.googleImage || session?.user?.image || "";
  const fallbackInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h1 className="text-2xl">FinanceApp</h1>
        <p className="text-sm text-muted-foreground">Gestión Financiera Personal</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Button
                  variant={currentView === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentView(item.id as any)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background md:flex-row">
      <div className="flex items-center justify-between border-b p-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <h1 className="text-xl">FinanceApp</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{fallbackInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Editar Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <aside className="hidden w-64 border-r md:block">
        <Sidebar />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="hidden items-center justify-between border-b p-6 md:flex">
          <div>
            <h2 className="text-2xl">
              {menuItems.find((item) => item.id === currentView)?.label}
            </h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{fallbackInitials}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Editar Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {profileLoading ? (
            <p className="mb-4 text-sm text-muted-foreground">Cargando perfil desde Neon...</p>
          ) : null}
          {profileError ? <p className="mb-4 text-sm text-destructive">{profileError}</p> : null}
          {renderView()}
        </main>
      </div>

      <ProfileEditor
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={
          userProfile ?? {
            id: 0,
            nombre: session?.user?.name ?? null,
            apellido: null,
            correo: session?.user?.email ?? "",
            numeroDocumento: null,
            idTipoDocumento: null,
            googleImage: session?.user?.image ?? null,
            tipoDocumento: null,
            estado: null,
          }
        }
        documentTypes={documentTypes}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
