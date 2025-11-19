import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ChevronDown, Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { toast } from "sonner";

const WORKSPACE_COLORS = [
  "#6366F1", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", 
  "#EC4899", "#14B8A6", "#F97316", "#06B6D4"
];

const WORKSPACE_ICONS = [
  "User", "Briefcase", "Home", "Building2", "TrendingUp", 
  "Wallet", "ShoppingBag", "Plane", "Heart"
];

export function WorkspaceSelector() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } = useWorkspace();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366F1",
    icon: "Briefcase",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("O nome do perfil é obrigatório.");
      return;
    }

    await createWorkspace(formData);
    setFormData({
      name: "",
      description: "",
      color: "#6366F1",
      icon: "Briefcase",
    });
    setIsDialogOpen(false);
  };

  if (!currentWorkspace) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <motion.div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: currentWorkspace.color }}
              animate={{ backgroundColor: currentWorkspace.color }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </motion.div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-sm truncate">{currentWorkspace.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentWorkspace.description || "Workspace"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => setCurrentWorkspace(workspace)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: workspace.color }}
              >
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1">{workspace.name}</span>
              {workspace.id === currentWorkspace.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DialogTrigger asChild>
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Novo Perfil</span>
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Perfil *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Empresa X, Freelance, Família..."
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional..."
              rows={2}
            />
          </div>

          <div>
            <Label>Cor do Perfil</Label>
            <div className="flex gap-2 mt-2">
              {WORKSPACE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: formData.color === color ? color : "transparent",
                    boxShadow: formData.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar Perfil</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}