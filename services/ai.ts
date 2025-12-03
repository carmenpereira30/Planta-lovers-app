import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PlantAnalysis } from '../types';

// --- Configuration ---
const OPENAI_API_KEY = process.env.API_KEY_OPENAI;
const GEMINI_API_KEY = process.env.API_KEY;

// --- Shared Definitions ---
const PLANT_JSON_STRUCTURE = `
{
  "commonName": "String (Spanish)",
  "scientificName": "String (Latin)",
  "description": "String (Spanish, max 2 sentences)",
  "lightRequirement": "low | medium | high",
  "wateringRequirement": "low | medium | high",
  "temperatureRange": "String (e.g. '18-24°C')",
  "toxicity": "toxic | safe | unknown",
  "difficulty": "easy | medium | hard",
  "funFacts": ["String (Spanish)", "String (Spanish)"]
}
`;

// --- OpenAI Implementation ---

const identifyWithOpenAI = async (base64Image: string): Promise<PlantAnalysis> => {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API Key not found");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a botanical expert. Identify the plant in the image. 
          Return ONLY a JSON object strictly following this structure: ${PLANT_JSON_STRUCTURE}. 
          If the image is not a plant, return commonName: 'Unknown' and scientificName: 'Unknown'.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this plant." },
            { type: "image_url", image_url: { url: base64Image } } // base64Image should already have data:image... prefix
          ]
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  
  if (content.commonName === 'Unknown' || content.scientificName === 'Unknown') {
    throw new Error("No se pudo identificar una planta en esta imagen.");
  }

  return content as PlantAnalysis;
};

const generateImageWithOpenAI = async (prompt: string): Promise<string> => {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API Key not found");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: `${prompt}. Photorealistic, high quality, botanical photography style, isolated subject.`,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const b64 = data.data[0].b64_json;
  return `data:image/png;base64,${b64}`;
};


// --- Gemini Implementation ---

const geminiAi = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const plantSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    commonName: { type: Type.STRING, description: "Common name of the plant in Spanish." },
    scientificName: { type: Type.STRING, description: "Scientific Latin name." },
    description: { type: Type.STRING, description: "A short, engaging description of the plant in Spanish (max 2 sentences)." },
    lightRequirement: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    wateringRequirement: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    temperatureRange: { type: Type.STRING, description: "Ideal temperature range (e.g., '18-24°C')." },
    toxicity: { type: Type.STRING, enum: ['toxic', 'safe', 'unknown'] },
    difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
    funFacts: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "2 interesting fun facts about this plant in Spanish."
    }
  },
  required: ["commonName", "scientificName", "lightRequirement", "wateringRequirement", "difficulty", "toxicity", "funFacts", "description"]
};

const identifyWithGemini = async (base64Image: string): Promise<PlantAnalysis> => {
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await geminiAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        },
        {
          text: "Identify this plant. Provide the response in JSON format. Translate all text fields to Spanish. If the image is NOT a plant, return a JSON with commonName as 'Unknown' and scientificName as 'Unknown'."
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: plantSchema,
        temperature: 0.4
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text) as PlantAnalysis;
    
    if (data.commonName === 'Unknown' || data.scientificName === 'Unknown') {
      throw new Error("No se pudo identificar una planta en esta imagen.");
    }

    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

const generateImageWithGemini = async (prompt: string): Promise<string> => {
  try {
    const response = await geminiAi.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // Nano banana image generation
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No se pudo generar la imagen.");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};

// --- Main Exports (Provider Switching) ---

export const identifyPlant = async (base64Image: string): Promise<PlantAnalysis> => {
  if (OPENAI_API_KEY) {
    console.log("Using OpenAI for Identification");
    return identifyWithOpenAI(base64Image);
  }
  console.log("Using Gemini for Identification");
  return identifyWithGemini(base64Image);
};

export const generatePlantImage = async (prompt: string): Promise<string> => {
  if (OPENAI_API_KEY) {
    console.log("Using OpenAI for Image Generation");
    return generateImageWithOpenAI(prompt);
  }
  console.log("Using Gemini for Image Generation");
  return generateImageWithGemini(prompt);
};
