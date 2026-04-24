import { useState } from "react";
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

interface UserProfile {
  name: string;
  lastName: string;
  email: string;
  documentType: string;
  documentNumber: string;
  avatar: string;
}

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState<
    "accounts" | "transactions" | "debts" | "goals" | "score"
  >("accounts");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Juan",
    lastName: "Pérez",
    email: "juan.perez@gmail.com",
    documentType: "CC",
    documentNumber: "1234567890",
    avatar: "",
  });

  const menuItems = [
    { id: "accounts", label: "Cuentas", icon: Wallet },
    { id: "transactions", label: "Transacciones", icon: Receipt },
    { id: "debts", label: "Deudas", icon: CreditCard },
    { id: "goals", label: "Objetivos", icon: Target },
    { id: "score", label: "Score", icon: TrendingUp },
  ];

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
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

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
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
                  <Icon className="w-5 h-5 mr-3" />
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
    <div className="h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <Sheet>
          <SheetTrigger asChild>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 px-3">
              <Menu className="w-5 h-5" />
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
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile.avatar} />
                <AvatarFallback>
                  {userProfile.name[0]}
                  {userProfile.lastName[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              <User className="w-4 h-4 mr-2" />
              Editar Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl">
              {menuItems.find((item) => item.id === currentView)?.label}
            </h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 rounded-full">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={userProfile.avatar} />
                  <AvatarFallback>
                    {userProfile.name[0]}
                    {userProfile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm">
                    {userProfile.name} {userProfile.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <User className="w-4 h-4 mr-2" />
                Editar Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">{renderView()}</main>
      </div>

      {/* Profile Editor Modal */}
      <ProfileEditor
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
