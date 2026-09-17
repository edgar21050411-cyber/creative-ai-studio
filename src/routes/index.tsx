import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Coins, Image as ImageIcon, Loader2, LogIn, LogOut, Menu, Play, Sparkles, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage } from "@/lib/chat.functions";

import lighthouseCinematic from "@/assets/lighthouse-cinematic.jpg";
import lighthouseWatercolor from "@/assets/lighthouse-watercolor.jpg";
import lighthouse3d from "@/assets/lighthouse-3d.jpg";
import videoNeonCity from "@/assets/video-neon-city.jpg";
import videoSkyline from "@/assets/video-skyline.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VantaAI | Suite creativa de IA" },
      { name: "description", content: "Crea texto, imágenes y video en una suite de IA visual y fluida." },
      { property: "og:title", content: "VantaAI | Suite creativa de IA" },
      { property: "og:description", content: "Una suite visual para crear texto, imágenes y video con IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Section = "texto" | "imagenes" | "video";

const sectionLabels: Record<Section, string> = {
  texto: "Texto",
  imagenes: "Imágenes",
  video: "Video",
};

function Index() {
  const [active, setActive] = useState<Section>("texto");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { role: "user", text: "Dame un titular para mi nueva app de finanzas." },
    { role: "assistant", text: "Claro. ¿Te va bien algo directo como “Tu dinero, en órbita” o prefieres un tono más cercano?" },
    { role: "user", text: "Más cercano, por favor." },
  ]);
  const [imagePrompt, setImagePrompt] = useState("Un faro solitario en una costa neblinosa, hora azul, reflejado en el agua");
  const [imageStyle, setImageStyle] = useState("Cinematográfico");
  const [videoPrompt, setVideoPrompt] = useState("Drone sobre una ciudad de neón bajo la lluvia, reflejos en las calles");
  const [videoStyle, setVideoStyle] = useState("Cinemático");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sending, setSending] = useState(false);
  const sendChat = useServerFn(sendChatMessage);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setLoggedIn(Boolean(session));
      if (!session) return;
      const { data: profile } = await supabase.from("profiles").select("credits").eq("id", session.user.id).maybeSingle();
      if (active && profile) setCredits(profile.credits);
    };
    void loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void loadProfile());
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const goTo = (section: Section) => {
    setActive(section);
    setMenuOpen(false);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || sending) return;
    if (!loggedIn) {
      showNotice("Inicia sesión para usar el chat de texto.");
      return;
    }
    setSending(true);
    setMessages((current) => [...current, { role: "user", text }]);
    setMessage("");
    try {
      const result = await sendChat({ data: { message: text, history: messages.slice(-20) } });
      if (result.ok) {
        setMessages((current) => [...current, { role: "assistant", text: result.reply }]);
        setCredits(result.credits);
      } else if (result.reason === "insufficient_credits") {
        setCredits(0);
        showNotice("No te quedan créditos. Recarga tu saldo para seguir generando.");
      } else {
        showNotice(result.message);
      }
    } catch {
      showNotice("Inicia sesión para usar el chat de texto.");
    } finally {
      setSending(false);
    }
  };

  const generate = (kind: "imagen" | "video") => {
    showNotice(`${kind === "imagen" ? "Imagen" : "Video"} preparado con el estilo seleccionado.`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="float-slow absolute -left-52 -top-64 size-[34rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="float-slower absolute -right-64 top-1/3 size-[38rem] rounded-full bg-accent/15 blur-[140px]" />
        <div className="absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_58%)]" />
      </div>

      <header className="sticky top-3 z-30 px-3 sm:top-4 sm:px-6">
        <nav className="glass mx-auto flex min-h-16 max-w-6xl items-center gap-3 rounded-2xl px-3 py-2 sm:px-5" aria-label="Navegación principal">
          <button onClick={() => goTo("texto")} className="flex items-center gap-2" aria-label="VantaAI, inicio">
            <span className="grid size-9 place-items-center rounded-xl bg-action font-display text-lg font-bold">V</span>
            <span className="hidden font-display text-lg font-semibold sm:block">Vanta<span className="text-muted-foreground">AI</span></span>
          </button>
          <div className="ml-3 hidden items-center gap-1 md:flex">
            {(["texto", "imagenes", "video"] as Section[]).map((item) => (
              <Button key={item} variant="ghost" size="sm" onClick={() => goTo(item)} className={active === item ? "bg-overlay-strong text-foreground" : ""}>
                {sectionLabels[item]}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-overlay px-2.5 text-xs sm:px-3 sm:text-sm">
              <Coins className="size-3.5 text-accent" /><span className="hidden xs:inline">Créditos:</span><b>{credits ?? 50}</b>
            </div>
            {loggedIn ? (
              <Button variant="ghost" className="h-9 rounded-full px-3 text-xs sm:px-4 sm:text-sm" onClick={() => void supabase.auth.signOut()}>
                <LogOut className="size-4" /><span className="hidden sm:inline">Salir</span>
              </Button>
            ) : (
              <Button className="h-9 rounded-full px-3 text-xs sm:px-4 sm:text-sm" onClick={() => navigate({ to: "/auth" })}>
                <LogIn className="size-4" /><span className="hidden sm:inline">Iniciar sesión</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú" onClick={() => setMenuOpen((open) => !open)}><Menu className="size-5" /></Button>
          </div>
          {menuOpen && <div className="glass absolute left-3 right-3 top-[4.5rem] grid gap-1 rounded-xl p-2 md:hidden">{(["texto", "imagenes", "video"] as Section[]).map((item) => <Button key={item} variant="ghost" onClick={() => goTo(item)}>{sectionLabels[item]}</Button>)}</div>}
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-9 pt-14 text-center sm:px-6 sm:pb-11 sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-overlay px-4 py-1.5 text-xs font-medium uppercase text-muted-foreground"><Sparkles className="size-3.5 text-accent" /> Suite creativa de IA</span>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-6xl">Crea <span className="text-gradient">texto, imágenes y video</span> con una sola IA.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">Una interfaz fluida para explorar tus ideas con libertad creativa. Escribe, imagina y genera.</p>
      </section>

      <main className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-[340px_1fr]">
        <section id="texto" className="glass flex min-h-[460px] scroll-mt-28 flex-col rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between px-1"><h2 className="font-display text-lg font-semibold">Texto</h2><span className="text-xs text-muted-foreground">Chat</span></div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((item, index) => <div key={`${item.role}-${index}`} className={item.role === "user" ? "ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-primary/60 px-4 py-2.5 text-sm" : "max-w-[88%] rounded-2xl rounded-bl-sm border border-border bg-overlay px-4 py-2.5 text-sm text-foreground/90"}>{item.text}</div>)}
          </div>
          <div className="mt-4 flex items-end gap-2 rounded-2xl border border-border bg-overlay px-3 py-2 focus-within:border-primary/60">
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={2} className="min-w-0 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground" placeholder="Escribe tu mensaje…" aria-label="Mensaje" />
            <Button variant="icon" size="icon" onClick={() => void sendMessage()} disabled={sending} aria-label="Enviar mensaje">{sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}</Button>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section id="imagenes" className="glass scroll-mt-28 rounded-3xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ImageIcon className="size-4 text-accent" /> Imágenes</h2><span className="text-xs text-muted-foreground">Generador</span></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} rows={3} className="flex-1 resize-none rounded-2xl border border-border bg-overlay px-4 py-3 text-sm outline-none focus:border-primary/60" aria-label="Descripción de imagen" />
              <div className="flex flex-col gap-2 sm:w-52">
                <select value={imageStyle} onChange={(event) => setImageStyle(event.target.value)} className="h-10 rounded-xl border border-border bg-secondary px-3 text-sm text-muted-foreground outline-none" aria-label="Estilo de imagen"><option>Cinematográfico</option><option>Acuarela</option><option>3D Render</option></select>
                <Button onClick={() => generate("imagen")} className="w-full"><Sparkles className="size-4" /> Generar</Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {[lighthouseCinematic, lighthouseWatercolor, lighthouse3d].map((src, index) => <img key={src} src={src} alt={["Faro cinematográfico entre niebla", "Faro pintado en acuarela", "Faro futurista en 3D"][index]} loading="lazy" width={816} height={816} className="aspect-square w-full rounded-xl object-cover ring-1 ring-border transition hover:scale-[1.02]" />)}
            </div>
          </section>

          <section id="video" className="glass scroll-mt-28 rounded-3xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Video className="size-4 text-accent" /> Video</h2><span className="text-xs text-muted-foreground">Generador</span></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea value={videoPrompt} onChange={(event) => setVideoPrompt(event.target.value)} rows={3} className="flex-1 resize-none rounded-2xl border border-border bg-overlay px-4 py-3 text-sm outline-none focus:border-primary/60" aria-label="Descripción de video" />
              <div className="flex flex-col gap-2 sm:w-52">
                <select value={videoStyle} onChange={(event) => setVideoStyle(event.target.value)} className="h-10 rounded-xl border border-border bg-secondary px-3 text-sm text-muted-foreground outline-none" aria-label="Estilo de video"><option>Cinemático</option><option>Timelapse</option><option>Stop motion</option></select>
                <Button onClick={() => generate("video")} className="w-full"><Play className="size-4" /> Generar video</Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[videoNeonCity, videoSkyline].map((src, index) => <div key={src} className="group relative overflow-hidden rounded-xl ring-1 ring-border"><img src={src} alt={index === 0 ? "Vista aérea de ciudad de neón" : "Horizonte futurista al atardecer"} loading="lazy" width={1280} height={720} className="aspect-video w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute inset-0 grid place-items-center bg-background/10"><span className="grid size-10 place-items-center rounded-full border border-foreground/30 bg-background/55 backdrop-blur"><Play className="ml-0.5 size-4" /></span></span></div>)}
            </div>
          </section>
        </div>
      </main>

      {notice && <div role="status" className="glass fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm shadow-2xl">{notice}</div>}
    </div>
  );
}