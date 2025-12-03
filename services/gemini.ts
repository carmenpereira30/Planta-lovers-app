import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PlantAnalysis } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const identifyPlant = async (base64Image: string): Promise<PlantAnalysis> => {
  // Remove data URL prefix if present for the API call
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
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
    
    // Basic validation to ensure it's not a hallucination on non-plant objects
    if (data.commonName === 'Unknown' || data.scientificName === 'Unknown') {
      throw new Error("No se pudo identificar una planta en esta imagen.");
    }

    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const generatePlantImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
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