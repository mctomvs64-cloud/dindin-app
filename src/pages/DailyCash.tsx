import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, CreditCard, Smartphone, Trash2, Receipt, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashEntry {
  id: string;
  amount: number;
  description: string;
  payment_method: string;
  category_id?: string;
  entry_time: string;
  categories?: { name: string; color: string };
}

const QUICK_VALUES = [50, 100, 200, 500, 1000];

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro", icon: DollarSign },
  { value: "card", label: "Cartão", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Smartphone },
];

export default function DailyCash() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (user && currentWorkspace) {
      loadData();
    }
  }, [user, currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;

    try {
      const [entriesRes, categoriesRes] = await Promise.all([
        supabase
          .from("daily_cash_entries")
          .select(`
            *,
            categories (name, color)
          `)
          .eq("workspace_id", currentWorkspace.id)
          .eq("entry_date", today)
          .order("entry_time", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .eq("workspace_id", currentWorkspace.id)
          .eq("type", "income")
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setEntries(entriesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const addQuickEntry = async (amount: number) => {
    if (!currentWorkspace) return;

    try {
      const { error } = await supabase.from("daily_cash_entries").insert([{
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        amount,
        description: `Entrada rápida de R$ ${amount}`,
        payment_method: "cash",
        entry_date: today,
      }]);

      if (error) throw error;
      toast.success(`R$ ${amount} adicionado!`);
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao adicionar entrada");
    }
  };

  const addCustomEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !customAmount) return;

    try {
      const { error } = await supabase.from("daily_cash_entries").insert([{
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        amount: parseFloat(customAmount),
        description: description || "Entrada manual",
        payment_method: paymentMethod,
        category_id: categoryId || null,
        entry_date: today,
      }]);

      if (error) throw error;
      toast.success("Entrada adicionada!");
      setIsDialogOpen(false);
      setCustomAmount("");
      setDescription("");
      setCategoryId("");
      setPaymentMethod("cash");
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao adicionar entrada");
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("daily_cash_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Entrada excluída!");
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir entrada");
    }
  };

  const closeCash = async () => {
    if (!currentWorkspace || entries.length === 0) {
      toast.error("Não há entradas para fechar o caixa");
      return;
    }

    try {
      const totalCash = entries
        .filter(e => e.payment_method === "cash")
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalCard = entries
        .filter(e => e.payment_method === "card")
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalPix = entries
        .filter(e => e.payment_method === "pix")
        .reduce((sum, e) => sum + e.amount, 0);

      const { error } = await supabase.from("daily_cash_closures").insert([{
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        closure_date: today,
        total_amount: totalCash + totalCard + totalPix,
        total_cash: totalCash,
        total_card: totalCard,
        total_pix: totalPix,
        entries_count: entries.length,
      }]);

      if (error) throw error;
      toast.success("Caixa fechado com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao fechar caixa");
    }
  };

  const totalDay = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalCash = entries.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + e.amount, 0);
  const totalCard = entries.filter(e => e.payment_method === "card").reduce((sum, e) => sum + e.amount, 0);
  const totalPix = entries.filter(e => e.payment_method === "pix").reduce((sum, e) => sum + e.amount, 0);

  const getPaymentIcon = (method: string) => {
    const pm = PAYMENT_METHODS.find(p => p.value === method);
    return pm ? pm.icon : DollarSign;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Caixa Diário</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setIsDialogOpen(true)}>
            <Receipt className="h-4 w-4 mr-2" />
            Adicionar Entrada
          </Button>
          <Button 
            size="lg" 
            onClick={closeCash}
            disabled={entries.length === 0}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            <Lock className="h-4 w-4 mr-2" />
            Fechar Caixa
          </Button>
        </div>
      </div>

      {/* Valor Total Gigante */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Total do Dia
            </p>
            <p className="text-6xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              R$ {totalDay.toFixed(2)}
            </p>
            <div className="flex justify-center gap-6 pt-4">
              <div className="text-center">
                <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-xs text-muted-foreground">Dinheiro</p>
                <p className="text-lg font-semibold">R$ {totalCash.toFixed(2)}</p>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="text-center">
                <CreditCard className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <p className="text-xs text-muted-foreground">Cartão</p>
                <p className="text-lg font-semibold">R$ {totalCard.toFixed(2)}</p>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="text-center">
                <Smartphone className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                <p className="text-xs text-muted-foreground">PIX</p>
                <p className="text-lg font-semibold">R$ {totalPix.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Valores Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {QUICK_VALUES.map((value) => (
              <Button
                key={value}
                onClick={() => addQuickEntry(value)}
                size="lg"
                variant="outline"
                className="h-20 text-xl font-bold hover:bg-primary hover:text-primary-foreground transition-all"
              >
                + R$ {value}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Entradas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Entradas do Dia</span>
            <Badge variant="secondary" className="text-base">
              {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma entrada registrada hoje</p>
              <p className="text-sm">Adicione valores usando os botões rápidos acima</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const Icon = getPaymentIcon(entry.payment_method);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">
                            R$ {entry.amount.toFixed(2)}
                          </p>
                          {entry.categories && (
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: entry.categories.color,
                                color: entry.categories.color,
                              }}
                            >
                              {entry.categories.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-mono">
                            {entry.entry_time.substring(0, 5)}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{entry.description}</span>
                        </div>
                        <p className="sm:hidden text-sm text-muted-foreground mt-1">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Entrada Customizada */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Entrada</DialogTitle>
          </DialogHeader>
          <form onSubmit={addCustomEntry} className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Venda produto X"
              />
            </div>

            <div>
              <Label htmlFor="payment">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
