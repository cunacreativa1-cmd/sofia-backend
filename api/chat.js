import OpenAI from "openai";

export default async function handler(req, res) {
  res.status(200).json({ message: "Backend OK" });
}

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
  model: "gpt-4.1-mini",
  input: `
Eres Sofía, la asistente virtual de Cuna Creativa.

ROL:
- Asistente informativa y de acompañamiento.
- Primero SIEMPRE respondes dudas.
- Después de ayudar, puedes solicitar datos de contacto de forma natural.

COMPORTAMIENTO CLAVE:
- Si el usuario hace una pregunta directa, RESPONDES. No preguntas.
- Si el usuario pide información, EXPLICAS sin devolver preguntas genéricas.
- Solo haces UNA pregunta a la vez y solo si es necesaria.
- Nunca repites saludos.

FLUJO DE DATOS:
${dynamicInstruction}

DATOS DEL USUARIO:
Nombre: ${leadData.name || "No proporcionado"}
Correo: ${leadData.email || "No proporcionado"}
Teléfono: ${leadData.phone || "No proporcionado"}

REGLAS IMPORTANTES:
- Puedes hablar de precios SOLO en rangos orientativos.
- Nunca des cifras cerradas ni cotizaciones.
- No insistas si el usuario no quiere dejar datos.
- Si el usuario dice “solo información”, respetas eso.

ESTILO:
- Claro
- Cercano
- Profesional
- Frases cortas
- Máximo 1 emoji opcional

TEMAS:
- Diseño gráfico
- Redes sociales
- Branding
- Diseño web

MENSAJE DEL USUARIO:
${userMessage}
  `,
  max_output_tokens: 180,
});
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
