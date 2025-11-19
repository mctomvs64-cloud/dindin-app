import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Upload, FileText, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionFilters } from "@/components/Transactions/TransactionFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/components/Categories/CategoryManager";
import { transactionSchema } from "@/lib/validation";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedButton } from "@/components/AnimatedButton";
import { motion } from "framer-motion";
import ReactConfetti from "react-confetti";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  notes?: string;
  category_id?: string;
  project_id?: string;
  receipt_url?: string;
  categories?: {
    name: string;
    color: string;
  };
  projects?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

interface Project {
  id: string;
  name: string;
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

export default function TransactionsEnhanced() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);


  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    category_id: "",
    project_id: "",
    receipt: null as File | null,
  });

  useEffect(() => {
    if (user && currentWorkspace) {
      loadData();
    }
  }, [user, currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    try {
      const [transactionsRes, categoriesRes, projectsRes] = await Promise.all([
        supabase
          .from("transactions")
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
          .eq("workspace_id", currentWorkspace.id)
          .order("date", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", user?.id)
          .eq("workspace_id", currentWorkspace.id),
        supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", user?.id)
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "active")
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, transactionId: string) => {
    try {
      setUploadingFile(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${transactionId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("transactions")
        .update({ receipt_url: publicUrl })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do arquivo");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input data
    const validationResult = transactionSchema.safeParse({
      type: formData.type,
      amount: formData.amount,
      description: formData.description,
      date: formData.date,
      notes: formData.notes,
      category_id: formData.category_id || undefined,
      project_id: formData.project_id || undefined,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const transactionData = {
        user_id: user?.id,
        workspace_id: currentWorkspace?.id,
        type: validationResult.data.type,
        amount: validationResult.data.amount,
        description: validationResult.data.description,
        date: validationResult.data.date,
        notes: validationResult.data.notes || null,
        category_id: validationResult.data.category_id || null,
        project_id: validationResult.data.project_id || null,
      };

      let transactionId: string;

      if (editingTransaction) {
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        transactionId = editingTransaction.id;
        toast.success("Transação atualizada!");
      } else {
        const { data, error } = await supabase
          .from("transactions")
          .insert([transactionData])
          .select()
          .single();

        if (error) throw error;
        transactionId = data.id;
        toast.success("Transação criada!", {
          icon: '🎉',
          description: "Sua nova transação foi adicionada com sucesso!",
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Upload de recibo se houver
      if (formData.receipt) {
        await handleFileUpload(formData.receipt, transactionId);
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error("Erro ao salvar transação");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta transação?")) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Transação excluída!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      toast.error("Erro ao excluir transação");
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date,
      notes: transaction.notes || "",
      category_id: transaction.category_id || "",
      project_id: transaction.project_id || "",
      receipt: null,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      type: "expense",
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      category_id: "",
      project_id: "",
      receipt: null,
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedPeriod("month");
    setStartDate("");
    setEndDate("");
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de tipo
    if (selectedType !== "all") {
      filtered = filtered.filter((t) => t.type === selectedType);
    }

    // Filtro de categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category_id === selectedCategory);
    }

    // Filtro de período
    const now = new Date();
    if (selectedPeriod !== "all" && selectedPeriod !== "custom") {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date);
        switch (selectedPeriod) {
          case "today":
            return transactionDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return transactionDate >= weekAgo;
          case "month":
            return (
              transactionDate.getMonth() === now.getMonth() &&
              transactionDate.getFullYear() === now.getFullYear()
            );
          case "year":
            return transactionDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Filtro personalizado de datas
    if (selectedPeriod === "custom" && (startDate || endDate)) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date);
        if (startDate && transactionDate < new Date(startDate)) return false;
        if (endDate && transactionDate > new Date(endDate)) return false;
        return true;
      });
    }

    return filtered;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredTransactions = getFilteredTransactions();
  const filteredCategories = categories.filter((c) => c.type === formData.type);

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-10 w-1/3" />
        <SkeletonLoader className="h-6 w-1/2" />
        <SkeletonLoader className="h-40" />
        <div className="space-y-4">
          <SkeletonLoader className="h-24" count={3} />
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="transactions" className="space-y-8">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <TabsList>
        <TabsTrigger value="transactions">Transações</TabsTrigger>
        <TabsTrigger value="categories">Categorias</TabsTrigger>
      </TabsList>

      <TabsContent value="transactions" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas entradas e saídas
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
                Nova Transação
              </AnimatedButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Editar Transação" : "Nova Transação"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "income" | "expense") =>
                      setFormData({ ...formData, type: value, category_id: "" })
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
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Ex: Salário, Supermercado..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {filteredCategories.length > 0 && (
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
                        {filteredCategories.map((category) => (
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
                  <Label htmlFor="receipt">Recibo/Comprovante (opcional)</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receipt: e.target.files?.[0] || null,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Adicione observações..."
                  />
                </div>

                <div className="flex gap-2">
                  <AnimatedButton type="submit" className="flex-1" disabled={uploadingFile}>
                    {uploadingFile
                      ? "Enviando..."
                      : editingTransaction
                      ? "Atualizar"
                      : "Criar"}
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

        <TransactionFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          categories={categories}
          onReset={resetFilters}
        />

        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <DollarSign className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-lg font-semibold text-muted-foreground">
                {searchTerm || selectedType !== "all" || selectedCategory !== "all"
                  ? "Nenhuma transação encontrada com os filtros aplicados."
                  : "Nenhuma transação encontrada."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Nova Transação" para começar!
              </p>
              <AnimatedButton onClick={() => setDialogOpen(true)} className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Agora
              </AnimatedButton>
            </motion.div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  variants={itemVariants}
                  className="flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`p-3 rounded-xl ${
                        transaction.type === "income"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{transaction.description}</p>
                        {transaction.receipt_url && (
                          <a
                            href={transaction.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.categories?.name || "Sem categoria"}
                        {transaction.projects && ` • ${transaction.projects.name}`} •{" "}
                        {new Date(transaction.date).toLocaleDateString("pt-BR")}
                      </p>
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {transaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p
                      className={`text-xl font-bold ${
                        transaction.type === "income" ? "text-success" : "text-danger"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(transaction.amount))}
                    </p>
                    <div className="flex gap-2">
                      <AnimatedButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </AnimatedButton>
                      <AnimatedButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </AnimatedButton>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="categories">
        <CategoryManager />
      </TabsContent>
    </Tabs>
  );
}