import { GoogleGenAI } from "@google/genai";
import { Fish, WeatherType } from "../types";

// Lazy initialization to avoid errors when API key is missing
let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (ai) return ai;
  
  // Try to get API key from environment variables
  // Support both API_KEY and GEMINI_API_KEY for compatibility
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("Gemini API key not found. Fish lore generation will use fallback messages.");
    return null;
  }
  
  try {
    ai = new GoogleGenAI({ apiKey });
    return ai;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
};

export const generateFishLore = async (fish: Fish, weather: WeatherType): Promise<string> => {
  const aiInstance = getAI();
  
  if (!aiInstance) {
    // Fallback message when API key is not available
    return `What a beauty! A ${fish.name}!`;
  }
  
  try {
    const prompt = `
      You are an old, wise fisherman living inside a bottle ocean.
      You just caught a "${fish.name}" (${fish.rarity} rarity) while the weather was ${weather}.
      The fish looks like this emoji: ${fish.icon}.
      Write a funny or philosophical one-sentence reaction to catching this fish. 
      Max 20 words.
    `;

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `What a beauty! A ${fish.name}!`;
  }
};
