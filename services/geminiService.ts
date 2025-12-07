import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCaptainLog = async (turbulence: number, tilt: number): Promise<string> => {
  try {
    const seaState = turbulence > 150 ? "a giant whirlpool" : turbulence > 50 ? "bumpy waves" : "smooth sailing";
    
    const prompt = `
      You are the brave (but cute) Captain of a small plastic Toy Boat floating in a bottle. 
      The water conditions are currently: ${seaState}.
      Write a very short, cute, and adventurous Logbook entry (max 10 words). 
      Example: "Hold on tight rubber ducky, big waves ahead!" or "Smooth seas, time for a nap."
      Do not include "Captain's Log" prefix.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Floating happily!";
  }
};