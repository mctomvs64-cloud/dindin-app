import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { goalSchema } from "@/lib/validation";

interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  period: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "cancelled";
  category_id?: string;
  project_id?: string;
  categories?: {
    name: string;
    color: string;
  };
  projects?: {
    name: string;
  };
}

export default function GoalsEnhanced() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    target_amount: "",
    current_amount: "0",
    period: "monthly" as "daily" | "weekly" | "monthly" | "yearly" | "custom",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    category_id: "",
    project_id: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [goalsRes, categoriesRes, projectsRes] = await Promise.all([
        supabase
          .from("goals")
          .select(`
            *,
            categories (
              name,
              color
            ),
            projects (
              name
            )
          `)
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", user?.id),
        supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", user?.id)
          .eq("status", "active"),
      ]);

      if (goalsRes.error) throw goalsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setGoals(goalsRes.data || []);
      setCategories(categoriesRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input data
    const validationResult = goalSchema.safeParse({
      name: formData.name,
      description: formData.description,
      target_amount: formData.target_amount,
      current_amount: formData.current_amount,
      period: formData.period,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      category_id: formData.category_id || undefined,
      project_id: formData.project_id || undefined,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const goalData = {
        user_id: user?.id,
        name: validationResult.data.name,
        description: validationResult.data.description || null,
        target_amount: validationResult.data.target_amount,
        current_amount: validationResult.data.current_amount,
        period: validationResult.data.period,
        start_date: validationResult.data.start_date,
        end_date: validationResult.data.end_date || null,
        category_id: validationResult.data.category_id || null,
        project_id: validationResult.data.project_id || null,
        status: "active" as const,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("goals")
          .update(goalData)
          .eq("id", editingGoal.id);

        if (error) throw error;
        toast.success("Meta atualizada!");
      } else {
        const { error } = await supabase
          .from("goals")
          .insert([goalData]);

        if (error) throw error;
        toast.success("Meta criada!");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta meta?")) return;

    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Meta excluída!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir meta:", error);
      toast.error("Erro ao excluir meta");
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || "",
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      period: goal.period,
      start_date: goal.start_date,
      end_date: goal.end_date || "",
      category_id: goal.category_id || "",
      project_id: goal.project_id || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingGoal(null);
    setFormData({
      name: "",
      description: "",
      target_amount: "",
      current_amount: "0",
      period: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      category_id: "",
      project_id: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { text: "Ativa", className: "bg-primary/10 text-primary hover:bg-primary/20" },
      completed: { text: "Concluída", className: "bg-success/10 text-success hover:bg-success/20" },
      cancelled: { text: "Cancelada", className: "bg-muted text-muted-foreground" },
    };

    const badge = badges[status as keyof typeof badges] || badges.active;
    return <Badge className={badge.className}>{badge.text}</Badge>;
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      daily: "Diária",
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
      custom: "Personalizada",
    };
    return labels[period as keyof typeof labels] || period;
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas Financeiras</h1>
          <p className="text-muted-foreground mt-2">
            Defina e acompanhe suas metas de economia e investimento
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="hover-lift">
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? "Editar Meta" : "Nova Meta"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Meta</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Viagem, Carro, Reserva de Emergência..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Valor Alvo</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, target_amount: e.target.value })
                    }
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current">Valor Atual</Label>
                  <Input
                    id="current"
                    type="number"
                    step="0.01"
                    value={formData.current_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, current_amount: e.target.value })
                    }
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, period: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Data Inicial</Label>
                  <Input
                    id="start"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end">Data Final (opcional)</Label>
                  <Input
                    id="end"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria (opcional)</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {projects.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="project">Projeto (opcional)</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, project_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva sua meta..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingGoal ? "Atualizar" : "Criar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 rounded-full p-6">
                <Target className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma meta ainda</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Defina suas metas financeiras e acompanhe o progresso de cada uma.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Metas Ativas</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeGoals.map((goal) => {
                  const progress = calculateProgress(
                    goal.current_amount,
                    goal.target_amount
                  );
                  const remaining = goal.target_amount - goal.current_amount;

                  return (
                    <Card
                      key={goal.id}
                      className="hover-lift transition-all"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(goal)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(goal.id)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(goal.status)}
                          <Badge variant="outline">{getPeriodLabel(goal.period)}</Badge>
                          {goal.categories && (
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: goal.categories.color,
                                color: goal.categories.color,
                              }}
                            >
                              {goal.categories.name}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-semibold">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-3" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {formatCurrency(goal.current_amount)}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(goal.target_amount)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Falta atingir:
                            </span>
                            <span className="font-bold text-lg">
                              {formatCurrency(remaining)}
                            </span>
                          </div>
                        </div>

                        {goal.end_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Prazo: {new Date(goal.end_date).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Metas Concluídas</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {completedGoals.map((goal) => {
                  const progress = calculateProgress(
                    goal.current_amount,
                    goal.target_amount
                  );

                  return (
                    <Card
                      key={goal.id}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {getStatusBadge(goal.status)}

                        <div className="space-y-2">
                          <Progress value={progress} className="h-3" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {formatCurrency(goal.current_amount)}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(goal.target_amount)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
