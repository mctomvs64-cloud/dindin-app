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
  workspaceLoading: boolean; // Add loading state for workspaces
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth(); // Get auth loading state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true); // New loading state

  const loadWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setWorkspaceLoading(false);
      return;
    }

    setWorkspaceLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;

      setWorkspaces(data || []);

      // Determine current workspace
      let selectedWs: Workspace | null = null;
      if (data && data.length > 0) {
        const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
        selectedWs = data.find((w) => w.id === savedWorkspaceId) || data.find((w) => w.is_default) || data[0];
      }
      setCurrentWorkspaceState(selectedWs);
      
    } catch (error) {
      console.error("Erro ao carregar workspaces:", error);
      toast.error("Erro ao carregar perfis");
      setWorkspaces([]); // Clear workspaces on error
      setCurrentWorkspaceState(null); // Clear current workspace on error
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    localStorage.setItem("currentWorkspaceId", workspace.id);
  };

  const createWorkspace = async (data: Partial<Workspace>) => {
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    try {
      const { data: newWorkspace, error } = await supabase.from("workspaces").insert([
        {
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          color: data.color || "#6366F1",
          icon: data.icon || "Briefcase",
          is_default: false,
        },
      ]).select().single(); // Select the newly created workspace

      if (error) throw error;

      toast.success("Perfil criado com sucesso!");
      await loadWorkspaces(); // Reload all workspaces
      if (newWorkspace) {
        setCurrentWorkspace(newWorkspace); // Set the new workspace as current
      }
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
      // If the updated workspace is the current one, update its state
      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState((prev) => (prev ? { ...prev, ...data } : null));
      }
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
      
      // If deleted the current workspace, switch to default or first available
      if (currentWorkspace?.id === id) {
        const remainingWorkspaces = workspaces.filter(w => w.id !== id);
        const defaultWs = remainingWorkspaces.find((w) => w.is_default) || remainingWorkspaces[0];
        setCurrentWorkspaceState(defaultWs || null);
        if (defaultWs) {
          localStorage.setItem("currentWorkspaceId", defaultWs.id);
        } else {
          localStorage.removeItem("currentWorkspaceId");
        }
      }
      
      await loadWorkspaces(); // Reload to ensure UI is consistent
    } catch (error) {
      console.error("Erro ao excluir workspace:", error);
      toast.error("Erro ao excluir perfil");
    }
  };

  useEffect(() => {
    // Only load workspaces if auth is not loading and user state is known
    if (!authLoading) {
      loadWorkspaces();
    }
  }, [user, authLoading]); // Depend on user and authLoading

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
        workspaceLoading, // Provide the loading state
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