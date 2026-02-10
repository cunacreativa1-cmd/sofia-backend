import OpenAI from "openai";

export default async function handler(req, res) {
  // CORS
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

  let userMessage = "";

    if (typeof req.body === "string") {
      const parsed = JSON.parse(req.body);
      userMessage = parsed.message;
    } else {
      userMessage = req.body?.message;
    }

    if (!userMessage) {
      return res.status(400).json({ message: "Mensaje vacío" });
    }

    if (!userMessage) {
      return res.status(400).json({ message: "Mensaje vacío" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

   const response = await client.responses.create({
     model: "gpt-4o-mini",
     input: [
       {
         role: "system",
         content: [
           {
             type: "text",
             text: `Eres Sofía, la asistente de ventas de Cuna Creativa.

   Tu rol principal es aclarar dudas y guiar a los usuarios hacia una cotización o contacto.
   Tus respuestas son siempre cortas, claras y directas. Nunca escribes como blog ni das estrategias.

   SOLO puedes hablar de:
   - Diseño web: UX/UI, WordPress, frontend, backend, aplicaciones y software.
   - Diseño gráfico: branding, identidad corporativa, diseño digital, diseño con IA e impresiones.

   Si el usuario pregunta sobre cualquier otro tema:
   - Respondes de forma cordial.
   - Indicas que para más información debe contactar por WhatsApp.
   - No desarrollas el tema.

   COMPORTAMIENTO:
   - Actúas como asistente de ventas, no como consultora.
   - Primero aclaras dudas básicas.
   - Luego explicas brevemente por qué Cuna Creativa es una buena solución.
   - Después preguntas si desean cotizar.

   REGLAS:
   - No das precios, paquetes ni presupuestos.
   - La información de costos solo se da por WhatsApp.
   - Si el usuario acepta cotizar, solicitas: nombre, correo y teléfono.
   - Si no desea dejar datos, no insistes.
   - Los rechazos siempre son cordiales.
   - No mencionas que eres una IA ni que usas ChatGPT.`
           }
         ]
       },
       {
         role: "user",
         content: [
           {
             type: "text",
             text: userMessage
           }
         ]
       }
     ],
     max_output_tokens: 120
   });

    const reply =
      response.output_text ||
      "¿Te gustaría que continuemos por WhatsApp?";

    return res.status(200).json({ message: reply });

  } catch (error) {
    console.error("❌ BACKEND ERROR:", error);
    return res.status(500).json({
      message:
        "Estoy teniendo un problema técnico. ¿Prefieres que sigamos por WhatsApp?",
    });
  }
}
