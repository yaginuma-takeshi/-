import { GoogleGenAI, Type } from "@google/genai";
import { CaseStatus } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema for suggested tasks from case details
const taskSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The short title of the task.",
      },
      daysFromNow: {
        type: Type.INTEGER,
        description: "Suggested number of days from today.",
      },
      description: {
        type: Type.STRING,
        description: "A brief description.",
      }
    },
    required: ["title", "daysFromNow"],
  }
};

// Schema for parsing free text into tasks
const freeTextTaskSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Task title extracted from text.",
      },
      date: {
        type: Type.STRING,
        description: "Date in YYYY-MM-DD format. Calculate based on 'today', 'next week', etc. relative to the current date.",
      },
      time: {
        type: Type.STRING,
        description: "Time in HH:MM format (24-hour) if specified in the text. Null or empty string if not specified.",
      }
    },
    required: ["title", "date"],
  }
};

export const generateSuggestedTasks = async (
  propertyName: string,
  status: CaseStatus,
  notes: string
): Promise<{ title: string; daysFromNow: number; description?: string }[]> => {
  if (!apiKey) return mockTasks(status);

  try {
    const prompt = `
      あなたは日本の不動産営業マンのアシスタントです。
      案件情報に基づき、必要なタスクリスト(3〜5個)をJSONで提案してください。
      
      案件: ${propertyName}
      状態: ${status}
      備考: ${notes}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: taskSchema,
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return mockTasks(status);
  }
};

export const parseFreeTextTasks = async (
  input: string
): Promise<{ title: string; date: string; time?: string }[]> => {
  if (!apiKey) {
    // Simple fallback mock if no API key
    const today = new Date().toISOString().split('T')[0];
    return [{ title: input, date: today }];
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
      Current Date: ${today}
      Analyze the following text and extract task items with their specific dates (YYYY-MM-DD) and times (HH:MM) if available.
      If no specific date is mentioned, assume today or the most logical near future date.
      
      Text: "${input}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: freeTextTaskSchema,
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return [];
  }
};

const mockTasks = (status: CaseStatus) => {
  switch (status) {
    case CaseStatus.LEAD:
      return [{ title: "初回ヒアリング", daysFromNow: 1 }];
    default:
      return [{ title: "定期連絡", daysFromNow: 3 }];
  }
};