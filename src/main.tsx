import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { WorkspaceProvider } from "./hooks/useWorkspace";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </BrowserRouter>
);
