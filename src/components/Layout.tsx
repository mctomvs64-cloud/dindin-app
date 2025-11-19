import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { 
  LayoutDashboard, 
  Receipt, 
  Target, 
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  Wallet,
  Calendar,
  Plus,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FloatingActionButton } from "./FloatingActionButton";
import { SkeletonLoader } from "./SkeletonLoader";
import { motion } from "framer-motion";
import { FloatingAIButton } from "./AIChat/FloatingAIButton";
import { AIChatDrawer } from "./AIChat/AIChatDrawer";

interface LayoutProps {
  children: ReactNode;
}

const WORKSPACE_COLORS = [
  "#6366F1", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", 
  "#EC4899", "#14B8A6", "#F97316", "#06B6D4"
];

export default function Layout({ children }: LayoutProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentWorkspace, workspaceLoading, createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [isCreateWorkspaceDialogOpen, setIsCreateWorkspaceDialogOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);


  const [newWorkspaceForm, setNewWorkspaceForm] = useState({
    name: "",
    description: "",
    color: "#6366F1",
    icon: "Briefcase",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleCreateNewWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceForm.name.trim()) {
      toast.error("O nome do perfil é obrigatório.");
      return;
    }
    await createWorkspace(newWorkspaceForm);
    setNewWorkspaceForm({ name: "", description: "", color: "#6366F1", icon: "Briefcase" });
    setIsCreateWorkspaceDialogOpen(false);
  };

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SkeletonLoader className="h-12 w-12 rounded-full" />
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

  // If user is logged in but no workspace is found (e.g., first login or all deleted)
  if (!currentWorkspace && user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background"
      >
        <Wallet className="h-24 w-24 text-primary mb-6 opacity-70 animate-bounce-subtle" />
        <h2 className="text-2xl font-bold mb-3">Bem-vindo ao FinanceFlow!</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Parece que você ainda não tem um perfil financeiro. Crie um para começar a organizar suas finanças.
        </p>
        <Button onClick={() => setIsCreateWorkspaceDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Primeiro Perfil
        </Button>

        <Dialog open={isCreateWorkspaceDialogOpen} onOpenChange={setIsCreateWorkspaceDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Perfil</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateNewWorkspace} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Perfil *</Label>
                <Input
                  id="name"
                  value={newWorkspaceForm.name}
                  onChange={(e) => setNewWorkspaceForm({ ...newWorkspaceForm, name: e.target.value })}
                  placeholder="Ex: Empresa X, Freelance, Família..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newWorkspaceForm.description}
                  onChange={(e) => setNewWorkspaceForm({ ...newWorkspaceForm, description: e.target.value })}
                  placeholder="Descrição opcional..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Cor do Perfil</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {WORKSPACE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewWorkspaceForm({ ...newWorkspaceForm, color })}
                      className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newWorkspaceForm.color === color ? color : "transparent",
                        boxShadow: newWorkspaceForm.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateWorkspaceDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Perfil</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

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
      <FloatingActionButton onClick={() => navigate("/transactions")} /> {/* Example FAB, can be customized */}
      <FloatingAIButton onClick={() => setIsAIChatOpen(true)} />
      <AIChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}