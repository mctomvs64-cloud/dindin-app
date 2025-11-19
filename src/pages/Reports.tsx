import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Reports() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Análises detalhadas das suas finanças
        </p>
      </div>

      <Card>
        <CardContent className="text-center py-24">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 rounded-full p-6">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">Em breve</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Os relatórios financeiros estarão disponíveis em breve.
            Você poderá exportar em PDF, Excel e gerar análises automáticas com IA.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
