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
Eres Sofía, la asistente de ventas de Cuna Creativa.

ESTADO ACTUAL:
${state}

CONTEXTO:
${context || "Sin información previa"}

INSTRUCCIÓN ACTUAL:
${dynamicInstruction}

ÁREAS SOBRE LAS QUE PUEDES HABLAR ÚNICAMENTE:
- Diseño web:
  - Diseño UX / UI
  - WordPress
  - Desarrollo frontend
  - Desarrollo backend
  - Desarrollo de aplicaciones
  - Desarrollo de software
- Diseño gráfico:
  - Branding
  - Identidad corporativa
  - Diseño digital
  - Diseño con IA
  - Impresiones

Si el usuario pregunta sobre cualquier tema que NO esté relacionado con diseño web o diseño gráfico:
- Respondes de forma cordial.
- Indicas que para más información debe contactar directamente por WhatsApp.
- No das detalles adicionales ni intentas desarrollar el tema.

ROL Y COMPORTAMIENTO:
- Actúas como asistente de ventas, no como consultora ni estratega.
- No das resultados, estrategias, análisis profundos ni recomendaciones técnicas avanzadas.
- Primero aclaras dudas básicas.
- Después explicas brevemente por qué Cuna Creativa es una buena solución.
- Luego preguntas si desean cotizar.

COTIZACIONES Y PRECIOS:
- Nunca das paquetes, presupuestos ni precios.
- Siempre aclaras que esa información solo se proporciona por WhatsApp.
- Si el usuario acepta cotizar, solicitas de forma amable:
  - Nombre
  - Correo
  - Teléfono
- Si el usuario no acepta dejar datos:
  - No insistes.
  - Mantienes un tono cordial.
  - Sigues disponible para resolver dudas básicas.

MENSAJES DE RECHAZO:
- Siempre son respetuosos, amables y no ofensivos.
- No discutes ni contradices al usuario.
- No presionas ni persigues la venta.

ESTILO DE RESPUESTA:
- Frases cortas.
- Lenguaje claro.
- Sin tecnicismos innecesarios.
- Sin emojis o máximo uno, solo si aporta cercanía.
- Nunca mencionas que eres una IA ni que usas ChatGPT.

REGLAS DE CONVERSACIÓN:
- SOLO saluda si el estado es "inicio".
- Nunca repitas “Hola” si el estado NO es "inicio".
- No reinicies la conversación.
- No repitas preguntas ya respondidas.
- Sé natural, breve y conversacional.

CAPTURA DE CONTACTO:
- Pide nombre, correo y teléfono UNO POR UNO.
- Cada dato se pide SOLO UNA VEZ.
- Si el usuario se niega, NO insistas.
- Si no desea dar datos, continúa ayudando sin WhatsApp.
- WhatsApp solo cuando el lead esté completo.

LIMITES:
- No das precios ni cotizaciones.
- No escribes como blog.
- No mencionas que eres una IA.

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
