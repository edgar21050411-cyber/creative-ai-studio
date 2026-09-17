import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ImageInput = z.object({
  prompt: z.string().min(1).max(2000),
  style: z.enum(["Cinematográfico", "Acuarela", "3D Render"]).default("Cinematográfico"),
});

export type ImageResult =
  | { ok: true; url: string; credits: number }
  | { ok: false; reason: "insufficient_credits" | "unauthorized" | "provider_error"; message: string };

const styleSuffix: Record<string, string> = {
  "Cinematográfico": ", cinematic lighting, dramatic atmosphere, high detail, 8k",
  "Acuarela": ", watercolor painting style, soft brushstrokes, artistic, pastel tones",
  "3D Render": ", 3D render, octane render, volumetric lighting, photorealistic, ultra detailed",
};

export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ImageInput.parse(input))
  .handler(async ({ data, context }): Promise<ImageResult> => {
    const { supabase } = context;

    const { data: newBalance, error: deductError } = await supabase.rpc("deduct_credits", { p_amount: 5 });
    if (deductError) {
      const insufficient = /insufficient|saldo|credit/i.test(deductError.message ?? "");
      return {
        ok: false,
        reason: insufficient ? "insufficient_credits" : "provider_error",
        message: insufficient
          ? "No te quedan créditos suficientes (necesitas 5 para una imagen). Recarga tu saldo."
          : "No se pudo descontar el crédito. Inténtalo de nuevo.",
      };
    }

    const { data: apiKey } = await supabase.rpc("get_api_secret", { p_key: "FAL_KEY" });
    if (!apiKey) {
      return { ok: false, reason: "provider_error", message: "El servicio de imágenes no está configurado todavía." };
    }

    const fullPrompt = data.prompt + (styleSuffix[data.style] ?? "");

    try {
      const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          image_size: "square_hd",
          num_inference_steps: 4,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[Fal.ai]", res.status, detail.slice(0, 300));
        return { ok: false, reason: "provider_error", message: "No se pudo generar la imagen. Inténtalo de nuevo." };
      }

      const json = (await res.json()) as { images?: { url?: string }[] };
      const url = json.images?.[0]?.url;
      if (!url) {
        return { ok: false, reason: "provider_error", message: "La IA no devolvió una imagen. Inténtalo de nuevo." };
      }

      return { ok: true, url, credits: typeof newBalance === "number" ? newBalance : 0 };
    } catch (error) {
      console.error("[Fal.ai] fetch failed", error);
      return { ok: false, reason: "provider_error", message: "No se pudo contactar con el servicio de imágenes. Revisa tu conexión." };
    }
  });
