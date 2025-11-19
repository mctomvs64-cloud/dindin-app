"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mic, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedButton } from "../AnimatedButton";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import ReactConfetti from "react-confetti";
import { supabase } from "@/integrations/supabase/client"; // Adicionando a importação do supabase

interface AIChatWindowProps {
  onClose: () => void;
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

interface Project {
  id: string;
  name: string;
}

const messageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function AIChatWindow({ onClose }: AIChatWindowProps) {
  const { chatHistory, sendMessage, isTyping, resetChat } = useAI();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [transactionFormData, setTransactionFormData] = useState<any>(null);
  const [goalFormData, setGoalFormData] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (user && currentWorkspace) {
      loadCategoriesAndProjects();
    }
  }, [user, currentWorkspace]);

  const loadCategoriesAndProjects = async () => {
    if (!currentWorkspace || !user) return;
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", currentWorkspace.id);

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("workspace_id", currentWorkspace.id)
      .eq("status", "active");

    if (categoriesError) console.error("Error loading categories:", categoriesError);
    if (projectsError) console.error("Error loading projects:", projectsError);

    setCategories(categoriesData || []);
    setProjects(projectsData || []);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputMessage.trim() === "") return;

    const userMessage = inputMessage;
    setInputMessage("");

    const aiResponse = await sendMessage(userMessage);

    if (typeof aiResponse === 'object' && aiResponse !== null && 'type' in aiResponse) {
      if (aiResponse.type === "CREATE_TRANSACTION") {
        setTransactionFormData(aiResponse.payload);
        setIsTransactionModalOpen(true);
      } else if (aiResponse.type === "CREATE_GOAL") {
        setGoalFormData(aiResponse.payload);
        setIsGoalModalOpen(true);
      } else if (aiResponse.type === "SHOW_DAILY_CASH_YESTERDAY") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split("T")[0];
        navigate(`/daily-cash?date=${yesterdayDate}`);
        onClose();
        toast.info("Navegando para o Caixa Diário de ontem.");
      }
    }
  };

  const handleSaveTransaction = async () => {
    if (!transactionFormData || !user || !currentWorkspace) return;

    try {
      const { error } = await supabase.from("transactions").insert([{
        user_id: user.id,
        workspace_id: currentWorkspace.id,
        ...transactionFormData,
        amount: parseFloat(transactionFormData.amount),
      }]);

      if (error) throw error;
      toast.success("Transação criada com sucesso!", {
        icon: '🎉',
        description: "DinDin registrou sua transação!",
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setIsTransactionModalOpen(false);
      resetChat();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error("Erro ao salvar transação.");
    }
  };

  const handleSaveGoal = async () => {
    if (!goalFormData || !user || !currentWorkspace) return;

    try {
      const { error } = await supabase.from("goals").insert([{
        user_id: user.id,
        workspace_id: currentWorkspace.id,
        ...goalFormData,
        target_amount: parseFloat(goalFormData.target_amount),
        current_amount: parseFloat(goalFormData.current_amount),
      }]);

      if (error) throw error;
      toast.success("Meta criada com sucesso!", {
        icon: '🎯',
        description: "DinDin criou sua nova meta!",
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setIsGoalModalOpen(false);
      resetChat();
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta.");
    }
  };

  const filteredCategories = categories.filter(c => c.type === transactionFormData?.type);

  return (
    <div className="flex h-full flex-col bg-background">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} gravity={0.1} />}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">DinDin AI</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col space-y-4">
          <AnimatePresence>
            {chatHistory.map((msg, index) => (
              <motion.div
                key={index}
                layout
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={messageVariants}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex w-fit max-w-[80%] flex-col rounded-lg p-3",
                  msg.sender === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <p className="text-sm">{msg.text}</p>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                layout
                initial="hidden"
                animate="visible"
                variants={messageVariants}
                transition={{ duration: 0.3 }}
                className="flex w-fit max-w-[80%] flex-col rounded-lg bg-muted p-3"
              >
                <p className="text-sm italic text-muted-foreground">DinDin está digitando...</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-4">
        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
          <Mic className="h-5 w-5" />
        </Button>
        <Input
          placeholder="Pergunte ao DinDin..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1"
          disabled={isTyping}
        />
        <Button type="submit" size="icon" disabled={isTyping}>
          <Send className="h-5 w-5" />
        </Button>
      </form>

      {/* Transaction Modal */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Transação</DialogTitle>
          </DialogHeader>
          {transactionFormData && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveTransaction(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={transactionFormData.type}
                  onValueChange={(value: "income" | "expense") =>
                    setTransactionFormData({ ...transactionFormData, type: value, category_id: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={transactionFormData.description}
                  onChange={(e) =>
                    setTransactionFormData({ ...transactionFormData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={transactionFormData.amount}
                    onChange={(e) =>
                      setTransactionFormData({ ...transactionFormData, amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={transactionFormData.date}
                    onChange={(e) =>
                      setTransactionFormData({ ...transactionFormData, date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {filteredCategories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria (opcional)</Label>
                  <Select
                    value={transactionFormData.category_id}
                    onValueChange={(value) =>
                      setTransactionFormData({ ...transactionFormData, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {projects.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="project">Projeto (opcional)</Label>
                  <Select
                    value={transactionFormData.project_id}
                    onValueChange={(value) =>
                      setTransactionFormData({ ...transactionFormData, project_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={transactionFormData.notes}
                  onChange={(e) =>
                    setTransactionFormData({ ...transactionFormData, notes: e.target.value })
                  }
                  placeholder="Adicione observações..."
                />
              </div>

              <div className="flex gap-2">
                <AnimatedButton type="submit" className="flex-1">
                  Salvar Transação
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={() => setIsTransactionModalOpen(false)}
                >
                  Cancelar
                </AnimatedButton>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Goal Modal */}
      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Meta</DialogTitle>
          </DialogHeader>
          {goalFormData && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveGoal(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Meta</Label>
                <Input
                  id="name"
                  value={goalFormData.name}
                  onChange={(e) =>
                    setGoalFormData({ ...goalFormData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Valor Alvo</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    value={goalFormData.target_amount}
                    onChange={(e) =>
                      setGoalFormData({ ...goalFormData, target_amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current">Valor Atual</Label>
                  <Input
                    id="current"
                    type="number"
                    step="0.01"
                    value={goalFormData.current_amount}
                    onChange={(e) =>
                      setGoalFormData({ ...goalFormData, current_amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select
                  value={goalFormData.period}
                  onValueChange={(value: any) =>
                    setGoalFormData({ ...goalFormData, period: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Data Inicial</Label>
                  <Input
                    id="start"
                    type="date"
                    value={goalFormData.start_date}
                    onChange={(e) =>
                      setGoalFormData({ ...goalFormData, start_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end">Data Final (opcional)</Label>
                  <Input
                    id="end"
                    type="date"
                    value={goalFormData.end_date}
                    onChange={(e) =>
                      setGoalFormData({ ...goalFormData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={goalFormData.description}
                  onChange={(e) =>
                    setGoalFormData({ ...goalFormData, description: e.target.value })
                  }
                  placeholder="Descreva sua meta..."
                />
              </div>

              <div className="flex gap-2">
                <AnimatedButton type="submit" className="flex-1">
                  Salvar Meta
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={() => setIsGoalModalOpen(false)}
                >
                  Cancelar
                </AnimatedButton>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}