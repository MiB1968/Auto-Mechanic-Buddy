import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CORE_PROMPT = `
You are AutoMotive Buddy AI, a professional automotive diagnostic intelligence system.

Your role is to:
- Diagnose OBD-II DTC codes
- Provide vehicle-specific explanations
- Support light vehicles, heavy trucks, and heavy equipment
- Adapt results based on brand, model, and year
- Provide accurate, workshop-level repair guidance

Rules:
- Never guess randomly; use structured automotive logic
- Prioritize real-world mechanical causes
- Rank possible causes by likelihood
- Always separate symptoms, causes, and fixes
- Adjust reasoning based on vehicle type (light/heavy/equipment)
- Keep answers practical for mechanics and technicians
`;

export async function analyzeDTC(
  code: string,
  vehicleType: string,
  brand: string,
  model: string,
  year: string
) {
  const prompt = `
Analyze the following DTC code:

Code: ${code}
Vehicle Type: ${vehicleType}
Brand: ${brand}
Model: ${model}
Year: ${year}

Return structured diagnostic output according to the schema.
Important:
- Adjust interpretation based on vehicle type
- Heavy equipment may have hydraulic/electrical variations
- Heavy trucks may use J1939 logic
- Light vehicles use standard OBD-II logic
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: CORE_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          top_causes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                probability: { type: Type.NUMBER },
              },
            },
          },
          symptoms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          fixes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          severity: {
            type: Type.STRING,
            description: "low / medium / high / critical"
          },
          confidence: {
            type: Type.NUMBER,
            description: "Score from 0.0 to 1.0"
          }
        },
        required: ["code", "description", "top_causes", "symptoms", "fixes", "severity", "confidence"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function explainFuseBox(
  brand: string,
  model: string,
  year: string,
  query: string
) {
  const prompt = `
You are a vehicle electrical system assistant.
Vehicle: ${brand} ${model} ${year}
Task: Provide fuse box and electrical system information for the following query: "${query}"

Return a structured JSON output with:
- Location
- Diagram Explanation
- Safety Warnings
- Array of common issues
If no specific info is available, give a generic professional mechanic answer based on the vehicle type.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: CORE_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          diagramExplanation: { type: Type.STRING },
          safetyWarnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          commonIssues: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["location", "diagramExplanation", "safetyWarnings", "commonIssues"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
