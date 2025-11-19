import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Briefcase, Bell, Palette, LogOut, Pencil, Trash2, Plus } from "lucide-react";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedButton } from "@/components/AnimatedButton";
import { motion } from "framer-motion";
import ReactConfetti from "react-confetti";

const WORKSPACE_COLORS = [
  "#6366F1", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899"
];

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { workspaces, currentWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
    color: "#6366F1",
  });
  const [showConfetti, setShowConfetti] = useState(false);


  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingWorkspace) {
      await updateWorkspace(editingWorkspace.id, workspaceForm);
      toast.success("Perfil atualizado!", {
        icon: '✏️',
        description: "As informações do perfil foram salvas.",
      });
    } else {
      await createWorkspace(workspaceForm);
      toast.success("Perfil criado!", {
        icon: '🎉',
        description: "Seu novo perfil foi adicionado com sucesso!",
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    setWorkspaceForm({ name: "", description: "", color: "#6366F1" });
    setEditingWorkspace(null);
    setIsWorkspaceDialogOpen(false);
  };

  const handleEditWorkspace = (workspace: any) => {
    setEditingWorkspace(workspace);
    setWorkspaceForm({
      name: workspace.name,
      description: workspace.description || "",
      color: workspace.color,
    });
    setIsWorkspaceDialogOpen(true);
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este perfil? Todos os dados serão perdidos.")) return;
    await deleteWorkspace(id);
    toast.success("Perfil excluído!", {
      icon: '🗑️',
      description: "O perfil e seus dados foram removidos.",
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-20 md:pb-4 space-y-6">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e perfis</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">
            <User className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="text-xs sm:text-sm">
            <Briefcase className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Perfis</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Avisos</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm">
            <Palette className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
        </TabsList>

        {/* Perfil do Usuário */}
        <TabsContent value="profile" className="space-y-4">
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Informações do Usuário</CardTitle>
              <CardDescription>Gerencie seus dados pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-sm text-muted-foreground">Conta ativa</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>

              <AnimatedButton variant="destructive" onClick={signOut} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Sair da Conta
              </AnimatedButton>
            </CardContent>
          </AnimatedCard>
        </TabsContent>

        {/* Gerenciar Workspaces */}
        <TabsContent value="workspaces" className="space-y-4">
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Meus Perfis / Caixas</CardTitle>
              <CardDescription>Gerencie seus diferentes perfis financeiros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {workspaces.map((workspace) => (
                  <motion.div
                    key={workspace.id}
                    variants={itemVariants}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
                        style={{ backgroundColor: workspace.color }}
                      >
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{workspace.name}</p>
                          {workspace.is_default && (
                            <Badge variant="secondary" className="text-xs">Padrão</Badge>
                          )}
                          {workspace.id === currentWorkspace?.id && (
                            <Badge variant="default" className="text-xs">Atual</Badge>
                          )}
                        </div>
                        {workspace.description && (
                          <p className="text-sm text-muted-foreground truncate">{workspace.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditWorkspace(workspace)}
                      >
                        <Pencil className="h-4 w-4" />
                      </AnimatedButton>
                      {!workspace.is_default && (
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </AnimatedButton>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <Dialog open={isWorkspaceDialogOpen} onOpenChange={setIsWorkspaceDialogOpen}>
                <DialogTrigger asChild>
                  <AnimatedButton className="w-full" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Perfil
                  </AnimatedButton>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingWorkspace ? "Editar" : "Criar"} Perfil</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleWorkspaceSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="ws-name">Nome *</Label>
                      <Input
                        id="ws-name"
                        value={workspaceForm.name}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                        placeholder="Ex: Empresa X, Freelance..."
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="ws-desc">Descrição</Label>
                      <Input
                        id="ws-desc"
                        value={workspaceForm.description}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, description: e.target.value })}
                        placeholder="Opcional..."
                      />
                    </div>

                    <div>
                      <Label>Cor</Label>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {WORKSPACE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setWorkspaceForm({ ...workspaceForm, color })}
                            className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor: workspaceForm.color === color ? color : "transparent",
                              boxShadow: workspaceForm.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <AnimatedButton type="button" variant="outline" onClick={() => {
                        setIsWorkspaceDialogOpen(false);
                        setEditingWorkspace(null);
                        setWorkspaceForm({ name: "", description: "", color: "#6366F1" });
                      }} className="flex-1">
                        Cancelar
                      </AnimatedButton>
                      <AnimatedButton type="submit" className="flex-1">
                        {editingWorkspace ? "Salvar" : "Criar"}
                      </AnimatedButton>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </AnimatedCard>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications">
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Em breve: configure alertas e lembretes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </CardContent>
          </AnimatedCard>
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="appearance">
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Em breve: tema claro/escuro e personalização</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </CardContent>
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}