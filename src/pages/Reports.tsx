import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { AnimatedCard } from "@/components/AnimatedCard";
import { motion } from "framer-motion";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444"];

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

export default function Reports() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    avgIncome: 0,
    avgExpense: 0,
  });

  useEffect(() => {
    if (user && currentWorkspace) {
      loadReportData();
    }
  }, [user, currentWorkspace, selectedPeriod]);

  const loadReportData = async () => {
    if (!currentWorkspace) return;

    try {
      let startDate, endDate;
      const now = new Date();

      switch (selectedPeriod) {
        case "current":
          startDate = format(startOfMonth(now), "yyyy-MM-dd");
          endDate = format(endOfMonth(now), "yyyy-MM-dd");
          break;
        case "last":
          startDate = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
          endDate = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
          break;
        case "last3":
          startDate = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
          endDate = format(endOfMonth(now), "yyyy-MM-dd");
          break;
        case "last6":
          startDate = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");
          endDate = format(endOfMonth(now), "yyyy-MM-dd");
          break;
        default:
          startDate = format(startOfMonth(now), "yyyy-MM-dd");
          endDate = format(endOfMonth(now), "yyyy-MM-dd");
      }

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (name, color)
        `)
        .eq("user_id", user?.id)
        .eq("workspace_id", currentWorkspace.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (error) throw error;

      setTransactions(data || []);
      processReportData(data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do relatório.");
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (data: any[]) => {
    const income = data.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = data.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    const incomeCount = data.filter(t => t.type === "income").length;
    const expenseCount = data.filter(t => t.type === "expense").length;

    setStats({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      avgIncome: incomeCount > 0 ? income / incomeCount : 0,
      avgExpense: expenseCount > 0 ? expense / expenseCount : 0,
    });

    const categoryMap = new Map();
    data.filter(t => t.type === "expense").forEach(t => {
      const catName = t.categories?.name || "Sem categoria";
      const current = categoryMap.get(catName) || 0;
      categoryMap.set(catName, current + t.amount);
    });

    const catData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value: Number(value),
    }));
    setCategoryData(catData);

    const monthMap = new Map();
    data.forEach(t => {
      const month = format(new Date(t.date), "MMM/yy", { locale: ptBR });
      const current = monthMap.get(month) || { month, income: 0, expense: 0 };
      
      if (t.type === "income") {
        current.income += t.amount;
      } else {
        current.expense += t.amount;
      }
      
      monthMap.set(month, current);
    });

    setMonthlyData(Array.from(monthMap.values()));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-10 w-1/3" />
        <SkeletonLoader className="h-6 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader className="h-28" count={4} />
        </div>
        <SkeletonLoader className="h-96" />
        <SkeletonLoader className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="last">Mês Passado</SelectItem>
            <SelectItem value="last3">Últimos 3 Meses</SelectItem>
            <SelectItem value="last6">Últimos 6 Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média: {formatCurrency(stats.avgIncome)}
            </p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média: {formatCurrency(stats.avgExpense)}
            </p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Período</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.balance >= 0 ? "Positivo" : "Negativo"}
            </p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transações</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              No período selecionado
            </p>
          </CardContent>
        </AnimatedCard>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">
            <Calendar className="h-4 w-4 mr-2" />
            Mensal
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="h-4 w-4 mr-2" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <AnimatedCard>
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Entradas" fill="#10b981" isAnimationActive={true} animationDuration={800} />
                  <Bar dataKey="expense" name="Saídas" fill="#ef4444" isAnimationActive={true} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard>
            <CardHeader>
              <CardTitle>Tendência de Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={(data) => data.income - data.expense}
                    name="Saldo"
                    stroke="#6366f1"
                    strokeWidth={2}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatedCard>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsPie>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={800}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader>
                <CardTitle>Top Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {categoryData
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((cat, index) => (
                      <motion.div key={cat.name} variants={itemVariants} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{cat.name}</span>
                            <span className="text-sm font-semibold">
                              {formatCurrency(cat.value)}
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              className="h-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${(cat.value / stats.totalExpense) * 100}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </motion.div>
              </CardContent>
            </AnimatedCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}