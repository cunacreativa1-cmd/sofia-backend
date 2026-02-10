import OpenAI from "openai";

/**
 * 🔴 IMPORTANTE
 * NO usamos req.body
 * Leemos el body manualmente (Vercel serverless sin Next.js)
 */
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", err => reject(err));
  });
}

export default async function handler(req, res) {
  // =====================
  // CORS
  // =====================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY no definida");
    }

    // =====================
    // BODY REAL
    // =====================
    const body = await readBody(req);
    const userMessage = body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ message: "Mensaje vacío" });
    }

    // =====================
    // OpenAI
    // =====================
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Eres Sofía, la asistente de ventas de Cuna Creativa.

Tu rol principal es aclarar dudas y guiar a los usuarios hacia una cotización o contacto.
Tus respuestas son siempre cortas, claras y directas. Nunca escribes como blog ni das estrategias.

SOLO puedes hablar de:
- Diseño web: UX/UI, WordPress, frontend, backend, aplicaciones y software.
- Diseño gráfico: branding, identidad corporativa, diseño digital, diseño con IA e impresiones.

Si el usuario pregunta sobre cualquier otro tema:
- Respondes de forma cordial.
- Indicas que para más información debe contactar por WhatsApp.
- No desarrollas el tema.

REGLAS:
- No das precios, paquetes ni presupuestos.
- La información de costos solo se da por WhatsApp.
- No mencionas que eres una IA ni que usas ChatGPT.

Usuario: ${userMessage}`,
      max_output_tokens: 120,
    });

    // =====================
    // RESPUESTA SEGURA
    // =====================
    let reply = "";

    if (response.output_text) {
      reply = response.output_text;
    } else if (
      response.output?.[0]?.content?.[0]?.text
    ) {
      reply = response.output[0].content[0].text;
    }

    if (!reply) {
      reply = "¿Te gustaría que continuemos por WhatsApp?";
    }

    return res.status(200).json({ message: reply });

  } catch (error) {
    console.error("❌ BACKEND ERROR:", error);
    return res.status(500).json({
      message:
        "Estoy teniendo un problema técnico. ¿Prefieres que sigamos por WhatsApp?",
    });
  }
}
