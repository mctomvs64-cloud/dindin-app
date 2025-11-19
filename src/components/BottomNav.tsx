import { NavLink } from "./NavLink";
import { LayoutDashboard, ArrowLeftRight, Receipt, FolderOpen, Settings } from "lucide-react";

export function BottomNav() {
  const navigation = [
    { name: "Dashboard", to: "/", icon: LayoutDashboard },
    { name: "Transações", to: "/transactions", icon: ArrowLeftRight },
    { name: "Caixa", to: "/daily-cash", icon: Receipt },
    { name: "Projetos", to: "/projects", icon: FolderOpen },
    { name: "Config", to: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.to === "/"}
            className="flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground hover:text-primary transition-colors"
            activeClassName="text-primary font-semibold"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
