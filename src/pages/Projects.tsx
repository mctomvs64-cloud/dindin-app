import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Target, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  status: "active" | "paused" | "completed" | "archived";
  target_amount?: number;
  folder_id?: string;
  folders?: { name: string };
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface ProjectStats {
  total_income: number;
  total_expense: number;
  net_amount: number;
  target: number | null;
  progress: number;
}

const STATUS_LABELS = {
  active: "Ativo",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

const STATUS_COLORS = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  completed: "bg-blue-500",
  archived: "bg-gray-500",
};

export default function Projects() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, ProjectStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    color: "#8b5cf6",
    status: "active" as "active" | "paused" | "completed" | "archived",
    target_amount: "",
    folder_id: "",
  });

  const [folderForm, setFolderForm] = useState({
    name: "",
    color: "#6366f1",
    icon: "Folder",
  });

  useEffect(() => {
    if (user && currentWorkspace) {
      loadData();
    }
  }, [user, currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    try {
      const [projectsRes, foldersRes] = await Promise.all([
        supabase
          .from("projects")
          .select(`
            *,
            folders (name)
          `)
          .eq("user_id", user?.id)
          .eq("workspace_id", currentWorkspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("folders")
          .select("*")
          .eq("user_id", user?.id)
          .eq("workspace_id", currentWorkspace.id)
          .order("name", { ascending: true })
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (foldersRes.error) throw foldersRes.error;

      const projectsData = projectsRes.data || [];
      setProjects(projectsData);
      setFolders(foldersRes.data || []);

      const statsPromises = projectsData.map(async (project) => {
        const { data, error } = await supabase.rpc(
          "calculate_project_progress",
          { p_project_id: project.id }
        );

        if (!error && data) {
          const stats = data as unknown as ProjectStats;
          return [project.id, stats] as [string, ProjectStats];
        }
        return null;
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = new Map(
        statsResults.filter((r) => r !== null) as [string, ProjectStats][]
      );
      setProjectStats(statsMap);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    try {
      const { error } = await supabase.from("projects").insert([{
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        name: projectForm.name,
        description: projectForm.description || null,
        color: projectForm.color,
        status: projectForm.status,
        target_amount: projectForm.target_amount ? parseFloat(projectForm.target_amount) : null,
        folder_id: projectForm.folder_id || null,
      }]);

      if (error) throw error;
      toast.success("Projeto criado!");
      setProjectDialogOpen(false);
      setProjectForm({
        name: "",
        description: "",
        color: "#8b5cf6",
        status: "active",
        target_amount: "",
        folder_id: "",
      });
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar projeto");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    try {
      const { error } = await supabase.from("folders").insert([{
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        name: folderForm.name,
        color: folderForm.color,
        icon: folderForm.icon,
      }]);

      if (error) throw error;
      toast.success("Pasta criada!");
      setFolderDialogOpen(false);
      setFolderForm({ name: "", color: "#6366f1", icon: "Folder" });
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Projeto excluído!");
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir projeto");
    }
  };

  const getProjectsByFolder = (folderId?: string) => {
    return projects.filter(p => p.folder_id === (folderId || null));
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const stats = projectStats.get(project.id);
    const progress = stats?.progress || 0;
    const netAmount = stats?.net_amount || 0;
    const target = stats?.target || 0;

    return (
      <Card className="hover:shadow-lg transition-all duration-200 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: project.color }}
              >
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {STATUS_LABELS[project.status]}
                  </Badge>
                  {project.folders && (
                    <Badge variant="outline" className="text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {project.folders.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteProject(project.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          
          {target > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  R$ {netAmount.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  Meta: R$ {target.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Entradas</span>
                </div>
                <p className="text-sm font-semibold">
                  R$ {stats.total_income.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <TrendingUp className="h-4 w-4 rotate-180" />
                  <span className="text-xs font-medium">Saídas</span>
                </div>
                <p className="text-sm font-semibold">
                  R$ {stats.total_expense.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const projectsWithoutFolder = getProjectsByFolder();

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">
            Organize seus projetos em pastas
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderOpen className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <Label>Nome da Pasta</Label>
                  <Input
                    value={folderForm.name}
                    onChange={(e) => setFolderForm({...folderForm, name: e.target.value})}
                    placeholder="Ex: 2025, Viagens, Reforma"
                    required
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={folderForm.color}
                    onChange={(e) => setFolderForm({...folderForm, color: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Criar Pasta</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Projeto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <Label>Nome do Projeto</Label>
                  <Input
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cor</Label>
                    <Input
                      type="color"
                      value={projectForm.color}
                      onChange={(e) => setProjectForm({...projectForm, color: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value: any) => setProjectForm({...projectForm, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Meta Financeira (opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={projectForm.target_amount}
                    onChange={(e) => setProjectForm({...projectForm, target_amount: e.target.value})}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <Label>Pasta (opcional)</Label>
                  <Select
                    value={projectForm.folder_id}
                    onValueChange={(value) => setProjectForm({...projectForm, folder_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem pasta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem pasta</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Criar Projeto</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projetos sem pasta */}
      {projectsWithoutFolder.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Sem Pasta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsWithoutFolder.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Projetos organizados por pasta */}
      {folders.length > 0 && (
        <Accordion type="multiple" className="space-y-4" defaultValue={folders.map(f => f.id)}>
          {folders.map((folder) => {
            const folderProjects = getProjectsByFolder(folder.id);
            if (folderProjects.length === 0) return null;

            return (
              <AccordionItem
                key={folder.id}
                value={folder.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: folder.color }}
                    >
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{folder.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {folderProjects.length} {folderProjects.length === 1 ? "projeto" : "projetos"}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {folderProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto ainda</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie seu primeiro projeto e organize em pastas
            </p>
            <Button onClick={() => setProjectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
