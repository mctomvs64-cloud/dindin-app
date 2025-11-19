import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Receipt, 
  Target, 
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  Wallet,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Erro ao sair");
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Caixa Diário", href: "/daily-cash", icon: Wallet },
    { name: "Transações", href: "/transactions", icon: Receipt },
    { name: "Contas Fixas", href: "/fixed-bills", icon: Calendar },
    { name: "Projetos", href: "/projects", icon: Target },
    { name: "Metas", href: "/goals", icon: TrendingUp },
    { name: "Relatórios", href: "/reports", icon: TrendingUp },
  ];

  const NavLinks = () => (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          end={item.href === "/"}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-all hover:bg-accent"
          activeClassName="bg-accent text-accent-foreground font-medium"
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <div className="p-6 border-b">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-primary rounded-lg p-2">
                      <Wallet className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg">Organiza Aí</span>
                  </div>
                  <WorkspaceSelector />
                </div>
                <nav className="flex-1 space-y-1 p-4">
                  <NavLinks />
                </nav>
                <div className="p-4 border-t space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-danger hover:text-danger"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 ml-2">
            <div className="bg-primary rounded-lg p-2">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Organiza Aí</span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-card h-screen sticky top-0">
          <div className="p-6 border-b space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-2">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Organiza Aí</span>
            </div>
            <WorkspaceSelector />
          </div>
          <nav className="flex-1 space-y-1 p-4 overflow-auto">
            <NavLinks />
          </nav>
          <div className="p-4 border-t space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-danger hover:text-danger"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      <BottomNav />
    </div>
  );
}
