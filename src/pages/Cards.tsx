import { CreditCard, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedButton } from "@/components/AnimatedButton";
import { motion } from "framer-motion";

export default function Cards() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartões</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie seus cartões de crédito
        </p>
      </div>

      <AnimatedCard>
        <CardContent className="text-center py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-4"
          >
            <div className="bg-primary/10 rounded-full p-6">
              <CreditCard className="h-12 w-12 text-primary" />
            </div>
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">Em breve</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            A funcionalidade de gerenciamento de cartões estará disponível em breve.
            Você poderá controlar limites, faturas e gastos por cartão.
          </p>
          <AnimatedButton className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Cartão
          </AnimatedButton>
        </CardContent>
      </AnimatedCard>
    </div>
  );
}