import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VideoInput = z.object({
  prompt: z.string().min(1).max(2000),
  style: z.enum(["Cinemático", "Timelapse", "Stop motion"]).default("Cinemático"),
});

export type VideoResult =
  | { ok: true; url: string; credits: number }
  | { ok: false; reason: "insufficient_credits" | "unauthorized" | "provider_error"; message: string };

const styleSuffix: Record<string, string> = {
  "Cinemático": ", cinematic camera movement, dramatic lighting, film grain, high detail",
  "Timelapse": ", timelapse, fast moving clouds and light changes, smooth motion",
  "Stop motion": ", stop motion animation style, handcrafted miniature look, slight frame jitter",
};

export const generateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => VideoInput.parse(input))
  .handler(async ({ data, context }): Promise<VideoResult> => {
    const { supabase } = context;

    const { data: newBalance, error: deductError } = await supabase.rpc("deduct_credits", { p_amount: 20 });
    if (deductError) {
      const insufficient = /insufficient|saldo|credit/i.test(deductError.message ?? "");
      return {
        ok: false,
        reason: insufficient ? "insufficient_credits" : "provider_error",
        message: insufficient
          ? "No te quedan créditos suficientes (necesitas 20 para un video). Recarga tu saldo."
          : "No se pudo descontar el crédito. Inténtalo de nuevo.",
      };
    }

    const apiKey = process.env["FAL_KEY"];
    if (!apiKey) {
      return { ok: false, reason: "provider_error", message: "El servicio de video no está configurado todavía." };
    }

    const fullPrompt = data.prompt + (styleSuffix[data.style] ?? "");

    try {
      const res = await fetch("https://fal.run/fal-ai/ltx-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[Fal.ai video]", res.status, detail.slice(0, 300));
        return { ok: false, reason: "provider_error", message: "No se pudo generar el video. Inténtalo de nuevo." };
      }

      const json = (await res.json()) as { video?: { url?: string }; videos?: { url?: string }[] };
      const url = json.video?.url ?? json.videos?.[0]?.url;
      if (!url) {
        return { ok: false, reason: "provider_error", message: "La IA no devolvió un video. Inténtalo de nuevo." };
      }

      return { ok: true, url, credits: typeof newBalance === "number" ? newBalance : 0 };
    } catch (error) {
      console.error("[Fal.ai video] fetch failed", error);
      return { ok: false, reason: "provider_error", message: "No se pudo contactar con el servicio de video. Revisa tu conexión." };
    }
  });
