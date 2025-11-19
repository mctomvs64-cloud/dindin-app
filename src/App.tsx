import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
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
import { AnimatePresence, motion } from "framer-motion";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  in: { opacity: 1, x: 0, scale: 1 },
  out: { opacity: 0, x: -20, scale: 0.98 },
};

const pageTransition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.3,
};

const App = () => {
  const location = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <Auth />
              </motion.div>
            } />
            <Route path="/" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <Dashboard />
              </motion.div>
            </Layout>} />
            <Route path="/transactions" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <TransactionsEnhanced />
              </motion.div>
            </Layout>} />
            <Route path="/daily-cash" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <DailyCash />
              </motion.div>
            </Layout>} />
            <Route path="/projects" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <Projects />
              </motion.div>
            </Layout>} />
            <Route path="/fixed-bills" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <FixedBills />
              </motion.div>
            </Layout>} />
            <Route path="/goals" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <GoalsEnhanced />
              </motion.div>
            </Layout>} />
            <Route path="/cards" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <Cards />
              </motion.div>
            </Layout>} />
            <Route path="/reports" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <Reports />
              </motion.div>
            </Layout>} />
            <Route path="/settings" element={<Layout>
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
              >
                <Settings />
              </motion.div>
            </Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;