import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aplicar tema salvo ao carregar a aplicação
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
  document.documentElement.classList.add('dark');
} else if (savedDarkMode === null) {
  // Se não houver preferência salva, usar preferência do sistema
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
