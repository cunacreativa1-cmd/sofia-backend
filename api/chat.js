import OpenAI from "openai";

/**
 * Leer body manualmente (Vercel serverless)
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

  /* =====================
     CORS (OBLIGATORIO)
  ===================== */
  res.setHeader("Access-Control-Allow-Origin", "https://cunacreativa.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  // Preflight
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

    /* =====================
       BODY
    ===================== */
    const body = await readBody(req);
    const userMessage = body.message || "";
    const state = body.state || "inicio";

    const leadData = body.leadData || {
      name: null,
      email: null,
      phone: null
    };

    const userDeclinedData = body.userDeclinedData || false;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ message: "Mensaje vacío" });
    }

    /* =====================
       OPENAI CLIENT
    ===================== */
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    /* =====================
       INSTRUCCIÓN DINÁMICA
    ===================== */
    let dynamicInstruction = "";

    if (userDeclinedData) {
      dynamicInstruction =
        "El usuario no desea compartir datos. No los pidas y brinda solo información.";
    } else if (!leadData.name) {
      dynamicInstruction =
        "Después de responder y aclarar dudas, puedes pedir el nombre de forma natural.";
    } else if (!leadData.email) {
      dynamicInstruction =
        "Después de ayudar, puedes pedir el correo electrónico de forma opcional.";
    } else if (!leadData.phone) {
      dynamicInstruction =
        "Después de ayudar, puedes pedir el teléfono sin insistir.";
    } else {
      dynamicInstruction =
        "Ya cuentas con los datos. Continúa informando sin vender agresivamente.";
    }

    /* =====================
       OPENAI REQUEST
    ===================== */
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
Eres Sofía, la asistente virtual de Cuna Creativa.

ROL:
- Asistente informativa y de acompañamiento.
- Primero SIEMPRE respondes dudas.
- Luego, solo si es natural, solicitas datos de contacto.

COMPORTAMIENTO CLAVE:
- Si el usuario hace una pregunta directa, RESPONDES. No devuelves preguntas.
- Si el usuario pide información, EXPLICAS.
- No repites saludos.
- No presionas ventas.
- No insistes en WhatsApp.

FLUJO ACTUAL:
${dynamicInstruction}

DATOS ACTUALES:
Nombre: ${leadData.name || "No proporcionado"}
Correo: ${leadData.email || "No proporcionado"}
Teléfono: ${leadData.phone || "No proporcionado"}

REGLAS IMPORTANTES:
- Puedes mencionar precios solo como rangos orientativos.
- Nunca cotizaciones exactas.
- Si el usuario dice “solo información”, lo respetas.

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
      max_output_tokens: 200,
    });

    /* =====================
       RESPUESTA
    ===================== */
    let reply = "";

    if (response.output_text) {
      reply = response.output_text;
    } else if (response.output?.[0]?.content?.[0]?.text) {
      reply = response.output[0].content[0].text;
    }

    if (!reply) {
      reply = "Puedo ayudarte con información sobre nuestros servicios.";
    }

    return res.status(200).json({ message: reply });

  } catch (error) {
    console.error("❌ BACKEND ERROR:", error);

    return res.status(500).json({
      message:
        "Estoy teniendo un problema técnico en este momento. Intenta nuevamente en unos minutos.",
    });
  }
}
