import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Target, TrendingUp, Pencil, Trash2, X } from "lucide-react";
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
import { projectSchema, folderSchema } from "@/lib/validation";
import * as LucideIcons from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  status: "active" | "paused" | "completed" | "archived";
  target_amount?: number;
  folder_id?: string;
  folders?: { name: string };
  tags?: string[];
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

const FOLDER_COLORS = [
  "#6366F1", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", 
  "#EC4899", "#14B8A6", "#F97316", "#06B6D4"
];

const FOLDER_ICONS = [
  "Folder", "Briefcase", "Home", "Book", "Target", "DollarSign", "Plane", "Heart", "Star", "Tag"
];

const PROJECT_ICONS = [
  "Target", "Briefcase", "Home", "DollarSign", "TrendingUp", "Wallet", "ShoppingBag", "Plane", "Heart", "Lightbulb"
];

export default function Projects() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, ProjectStats>>(new Map());
  const [loading, setLoading] = useState(true);

  // Project Dialog States
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    color: "#8b5cf6",
    icon: "Target",
    status: "active" as "active" | "paused" | "completed" | "archived",
    target_amount: "",
    folder_id: "",
    tags: [] as string[],
    newTag: "",
  });

  // Folder Dialog States
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
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

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    const validationResult = projectSchema.safeParse({
      name: projectForm.name,
      description: projectForm.description,
      color: projectForm.color,
      icon: projectForm.icon,
      status: projectForm.status,
      target_amount: projectForm.target_amount,
      folder_id: projectForm.folder_id,
      tags: projectForm.tags,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const projectData = {
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        name: validationResult.data.name,
        description: validationResult.data.description || null,
        color: validationResult.data.color,
        icon: validationResult.data.icon || "Target",
        status: validationResult.data.status,
        target_amount: validationResult.data.target_amount ? parseFloat(validationResult.data.target_amount.toString()) : null,
        folder_id: validationResult.data.folder_id || null,
        tags: validationResult.data.tags || [],
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

      setProjectDialogOpen(false);
      resetProjectForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
      toast.error("Erro ao salvar projeto");
    }
  };

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    const validationResult = folderSchema.safeParse({
      name: folderForm.name,
      color: folderForm.color,
      icon: folderForm.icon,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const folderData = {
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        name: validationResult.data.name,
        color: validationResult.data.color,
        icon: validationResult.data.icon || "Folder",
      };

      if (editingFolder) {
        const { error } = await supabase
          .from("folders")
          .update(folderData)
          .eq("id", editingFolder.id);

        if (error) throw error;
        toast.success("Pasta atualizada!");
      } else {
        const { error } = await supabase
          .from("folders")
          .insert([folderData]);

        if (error) throw error;
        toast.success("Pasta criada!");
      }

      setFolderDialogOpen(false);
      resetFolderForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar pasta:", error);
      toast.error("Erro ao salvar pasta");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Deseja realmente excluir este projeto?")) return;

    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Projeto excluído!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      toast.error("Erro ao excluir projeto");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta pasta? Todos os projetos dentro dela ficarão sem pasta.")) return;

    try {
      // First, update projects that reference this folder to set folder_id to null
      const { error: updateProjectsError } = await supabase
        .from("projects")
        .update({ folder_id: null })
        .eq("folder_id", id);

      if (updateProjectsError) throw updateProjectsError;

      // Then, delete the folder
      const { error: deleteFolderError } = await supabase
        .from("folders")
        .delete()
        .eq("id", id);

      if (deleteFolderError) throw deleteFolderError;

      toast.success("Pasta excluída!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir pasta:", error);
      toast.error("Erro ao excluir pasta");
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description || "",
      color: project.color,
      icon: project.icon || "Target",
      status: project.status,
      target_amount: project.target_amount?.toString() || "",
      folder_id: project.folder_id || "",
      tags: project.tags || [],
      newTag: "",
    });
    setProjectDialogOpen(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderForm({
      name: folder.name,
      color: folder.color,
      icon: folder.icon || "Folder",
    });
    setFolderDialogOpen(true);
  };

  const resetProjectForm = () => {
    setEditingProject(null);
    setProjectForm({
      name: "",
      description: "",
      color: "#8b5cf6",
      icon: "Target",
      status: "active",
      target_amount: "",
      folder_id: "",
      tags: [],
      newTag: "",
    });
  };

  const resetFolderForm = () => {
    setEditingFolder(null);
    setFolderForm({
      name: "",
      color: "#6366f1",
      icon: "Folder",
    });
  };

  const getProjectsByFolder = (folderId?: string) => {
    return projects.filter(p => p.folder_id === (folderId || null));
  };

  const addTag = () => {
    if (projectForm.newTag.trim() && !projectForm.tags.includes(projectForm.newTag.trim())) {
      setProjectForm({
        ...projectForm,
        tags: [...projectForm.tags, projectForm.newTag.trim()],
        newTag: "",
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProjectForm({
      ...projectForm,
      tags: projectForm.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const stats = projectStats.get(project.id);
    const progress = stats?.progress || 0;
    const netAmount = stats?.net_amount || 0;
    const target = stats?.target || 0;
    const ProjectIcon = (LucideIcons as any)[project.icon || "Target"];

    return (
      <Card className="hover:shadow-lg transition-all duration-200 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: project.color }}
              >
                {ProjectIcon && <ProjectIcon className="h-6 w-6 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {STATUS_LABELS[project.status]}
                  </Badge>
                  {project.folders && (
                    <Badge variant="outline" className="text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {project.folders.name}
                    </Badge>
                  )}
                  {project.tags && project.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <LucideIcons.Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Dialog
            open={folderDialogOpen}
            onOpenChange={(open) => {
              setFolderDialogOpen(open);
              if (!open) resetFolderForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderOpen className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFolder ? "Editar Pasta" : "Criar Nova Pasta"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFolderSubmit} className="space-y-4">
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
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFolderForm({ ...folderForm, color })}
                        className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: folderForm.color === color ? color : "transparent",
                          boxShadow: folderForm.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Ícone</Label>
                  <Select
                    value={folderForm.icon}
                    onValueChange={(value) => setFolderForm({ ...folderForm, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {FOLDER_ICONS.map((iconName) => {
                        const Icon = (LucideIcons as any)[iconName];
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              {iconName}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingFolder ? "Atualizar Pasta" : "Criar Pasta"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={projectDialogOpen}
            onOpenChange={(open) => {
              setProjectDialogOpen(open);
              if (!open) resetProjectForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Editar Projeto" : "Criar Novo Projeto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
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
                  <Label>Ícone</Label>
                  <Select
                    value={projectForm.icon}
                    onValueChange={(value) => setProjectForm({ ...projectForm, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {PROJECT_ICONS.map((iconName) => {
                        const Icon = (LucideIcons as any)[iconName];
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              {iconName}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label>Tags (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {projectForm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => removeTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar nova tag"
                      value={projectForm.newTag}
                      onChange={(e) => setProjectForm({ ...projectForm, newTag: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag}>Adicionar</Button>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingProject ? "Atualizar Projeto" : "Criar Projeto"}
                </Button>
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
            const FolderIcon = (LucideIcons as any)[folder.icon || "Folder"];

            return (
              <AccordionItem
                key={folder.id}
                value={folder.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: folder.color }}
                    >
                      {FolderIcon && <FolderIcon className="h-5 w-5 text-white" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{folder.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {folderProjects.length} {folderProjects.length === 1 ? "projeto" : "projetos"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
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

      {projects.length === 0 && folders.length === 0 && (
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