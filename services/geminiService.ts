import { GoogleGenAI } from "@google/genai";
import { Fish, WeatherType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFishLore = async (fish: Fish, weather: WeatherType): Promise<string> => {
  try {
    const prompt = `
      You are an old, wise fisherman living inside a bottle ocean.
      You just caught a "${fish.name}" (${fish.rarity} rarity) while the weather was ${weather}.
      The fish looks like this emoji: ${fish.icon}.
      Write a funny or philosophical one-sentence reaction to catching this fish. 
      Max 20 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `What a beauty! A ${fish.name}!`;
  }
};
