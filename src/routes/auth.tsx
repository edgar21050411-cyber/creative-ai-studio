import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "VantaAI | Iniciar sesión" },
      { name: "description", content: "Accede a VantaAI para generar texto, imágenes y video con IA." },
      { property: "og:title", content: "VantaAI | Iniciar sesión" },
      { property: "og:description", content: "Accede a tu suite creativa de IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const ensureProfile = async (userId: string, userEmail: string) => {
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!data) {
      await supabase.from("profiles").insert({ id: userId, email: userEmail });
    }
  };

  const submit = async () => {
    if (busy) return;
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session && data.user) {
          await ensureProfile(data.user.id, data.user.email ?? email);
          navigate({ to: "/" });
        } else {
          setNotice("Revisa tu correo para confirmar la cuenta y después inicia sesión.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user.id, data.user.email ?? email);
        navigate({ to: "/" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setNotice(
        /invalid login/i.test(message)
          ? "Correo o contraseña incorrectos."
          : /already registered/i.test(message)
            ? "Ese correo ya tiene cuenta. Inicia sesión."
            : /password/i.test(message)
              ? "La contraseña debe tener al menos 6 caracteres."
              : "No se pudo completar el acceso. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="float-slow absolute -left-52 -top-64 size-[34rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="float-slower absolute -right-64 bottom-0 size-[38rem] rounded-full bg-accent/15 blur-[140px]" />
      </div>

      <div className="glass relative z-10 w-full max-w-sm rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-action font-display text-2xl font-bold">V</span>
          <h1 className="font-display text-2xl font-semibold">
            {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Accede a tu suite creativa de IA." : "Empieza con 50 créditos gratis."}
          </p>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Correo electrónico</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border border-border bg-overlay px-3.5 text-sm outline-none focus:border-primary/60"
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl border border-border bg-overlay px-3.5 text-sm outline-none focus:border-primary/60"
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          <Button type="submit" className="mt-1 h-11 w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "login" ? (
              <LogIn className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </Button>
        </form>

        {notice && <p role="status" className="mt-4 rounded-xl border border-border bg-overlay px-3.5 py-2.5 text-sm text-muted-foreground">{notice}</p>}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setNotice("");
          }}
          className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <Sparkles className="size-3.5 text-accent" />
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
