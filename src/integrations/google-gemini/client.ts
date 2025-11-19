import { GoogleGenerativeAI } from "@google/generative-ai";

// Certifique-se de que VITE_GEMINI_API_KEY está definido no seu arquivo .env
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY não está definida. Por favor, adicione-a ao seu arquivo .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });