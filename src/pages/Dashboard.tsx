import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Target, Receipt, BarChart3, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from "recharts";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { AnimatedCard } from "@/components/AnimatedCard";
import { motion } from "framer-motion";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  category_id: string;
  categories?: {
    name: string;
    color: string;
  };
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  useEffect(() => {
    if (user && currentWorkspace) {
      loadTransactions();
    }
  }, [user, currentWorkspace]);

  const loadTransactions = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq("user_id", user?.id)
        .eq("workspace_id", currentWorkspace.id)
        .order("date", { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar transações do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactions: Transaction[]) => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    });
  };

  const getCategoryData = () => {
    const categoryMap = new Map<string, { name: string; value: number; color: string }>();

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const categoryName = t.categories?.name || "Sem categoria";
        const categoryColor = t.categories?.color || "#8884d8";
        const current = categoryMap.get(categoryName) || { name: categoryName, value: 0, color: categoryColor };
        categoryMap.set(categoryName, {
          ...current,
          value: current.value + Number(t.amount),
        });
      });

    return Array.from(categoryMap.values());
  };

  const getMonthlyData = () => {
    const monthlyMap = new Map<string, { month: string; income: number; expense: number }>();

    transactions.forEach((t) => {
      const month = new Date(t.date).toLocaleDateString("pt-BR", { month: "short" });
      const current = monthlyMap.get(month) || { month, income: 0, expense: 0 };

      if (t.type === "income") {
        current.income += Number(t.amount);
      } else {
        current.expense += Number(t.amount);
      }

      monthlyMap.set(month, current);
    });

    return Array.from(monthlyMap.values());
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonLoader className="h-32" />
          <SkeletonLoader className="h-32" />
          <SkeletonLoader className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonLoader className="h-80" />
          <SkeletonLoader className="h-80" />
        </div>
        <SkeletonLoader className="h-80" />
      </div>
    );
  }

  const categoryData = getCategoryData();
  const monthlyData = getMonthlyData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral das suas finanças
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Entradas"
          value={formatCurrency(stats.totalIncome)}
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard
          title="Saídas"
          value={formatCurrency(stats.totalExpense)}
          icon={TrendingDown}
          variant="danger"
        />
        <StatsCard
          title="Saldo"
          value={formatCurrency(stats.balance)}
          icon={Wallet}
          variant={stats.balance >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnimatedCard>
          <CardHeader>
            <CardTitle>Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="income" fill="hsl(var(--success))" name="Entradas" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="expense" fill="hsl(var(--danger))" name="Saídas" isAnimationActive={true} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={800}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </AnimatedCard>
      </div>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12 text-muted-foreground"
            >
              <Receipt className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-semibold">Nenhuma transação encontrada.</p>
              <p className="text-sm mt-2">Adicione sua primeira transação para começar!</p>
            </motion.div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {transactions.slice(0, 5).map((transaction) => (
                <motion.div
                  key={transaction.id}
                  variants={itemVariants}
                  className="flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        transaction.type === "income"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.categories?.name || "Sem categoria"} •{" "}
                        {new Date(transaction.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-bold ${
                      transaction.type === "income" ? "text-success" : "text-danger"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(Number(transaction.amount))}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );
}