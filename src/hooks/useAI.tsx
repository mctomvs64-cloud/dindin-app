import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkspace } from "./useWorkspace";
import { toast } from "sonner";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

interface AICommand {
  type: "CREATE_TRANSACTION" | "CREATE_GOAL" | "SHOW_DAILY_CASH_YESTERDAY" | "TEXT_RESPONSE";
  payload?: any;
}

const initialMessage: ChatMessage = {
  sender: "ai",
  text: "Oi! Eu sou o **DinDin**, seu assistente financeiro 24h. Pode mandar qualquer coisa que eu faço por você: gasto, pergunta, meta… só falar!",
};

export function useAI() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const savedHistory = localStorage.getItem("dindin_chat_history");
    return savedHistory ? JSON.parse(savedHistory) : [initialMessage];
  });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    localStorage.setItem("dindin_chat_history", JSON.stringify(chatHistory));
  }, [chatHistory]);

  const addMessage = useCallback((message: ChatMessage) => {
    setChatHistory((prev) => [...prev, message]);
  }, []);

  const resetChat = useCallback(() => {
    setChatHistory([initialMessage]);
    localStorage.removeItem("dindin_chat_history");
  }, []);

  const processMessage = useCallback(async (text: string): Promise<AICommand | string> => {
    const lowerText = text.toLowerCase();

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // --- Transaction Commands ---
    if (lowerText.includes("gastei") && lowerText.includes("reais")) {
      const amountMatch = lowerText.match(/(\d+([.,]\d{1,2})?)\s*reais/);
      const descriptionMatch = lowerText.match(/gastei\s*(\d+([.,]\d{1,2})?)\s*reais\s*(?:de|com)?\s*(.*?)(?:\s*no|\s*em|$)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
      const description = descriptionMatch && descriptionMatch[3] ? descriptionMatch[3].trim() : "Despesa";

      if (amount > 0) {
        return {
          type: "CREATE_TRANSACTION",
          payload: {
            type: "expense",
            amount: amount.toFixed(2),
            description: description.charAt(0).toUpperCase() + description.slice(1),
            date: new Date().toISOString().split("T")[0],
            category_id: "", // AI would infer this
            notes: "Registrado pelo DinDin",
          },
        };
      }
    } else if (lowerText.includes("recebi") && lowerText.includes("reais")) {
      const amountMatch = lowerText.match(/(\d+([.,]\d{1,2})?)\s*reais/);
      const descriptionMatch = lowerText.match(/recebi\s*(\d+([.,]\d{1,2})?)\s*reais\s*(?:do|de|da)?\s*(.*?)(?:\s*|$)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
      const source = descriptionMatch && descriptionMatch[3] ? descriptionMatch[3].trim() : "Receita";

      if (amount > 0) {
        return {
          type: "CREATE_TRANSACTION",
          payload: {
            type: "income",
            amount: amount.toFixed(2),
            description: `Receita de ${source.charAt(0).toUpperCase() + source.slice(1)}`,
            date: new Date().toISOString().split("T")[0],
            category_id: "", // AI would infer this
            notes: "Registrado pelo DinDin",
          },
        };
      }
    } else if (lowerText.includes("paguei o aluguel de")) {
      const amountMatch = lowerText.match(/paguei o aluguel de\s*(\d+([.,]\d{1,2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
      if (amount > 0) {
        return {
          type: "CREATE_TRANSACTION",
          payload: {
            type: "expense",
            amount: amount.toFixed(2),
            description: "Pagamento de Aluguel",
            date: new Date().toISOString().split("T")[0],
            category_id: "", // AI would infer this
            notes: "Registrado pelo DinDin",
          },
        };
      }
    }

    // --- Goal Commands ---
    else if (lowerText.includes("cria uma meta de juntar") && lowerText.includes("para") && lowerText.includes("até")) {
      const targetMatch = lowerText.match(/juntar\s*(\d+([.,]\d{1,2})?)/);
      const purposeMatch = lowerText.match(/para\s*(.*?)(?:\s*até|$)/);
      const endDateMatch = lowerText.match(/até\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2}|\w+\s*\d{4})/);

      const targetAmount = targetMatch ? parseFloat(targetMatch[1].replace(',', '.')) : 0;
      const purpose = purposeMatch ? purposeMatch[1].trim() : "um objetivo";
      let endDate = new Date().toISOString().split("T")[0]; // Default to today

      if (endDateMatch) {
        // Basic date parsing for mock. Real AI would be more robust.
        const dateStr = endDateMatch[1];
        if (dateStr.includes('/')) { // dd/mm/yyyy
          const parts = dateStr.split('/');
          if (parts.length === 3) endDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          else if (parts.length === 2) endDate = `${new Date().getFullYear()}-${parts[1]}-${parts[0]}`; // Assume current year
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { // yyyy-mm-dd
          endDate = dateStr;
        } else if (dateStr.includes('dezembro')) { // "dezembro"
          endDate = `${new Date().getFullYear()}-12-31`;
        }
      }

      if (targetAmount > 0 && purpose) {
        return {
          type: "CREATE_GOAL",
          payload: {
            name: `Juntar ${targetAmount.toFixed(2)} para ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}`,
            target_amount: targetAmount.toFixed(2),
            current_amount: "0",
            period: "custom", // AI would infer this
            start_date: new Date().toISOString().split("T")[0],
            end_date: endDate,
            description: `Meta para ${purpose}`,
          },
        };
      }
    }

    // --- Query Commands ---
    else if (lowerText.includes("quanto gastei com comida esse mês")) {
      // Mock data for now
      return {
        type: "TEXT_RESPONSE",
        payload: "Este mês você gastou **R$ 350,00** com comida. Isso está 10% acima da sua média. 📈",
      };
    } else if (lowerText.includes("estou quase batendo a meta de 5k")) {
      return {
        type: "TEXT_RESPONSE",
        payload: "Faltam só **R$ 380,00** para você bater a meta de 5k! Continue assim! 💪",
      };
    } else if (lowerText.includes("mostra o caixa de ontem")) {
      return {
        type: "SHOW_DAILY_CASH_YESTERDAY",
        payload: {},
      };
    }

    // --- Proactive/Alert Commands (Simulated Responses) ---
    else if (lowerText.includes("me avisa quando eu gastar mais de 150 por dia")) {
      return {
        type: "TEXT_RESPONSE",
        payload: "Entendido! Vou te avisar se seus gastos diários ultrapassarem **R$ 150,00**. 🔔",
      };
    }

    return {
      type: "TEXT_RESPONSE",
      payload: "Desculpe, não entendi. Pode reformular? Tente algo como 'Gastei 50 reais de gasolina' ou 'Cria uma meta de juntar 1000 para viagem'.",
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    addMessage({ sender: "user", text });
    setIsTyping(true);

    const aiResponse = await processMessage(text);

    setIsTyping(false);
    if (typeof aiResponse === 'string') {
      addMessage({ sender: "ai", text: aiResponse });
      return aiResponse;
    } else if (aiResponse.type === "TEXT_RESPONSE") {
      addMessage({ sender: "ai", text: aiResponse.payload });
      return aiResponse.payload;
    } else {
      // For structured commands, the UI will handle opening modals
      addMessage({ sender: "ai", text: `Ok, entendi! Preparando para ${aiResponse.type === "CREATE_TRANSACTION" ? "registrar sua transação" : "criar sua meta"}...` });
      return aiResponse;
    }
  }, [addMessage, processMessage]);

  // Simulate a proactive notification (can be triggered by a button for demo)
  const simulateProactiveNotification = useCallback((message: string, type: "success" | "warning" | "error" | "info" = "info") => {
    addMessage({ sender: "ai", text: message });
    toast[type](message);
  }, [addMessage]);

  useEffect(() => {
    // Example of a simulated proactive message on first load or after a delay
    const timer = setTimeout(() => {
      if (chatHistory.length === 1 && chatHistory[0].sender === "ai") { // Only show if no other messages
        simulateProactiveNotification("Olá! Que tal registrar suas despesas de hoje? 😉", "info");
      }
    }, 5000); // 5 seconds after app loads

    return () => clearTimeout(timer);
  }, [simulateProactiveNotification, chatHistory]);


  return { chatHistory, sendMessage, isTyping, resetChat, simulateProactiveNotification };
}