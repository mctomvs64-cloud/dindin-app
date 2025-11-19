import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_default: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: Partial<Workspace>) => Promise<void>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);

  const loadWorkspaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;

      setWorkspaces(data || []);

      // Se não tem workspace atual, pega o padrão ou o primeiro
      if (!currentWorkspace && data && data.length > 0) {
        const defaultWs = data.find((w) => w.is_default) || data[0];
        const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
        const savedWs = data.find((w) => w.id === savedWorkspaceId);
        setCurrentWorkspaceState(savedWs || defaultWs);
      }
    } catch (error) {
      console.error("Erro ao carregar workspaces:", error);
      toast.error("Erro ao carregar perfis");
    }
  };

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    localStorage.setItem("currentWorkspaceId", workspace.id);
  };

  const createWorkspace = async (data: Partial<Workspace>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("workspaces").insert([
        {
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          color: data.color || "#6366F1",
          icon: data.icon || "Briefcase",
          is_default: false,
        },
      ]);

      if (error) throw error;

      toast.success("Perfil criado com sucesso!");
      await loadWorkspaces();
    } catch (error) {
      console.error("Erro ao criar workspace:", error);
      toast.error("Erro ao criar perfil");
    }
  };

  const updateWorkspace = async (id: string, data: Partial<Workspace>) => {
    try {
      const { error } = await supabase
        .from("workspaces")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      toast.success("Perfil atualizado!");
      await loadWorkspaces();
    } catch (error) {
      console.error("Erro ao atualizar workspace:", error);
      toast.error("Erro ao atualizar perfil");
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      const { error } = await supabase.from("workspaces").delete().eq("id", id);

      if (error) throw error;

      toast.success("Perfil excluído!");
      
      // Se deletou o workspace atual, muda para o padrão
      if (currentWorkspace?.id === id) {
        const defaultWs = workspaces.find((w) => w.is_default && w.id !== id);
        if (defaultWs) {
          setCurrentWorkspace(defaultWs);
        }
      }
      
      await loadWorkspaces();
    } catch (error) {
      console.error("Erro ao excluir workspace:", error);
      toast.error("Erro ao excluir perfil");
    }
  };

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        loadWorkspaces,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
