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
import { toast } from "sonner";
import { DollarSign, CreditCard, Smartphone, Trash2, Check, Receipt } from "lucide-react";
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

const QUICK_VALUES = [20, 50, 100, 200, 500, 1000];

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
      setCustomAmount("");
      setDescription("");
      setCategoryId("");
      setPaymentMethod("cash");
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao adicionar entrada");
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Excluir esta entrada?")) return;

    try {
      const { error } = await supabase.from("daily_cash_entries").delete().eq("id", id);
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
      toast.error("Não há entradas para fechar");
      return;
    }

    if (!confirm("Fechar caixa do dia? Isso gerará um relatório e arquivará as entradas.")) return;

    try {
      const totalCash = entries.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + e.amount, 0);
      const totalCard = entries.filter(e => e.payment_method === "card").reduce((sum, e) => sum + e.amount, 0);
      const totalPix = entries.filter(e => e.payment_method === "pix").reduce((sum, e) => sum + e.amount, 0);

      const { error } = await supabase.from("daily_cash_closures").insert([{
        user_id: user?.id,
        workspace_id: currentWorkspace.id,
        closure_date: today,
        total_cash: totalCash,
        total_card: totalCard,
        total_pix: totalPix,
        total_amount: totalCash + totalCard + totalPix,
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

  const totalDay = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalCash = entries.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + e.amount, 0);
  const totalCard = entries.filter(e => e.payment_method === "card").reduce((sum, e) => sum + e.amount, 0);
  const totalPix = entries.filter(e => e.payment_method === "pix").reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-20 md:pb-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Caixa Diário</h1>
          <p className="text-muted-foreground">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
        {entries.length > 0 && (
          <Button onClick={closeCash} variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Fechar Caixa
          </Button>
        )}
      </div>

      {/* Total do Dia */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="pt-6">
          <p className="text-sm opacity-90 mb-1">Total do Dia</p>
          <p className="text-5xl font-bold">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalDay)}
          </p>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>Dinheiro: R$ {totalCash.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span>Cartão: R$ {totalCard.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" />
              <span>PIX: R$ {totalPix.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_VALUES.map((value) => (
              <Button
                key={value}
                onClick={() => addQuickEntry(value)}
                variant="outline"
                size="lg"
                className="h-16 text-lg font-semibold hover-scale"
              >
                R$ {value}
              </Button>
            ))}
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="w-full mt-3" size="lg">
            + Entrada Personalizada
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Entradas */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas de Hoje ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma entrada registrada hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(entry.amount)}
                      </span>
                      {entry.payment_method === "cash" && <DollarSign className="h-4 w-4 text-green-600" />}
                      {entry.payment_method === "card" && <CreditCard className="h-4 w-4 text-blue-600" />}
                      {entry.payment_method === "pix" && <Smartphone className="h-4 w-4 text-purple-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{entry.entry_time}</span>
                      {entry.categories && (
                        <Badge variant="outline" className="text-xs">
                          {entry.categories.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Entrada Personalizada */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Entrada</DialogTitle>
          </DialogHeader>
          <form onSubmit={addCustomEntry} className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Venda de produto X"
              />
            </div>

            <div>
              <Label htmlFor="payment">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
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
