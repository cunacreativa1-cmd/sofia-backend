import OpenAI from "openai";

/**
 * 🔴 IMPORTANTE
 * Leemos el body manualmente (Vercel serverless)
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
  res.setHeader("Access-Control-Allow-Origin", "https://cunacreativa.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

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
    // BODY
    // =====================
    const body = await readBody(req);
    const userMessage = body.message;
    const state = body.state || "inicio";
    const context = body.context || "";

    // 👉 datos del lead (vienen del frontend)
    const leadData = body.leadData || {
      name: null,
      email: null,
      phone: null
    };

    const userDeclinedData = body.userDeclinedData || false;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ message: "Mensaje vacío" });
    }

    // =====================
    // OpenAI
    // =====================
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // =====================
    // INSTRUCCIÓN DINÁMICA
    // =====================
    let dynamicInstruction = "";

    if (userDeclinedData) {
      dynamicInstruction =
        "El usuario NO desea compartir datos. No los pidas y brinda solo información general.";
    } else if (!leadData.name) {
      dynamicInstruction = "Pide el nombre del usuario de forma natural.";
    } else if (!leadData.email) {
      dynamicInstruction = "Pide el correo electrónico del usuario.";
    } else if (!leadData.phone) {
      dynamicInstruction = "Pide el teléfono del usuario.";
    } else {
      dynamicInstruction =
        "Ya tienes nombre, correo y teléfono. Ahora puedes compartir el WhatsApp.";
    }

    const response = await client.responses.create({
      model: "gpt-3.5-turbo",
      input: `
Eres Sofía, la asistente virtual de Cuna Creativa.

ROL:
- Actúas como asistente de atención y ventas ligera.
- Primero informas.
- Solo ofreces contacto cuando el usuario lo solicita o muestra interés claro.

REGLAS CLAVE:
- SOLO saludas en el primer mensaje.
- Nunca repites “Hola” después.
- No insistes en WhatsApp.
- Si el usuario dice que solo quiere información, respetas eso.
- No presionas ni persigues la venta.

TEMAS PERMITIDOS:
- Diseño gráfico (branding, identidad, diseño digital, redes sociales).
- Diseño web (UX/UI, WordPress, desarrollo).

PROHIBIDO:
- Precios.
- Paquetes.
- Cotizaciones.
- Repetir preguntas genéricas.

ESTILO:
- Claro.
- Natural.
- Conversacional.
- Frases cortas.
- Máximo 1 emoji opcional.

OBJETIVO:
Ayudar, informar y generar confianza.

MENSAJE DEL USUARIO:
${userMessage}
      `,
      max_output_tokens: 120,
    });

    // =====================
    // RESPUESTA
    // =====================
    let reply = "";

    if (response.output_text) {
      reply = response.output_text;
    } else if (response.output?.[0]?.content?.[0]?.text) {
      reply = response.output[0].content[0].text;
    }

    if (!reply) {
      reply = "¿En qué más puedo ayudarte?";
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
