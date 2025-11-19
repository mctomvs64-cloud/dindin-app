import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, workspace_id, startDate, endDate, format } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: transactions, error } = await supabaseClient
      .from("transactions")
      .select(`
        id,
        type,
        amount,
        description,
        date,
        notes,
        categories (name),
        projects (name)
      `)
      .eq("user_id", user_id)
      .eq("workspace_id", workspace_id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      return new Response("Nenhum dado encontrado para o período selecionado.", {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 404,
      });
    }

    let fileContent: string;
    let contentType: string;
    let filename: string;

    if (format === "csv") {
      const headers = ["ID", "Tipo", "Valor", "Descrição", "Data", "Notas", "Categoria", "Projeto"];
      const rows = transactions.map(t => [
        t.id,
        t.type === "income" ? "Entrada" : "Saída",
        t.amount.toFixed(2),
        t.description,
        t.date,
        t.notes || "",
        t.categories?.name || "Sem categoria",
        t.projects?.name || "Sem projeto",
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")); // CSV escape
      
      fileContent = [headers.join(","), ...rows].join("\n");
      contentType = "text/csv";
      filename = `relatorio_transacoes_${startDate}_${endDate}.csv`;
    } else if (format === "pdf") {
      // Simple text-based PDF content
      fileContent = `Relatório de Transações\n\n`;
      fileContent += `Período: ${startDate} a ${endDate}\n\n`;
      fileContent += `--------------------------------------------------\n`;
      transactions.forEach(t => {
        fileContent += `ID: ${t.id}\n`;
        fileContent += `Tipo: ${t.type === "income" ? "Entrada" : "Saída"}\n`;
        fileContent += `Valor: R$ ${t.amount.toFixed(2)}\n`;
        fileContent += `Descrição: ${t.description}\n`;
        fileContent += `Data: ${t.date}\n`;
        fileContent += `Categoria: ${t.categories?.name || "Sem categoria"}\n`;
        fileContent += `Projeto: ${t.projects?.name || "Sem projeto"}\n`;
        if (t.notes) fileContent += `Notas: ${t.notes}\n`;
        fileContent += `--------------------------------------------------\n`;
      });
      fileContent += `\nEste é um PDF de texto simples. Para relatórios com layout avançado, considere usar um serviço de geração de PDF de terceiros.`;
      
      contentType = "application/pdf"; // Browser will attempt to open as PDF
      filename = `relatorio_transacoes_${startDate}_${endDate}.pdf`;
    } else {
      return new Response("Formato de arquivo não suportado.", {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 400,
      });
    }

    return new Response(fileContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});