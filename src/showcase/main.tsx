import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./showcase.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Versión mínima del paso 3: la sustituye el showcase completo del paso 4.
function Smoke() {
  const [theme, setTheme] = useState(new URLSearchParams(location.search).get("tema") === "claro" ? "theme-light" : "theme-dark");
  useEffect(() => {
    document.documentElement.classList.remove("theme-dark", "theme-light");
    document.documentElement.classList.add(theme);
  }, [theme]);
  return (
    <main className="flex h-full flex-col gap-4 overflow-auto p-8">
      <div className="flex gap-3">
        <Button onClick={() => setTheme(theme === "theme-dark" ? "theme-light" : "theme-dark")}>Cambiar tema</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="outline">Contorno</Button>
        <Button variant="destructive">Destructivo</Button>
        <Button variant="link">Enlace</Button>
      </div>
      <Input className="max-w-xs" placeholder="Campo de ejemplo" />
      <div className="flex gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir diálogo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Diálogo de ejemplo</DialogTitle>
              <DialogDescription>Contenido inventado para comprobar el tema.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Abrir menú</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Primera opción</DropdownMenuItem>
            <DropdownMenuItem>Segunda opción</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Smoke />
  </StrictMode>,
);
