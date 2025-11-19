import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Cards() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartões</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie seus cartões de crédito
        </p>
      </div>

      <Card>
        <CardContent className="text-center py-24">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 rounded-full p-6">
              <CreditCard className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">Em breve</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            A funcionalidade de gerenciamento de cartões estará disponível em breve.
            Você poderá controlar limites, faturas e gastos por cartão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
