import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChatInput = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(40)
    .default([]),
});

export type ChatResult =
  | { ok: true; reply: string; credits: number }
  | { ok: false; reason: "insufficient_credits" | "unauthorized" | "provider_error"; message: string };

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }): Promise<ChatResult> => {
    const { supabase } = context;

    // 1. Descontar 1 crédito antes de procesar (falla si no hay saldo).
    const { data: newBalance, error: deductError } = await supabase.rpc("deduct_credits", { p_amount: 1 });
    if (deductError) {
      const insufficient = /insufficient|saldo|credit/i.test(deductError.message ?? "");
      return {
        ok: false,
        reason: insufficient ? "insufficient_credits" : "provider_error",
        message: insufficient
          ? "No te quedan créditos. Recarga tu saldo para seguir generando."
          : "No se pudo descontar el crédito. Inténtalo de nuevo.",
      };
    }

    // 2. Llamar a DeepInfra con el modelo Llama 3 70B Instruct.
    const apiKey = process.env["DEEPINFRA_API_KEY"];
    if (!apiKey) {
      return { ok: false, reason: "provider_error", message: "El servicio de IA no está configurado todavía." };
    }

    const messages = [
      { role: "system" as const, content: "Eres el asistente creativo de VantaAI. Respondes en español, de forma útil y concisa." },
      ...data.history.map((m) => ({ role: m.role as "user" | "assistant", content: m.text })),
      { role: "user" as const, content: data.message },
    ];

    try {
      const res = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "meta-llama/Meta-Llama-3-70B-Instruct", messages, max_tokens: 800 }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[DeepInfra]", res.status, detail.slice(0, 300));
        return { ok: false, reason: "provider_error", message: "La IA no respondió. Inténtalo de nuevo en unos segundos." };
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = json.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return { ok: false, reason: "provider_error", message: "La IA devolvió una respuesta vacía. Inténtalo de nuevo." };
      }

      return { ok: true, reply, credits: typeof newBalance === "number" ? newBalance : 0 };
    } catch (error) {
      console.error("[DeepInfra] fetch failed", error);
      return { ok: false, reason: "provider_error", message: "No se pudo contactar con la IA. Revisa tu conexión e inténtalo de nuevo." };
    }
  });
