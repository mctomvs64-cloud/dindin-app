import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Calendar, DollarSign, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { fixedBillSchema } from "@/lib/validation";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedButton } from "@/components/AnimatedButton";
import { motion } from "framer-motion";
import ReactConfetti from "react-confetti";

interface FixedBill {
  id: string;
  name: string;
  description?: string;
  amount: number;
  due_day: number;
  frequency: "monthly" | "yearly" | "custom";
  status: "pending" | "paid" | "overdue";
  auto_repeat: boolean;
  notify_before_days: number;
  receipt_url?: string;
  category_id?: string;
  categories?: {
    name: string;
    color: string;
  };
}

interface BillStats {
  total_bills: number;
  paid_bills: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_count: number;
  completion_percentage: number;
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

export default function FixedBills() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [bills, setBills] = useState<FixedBill[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<BillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);


  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    due_day: "1",
    frequency: "monthly" as "monthly" | "yearly" | "custom",
    auto_repeat: true,
    notify_before_days: "3",
    category_id: "",
  });

  useEffect(() => {
    if (user && currentWorkspace) {
      loadData();
    }
  }, [user, currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [billsRes, categoriesRes, statsRes] = await Promise.all([
        supabase
          .from("fixed_bills")
          .select(`
            *,
            categories (
              name,
              color
            )
          `)
          .eq("user_id", user?.id)
          .eq("workspace_id", currentWorkspace.id)
          .order("due_day", { ascending: true }),
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", user?.id)
          .eq("workspace_id", currentWorkspace.id)
          .eq("type", "expense"),
        supabase.rpc("calculate_monthly_bills_stats", {
          p_user_id: user?.id,
          p_month: month,
          p_year: year,
        }),
      ]);

      if (billsRes.error) throw billsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      
      setBills(billsRes.data || []);
      setCategories(categoriesRes.data || []);
      
      if (!statsRes.error && statsRes.data) {
        setStats(statsRes.data as unknown as BillStats);
      }
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
    const validationResult = fixedBillSchema.safeParse({
      name: formData.name,
      description: formData.description,
      amount: formData.amount,
      due_day: formData.due_day,
      frequency: formData.frequency,
      notify_before_days: formData.notify_before_days,
      auto_repeat: formData.auto_repeat,
      category_id: formData.category_id || undefined,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    try {
      const billData = {
        user_id: user?.id,
        workspace_id: currentWorkspace?.id,
        name: validationResult.data.name,
        description: validationResult.data.description || null,
        amount: validationResult.data.amount,
        due_day: validationResult.data.due_day,
        frequency: validationResult.data.frequency,
        auto_repeat: validationResult.data.auto_repeat,
        notify_before_days: validationResult.data.notify_before_days,
        category_id: validationResult.data.category_id || null,
        status: "pending" as const,
      };

      if (editingBill) {
        const { error } = await supabase
          .from("fixed_bills")
          .update(billData)
          .eq("id", editingBill.id);

        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase
          .from("fixed_bills")
          .insert([billData]);

        if (error) throw error;
        toast.success("Conta criada!", {
          icon: '🎉',
          description: "Sua nova conta fixa foi adicionada com sucesso!",
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      toast.error("Erro ao salvar conta");
    }
  };

  const handleMarkAsPaid = async (billId: string, amount: number) => {
    try {
      const now = new Date();
      
      // Registrar pagamento
      const { error: paymentError } = await supabase
        .from("bill_payments")
        .insert([{
          bill_id: billId,
          user_id: user?.id,
          workspace_id: currentWorkspace?.id,
          payment_date: now.toISOString().split("T")[0],
          amount_paid: amount,
        }]);

      if (paymentError) throw paymentError;

      // Atualizar status da conta
      const { error: updateError } = await supabase
        .from("fixed_bills")
        .update({ status: "paid" })
        .eq("id", billId);

      if (updateError) throw updateError;

      toast.success("Conta marcada como paga!", {
        icon: '✅',
        description: `R$ ${amount.toFixed(2)} pago com sucesso!`,
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      loadData();
    } catch (error) {
      console.error("Erro ao marcar como paga:", error);
      toast.error("Erro ao marcar como paga");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta conta?")) return;

    try {
      const { error } = await supabase
        .from("fixed_bills")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Conta excluída!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir conta");
    }
  };

  const handleEdit = (bill: FixedBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      description: bill.description || "",
      amount: bill.amount.toString(),
      due_day: bill.due_day.toString(),
      frequency: bill.frequency,
      auto_repeat: bill.auto_repeat,
      notify_before_days: bill.notify_before_days.toString(),
      category_id: bill.category_id || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBill(null);
    setFormData({
      name: "",
      description: "",
      amount: "",
      due_day: "1",
      frequency: "monthly",
      auto_repeat: true,
      notify_before_days: "3",
      category_id: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { text: "Pendente", className: "bg-warning/10 text-warning hover:bg-warning/20" },
      paid: { text: "Pago", className: "bg-success/10 text-success hover:bg-success/20" },
      overdue: { text: "Atrasado", className: "bg-danger/10 text-danger hover:bg-danger/20" },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    return <Badge className={badge.className}>{badge.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-10 w-1/3" />
        <SkeletonLoader className="h-6 w-1/2" />
        <div className="grid gap-4 md:grid-cols-4">
          <SkeletonLoader className="h-28" count={4} />
        </div>
        <SkeletonLoader className="h-40" />
        <div className="space-y-4">
          <SkeletonLoader className="h-24" count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Fixas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas despesas mensais recorrentes
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
            <AnimatedButton className="hover-lift">
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </AnimatedButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingBill ? "Editar Conta Fixa" : "Nova Conta Fixa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conta</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Aluguel, Energia, Internet..."
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
                  <Label htmlFor="due_day">Dia de Vencimento</Label>
                  <Select
                    value={formData.due_day}
                    onValueChange={(value) =>
                      setFormData({ ...formData, due_day: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Periodicidade</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Adicione observações..."
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-repeat">Repetição Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Renovar automaticamente todo mês
                  </p>
                </div>
                <Switch
                  id="auto-repeat"
                  checked={formData.auto_repeat}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_repeat: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notify">Notificar antes (dias)</Label>
                <Input
                  id="notify"
                  type="number"
                  value={formData.notify_before_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notify_before_days: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-2">
                <AnimatedButton type="submit" className="flex-1">
                  {editingBill ? "Atualizar" : "Criar"}
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

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <AnimatedCard className="hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Mensal</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_amount)}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard className="hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Já Pago</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(stats.paid_amount)}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard className="hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(stats.pending_amount)}
                  </p>
                </div>
                <div className="bg-warning/10 p-3 rounded-xl">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard className="hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atrasadas</p>
                  <p className="text-2xl font-bold text-danger">
                    {stats.overdue_count}
                  </p>
                </div>
                <div className="bg-danger/10 p-3 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-danger" />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      )}

      {stats && (
        <AnimatedCard className="hover-lift">
          <CardHeader>
            <CardTitle>Progresso do Mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>
                Contas Pagas: {stats.paid_bills} de {stats.total_bills}
              </span>
              <span className="font-semibold">
                {stats.completion_percentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={stats.completion_percentage} className="h-3" />
          </CardContent>
        </AnimatedCard>
      )}

      <div className="space-y-4">
        {bills.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <Calendar className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-muted-foreground">
              Nenhuma conta fixa cadastrada
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Adicione suas contas mensais recorrentes para melhor controle
              financeiro.
            </p>
            <AnimatedButton onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Conta
            </AnimatedButton>
          </motion.div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {bills.map((bill) => (
              <motion.div
                key={bill.id}
                variants={itemVariants}
                className={`hover-lift transition-all p-6 rounded-lg border ${
                  bill.status === "overdue" ? "border-danger" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`p-3 rounded-xl ${
                        bill.status === "paid"
                          ? "bg-success/10 text-success"
                          : bill.status === "overdue"
                          ? "bg-danger/10 text-danger"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {bill.status === "paid" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Calendar className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{bill.name}</p>
                        {getStatusBadge(bill.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bill.categories?.name || "Sem categoria"} • Vencimento
                        dia {bill.due_day}
                      </p>
                      {bill.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {bill.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {formatCurrency(bill.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {bill.frequency === "monthly"
                          ? "Mensal"
                          : bill.frequency === "yearly"
                          ? "Anual"
                          : "Personalizado"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {bill.status !== "paid" && (
                        <AnimatedButton
                          variant="outline"
                          size="icon"
                          className="text-success hover:bg-success/10"
                          onClick={() => handleMarkAsPaid(bill.id, bill.amount)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </AnimatedButton>
                      )}
                      <AnimatedButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(bill)}
                      >
                        <Pencil className="h-4 w-4" />
                      </AnimatedButton>
                      <AnimatedButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(bill.id)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </AnimatedButton>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}