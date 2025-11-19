import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace"; // Import useWorkspace
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedButton } from "@/components/AnimatedButton";
import { motion } from "framer-motion";
import ReactConfetti from "react-confetti";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
  workspace_id: string; // Adicionado workspace_id à interface
}

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

export function CategoryManager() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace(); // Usando o hook useWorkspace
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "Circle",
    color: "#6366f1",
    type: "expense" as "income" | "expense",
  });
  const [showConfetti, setShowConfetti] = useState(false);


  useEffect(() => {
    if (user && currentWorkspace) { // Garante que currentWorkspace esteja disponível
      loadCategories();
    }
  }, [user, currentWorkspace]); // Adicionado currentWorkspace às dependências

  const loadCategories = async () => {
    if (!currentWorkspace) return; // Verifica se há um perfil de trabalho selecionado
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user?.id)
        .eq("workspace_id", currentWorkspace.id) // Filtra por workspace_id
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Erro ao carregar categorias");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    if (!currentWorkspace) { // Garante que currentWorkspace esteja disponível antes de salvar
      toast.error("Nenhum perfil de trabalho selecionado. Por favor, selecione um perfil.");
      return;
    }

    try {
      const categoryData = {
        user_id: user?.id,
        workspace_id: currentWorkspace.id, // Inclui workspace_id
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
        type: formData.type,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!", {
          icon: '✏️',
          description: "As informações da categoria foram salvas.",
        });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([categoryData]);

        if (error) throw error;
        toast.success("Categoria criada!", {
          icon: '🏷️',
          description: "Sua nova categoria foi adicionada com sucesso!",
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      setDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma categoria com esse nome");
      } else {
        toast.error("Erro ao salvar categoria");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;
    if (!currentWorkspace) { // Verifica se há um perfil de trabalho selecionado
      toast.error("Nenhum perfil de trabalho selecionado.");
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id); // Garante que a exclusão seja restrita ao workspace

      if (error) throw error;
      toast.success("Categoria excluída!", {
        icon: '🗑️',
        description: "A categoria foi removida.",
      });
      loadCategories();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Erro ao excluir categoria");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || "Circle",
      color: category.color || "#6366f1",
      type: category.type,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      icon: "Circle",
      color: "#6366f1",
      type: "expense",
    });
  };

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Categorias</h2>
          <p className="text-muted-foreground">
            Personalize suas categorias de receitas e despesas
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
            <AnimatedButton>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </AnimatedButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Alimentação, Salário..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <AnimatedButton type="submit" className="flex-1">
                  {editingCategory ? "Atualizar" : "Criar"}
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </AnimatedButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AnimatedCard>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-success">
              Categorias de Entrada
            </h3>
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {incomeCategories.map((category) => (
                <motion.div
                  key={category.id}
                  variants={itemVariants}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <AnimatedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </AnimatedButton>
                    <AnimatedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </AnimatedButton>
                  </div>
                </motion.div>
              ))}
              {incomeCategories.length === 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-sm text-muted-foreground text-center py-4"
                >
                  Nenhuma categoria de entrada
                </motion.p>
              )}
            </motion.div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-danger">
              Categorias de Saída
            </h3>
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {expenseCategories.map((category) => (
                <motion.div
                  key={category.id}
                  variants={itemVariants}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <AnimatedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </AnimatedButton>
                    <AnimatedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </AnimatedButton>
                  </div>
                </motion.div>
              ))}
              {expenseCategories.length === 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-sm text-muted-foreground text-center py-4"
                >
                  Nenhuma categoria de saída
                </motion.p>
              )}
            </motion.div>
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  );
}