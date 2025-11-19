import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WorkspaceProvider } from "./hooks/useWorkspace";

createRoot(document.getElementById("root")!).render(
  <WorkspaceProvider>
    <App />
  </WorkspaceProvider>
);
