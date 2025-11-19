import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TransactionsEnhanced from "./pages/TransactionsEnhanced";
import Projects from "./pages/Projects";
import FixedBills from "./pages/FixedBills";
import GoalsEnhanced from "./pages/GoalsEnhanced";
import Cards from "./pages/Cards";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DailyCash from "./pages/DailyCash";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/transactions" element={<Layout><TransactionsEnhanced /></Layout>} />
        <Route path="/daily-cash" element={<Layout><DailyCash /></Layout>} />
        <Route path="/projects" element={<Layout><Projects /></Layout>} />
        <Route path="/fixed-bills" element={<Layout><FixedBills /></Layout>} />
        <Route path="/goals" element={<Layout><GoalsEnhanced /></Layout>} />
        <Route path="/cards" element={<Layout><Cards /></Layout>} />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
