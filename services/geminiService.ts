import { GoogleGenerativeAI } from "@google/generative-ai";
import { Fish, WeatherType } from "../types";

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

export const generateFishLore = async (fish: Fish, weather: WeatherType): Promise<string> => {
  try {
    const prompt = `
      You are an old, wise fisherman living inside a bottle ocean.
      You just caught a "${fish.name}" (${fish.rarity} rarity) while the weather was ${weather}.
      The fish looks like this emoji: ${fish.icon}.
      Write a funny or philosophical one-sentence reaction to catching this fish.
      Max 20 words.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);

    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `What a beauty! A ${fish.name}!`;
  }
};
