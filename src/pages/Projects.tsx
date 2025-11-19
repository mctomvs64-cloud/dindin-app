import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, FolderOpen, TrendingUp, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { projectSchema, folderSchema } from "@/lib/validation";

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  status: "active" | "paused" | "completed" | "archived";
  target_amount?: number;
  folder_id?: string;
  folders?: {
    name: string;
  };
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface ProjectStats {
  total_income: number;
  total_expense: number;
  net_amount: number;
  target: number | null;
  progress: number;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, ProjectStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [projectsRes, foldersRes] = await Promise.all([
        supabase
          .from("projects")
          .select(`
            *,
            folders (
              name
            )
          `)
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("folders")
          .select("*")
          .eq("user_id", user?.id)
          .order("name", { ascending: true })
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (foldersRes.error) throw foldersRes.error;

      const projectsData = projectsRes.data || [];
      setProjects(projectsData);
      setFolders(foldersRes.data || []);

      // Carregar estatísticas de cada projeto
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

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input data
    const validationResult = projectSchema.safeParse({
      name: projectForm.name,
      description: projectForm.description,
      target_amount: projectForm.target_amount || undefined,
      color: projectForm.color,
      status: projectForm.status,
      folder_id: projectForm.folder_id || undefined,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const projectData = {
        user_id: user?.id,
        name: validationResult.data.name,
        description: validationResult.data.description || null,
        color: validationResult.data.color,
        status: validationResult.data.status,
        target_amount: validationResult.data.target_amount || null,
        folder_id: validationResult.data.folder_id || null,
      };

      if (editingProject) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editingProject.id);

        if (error) throw error;
        toast.success("Projeto atualizado!");
      } else {
        const { error } = await supabase
          .from("projects")
          .insert([projectData]);

        if (error) throw error;
        toast.success("Projeto criado!");
      }

      setDialogOpen(false);
      resetProjectForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
      toast.error("Erro ao salvar projeto");
    }
  };

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input data
    const validationResult = folderSchema.safeParse({
      name: folderForm.name,
      color: folderForm.color,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const { error } = await supabase
        .from("folders")
        .insert([{
          user_id: user?.id,
          name: validationResult.data.name,
          color: validationResult.data.color,
        }]);

      if (error) throw error;
      toast.success("Pasta criada!");
      setFolderDialogOpen(false);
      setFolderForm({ name: "", color: "#6366f1" });
      loadData();
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Deseja realmente excluir este projeto?")) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Projeto excluído!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      toast.error("Erro ao excluir projeto");
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description || "",
      color: project.color,
      status: project.status,
      target_amount: project.target_amount?.toString() || "",
      folder_id: project.folder_id || "",
    });
    setDialogOpen(true);
  };

  const resetProjectForm = () => {
    setEditingProject(null);
    setProjectForm({
      name: "",
      description: "",
      color: "#8b5cf6",
      status: "active",
      target_amount: "",
      folder_id: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const labels = {
      active: { text: "Ativo", className: "bg-success/10 text-success hover:bg-success/20" },
      paused: { text: "Pausado", className: "bg-warning/10 text-warning hover:bg-warning/20" },
      completed: { text: "Concluído", className: "bg-primary/10 text-primary hover:bg-primary/20" },
      archived: { text: "Arquivado", className: "bg-muted text-muted-foreground" },
    };

    const badgeInfo = labels[status as keyof typeof labels] || labels.active;

    return <Badge className={badgeInfo.className}>{badgeInfo.text}</Badge>;
  };

  const groupedProjects = folders.reduce((acc, folder) => {
    acc[folder.id] = projects.filter((p) => p.folder_id === folder.id);
    return acc;
  }, {} as Record<string, Project[]>);

  const ungroupedProjects = projects.filter((p) => !p.folder_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground mt-2">
            Organize suas finanças por projetos
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderOpen className="mr-2 h-4 w-4" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Pasta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFolderSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Nome</Label>
                  <Input
                    id="folder-name"
                    value={folderForm.name}
                    onChange={(e) =>
                      setFolderForm({ ...folderForm, name: e.target.value })
                    }
                    placeholder="Ex: Clientes, Pessoal..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folder-color">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="folder-color"
                      type="color"
                      value={folderForm.color}
                      onChange={(e) =>
                        setFolderForm({ ...folderForm, color: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={folderForm.color}
                      onChange={(e) =>
                        setFolderForm({ ...folderForm, color: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Criar Pasta
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetProjectForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? "Editar Projeto" : "Novo Projeto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Projeto</Label>
                  <Input
                    id="name"
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                    placeholder="Ex: Site Cliente X, Reforma Casa..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descreva o projeto..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value: any) =>
                        setProjectForm({ ...projectForm, status: value })
                      }
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

                  <div className="space-y-2">
                    <Label htmlFor="target">Meta (opcional)</Label>
                    <Input
                      id="target"
                      type="number"
                      step="0.01"
                      value={projectForm.target_amount}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          target_amount: e.target.value,
                        })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {folders.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="folder">Pasta (opcional)</Label>
                    <Select
                      value={projectForm.folder_id}
                      onValueChange={(value) =>
                        setProjectForm({ ...projectForm, folder_id: value })
                      }
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
                )}

                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={projectForm.color}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, color: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={projectForm.color}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, color: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingProject ? "Atualizar" : "Criar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetProjectForm();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 rounded-full p-6">
                <Target className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum projeto ainda</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Crie projetos para organizar suas transações e acompanhar o progresso de cada um.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {folders.map((folder) => {
            const folderProjects = groupedProjects[folder.id] || [];
            if (folderProjects.length === 0) return null;

            return (
              <div key={folder.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  <h2 className="text-xl font-bold">{folder.name}</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {folderProjects.map((project) => {
                    const stats = projectStats.get(project.id);
                    return (
                      <Card
                        key={project.id}
                        className="hover:shadow-lg transition-all"
                        style={{ borderLeftColor: project.color, borderLeftWidth: "4px" }}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              {project.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditProject(project)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                <Trash2 className="h-4 w-4 text-danger" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {getStatusBadge(project.status)}

                          {stats && (
                            <>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-success">
                                    Entradas: {formatCurrency(stats.total_income)}
                                  </span>
                                  <span className="text-danger">
                                    Saídas: {formatCurrency(stats.total_expense)}
                                  </span>
                                </div>
                                <div className="text-lg font-bold">
                                  Saldo: {formatCurrency(stats.net_amount)}
                                </div>
                              </div>

                              {stats.target && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Progresso</span>
                                    <span className="font-semibold">
                                      {stats.progress.toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress value={stats.progress} />
                                  <p className="text-xs text-muted-foreground">
                                    Meta: {formatCurrency(stats.target)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {ungroupedProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Sem Pasta</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ungroupedProjects.map((project) => {
                  const stats = projectStats.get(project.id);
                  return (
                    <Card
                      key={project.id}
                      className="hover:shadow-lg transition-all"
                      style={{ borderLeftColor: project.color, borderLeftWidth: "4px" }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProject(project)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {getStatusBadge(project.status)}

                        {stats && (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-success">
                                  Entradas: {formatCurrency(stats.total_income)}
                                </span>
                                <span className="text-danger">
                                  Saídas: {formatCurrency(stats.total_expense)}
                                </span>
                              </div>
                              <div className="text-lg font-bold">
                                Saldo: {formatCurrency(stats.net_amount)}
                              </div>
                            </div>

                            {stats.target && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Progresso</span>
                                  <span className="font-semibold">
                                    {stats.progress.toFixed(0)}%
                                  </span>
                                </div>
                                <Progress value={stats.progress} />
                                <p className="text-xs text-muted-foreground">
                                  Meta: {formatCurrency(stats.target)}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
