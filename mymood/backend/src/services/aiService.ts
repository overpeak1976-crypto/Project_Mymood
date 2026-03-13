import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
// นำเข้าไลบรารี Local AI
import { pipeline } from '@xenova/transformers';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiService = {
  // 1. สกัดอารมณ์เพลง (ยังใช้ Gemini ตัวฟรีตัวเดิมได้ เพราะอันนี้ไม่ติดบั๊ก)
  async extractMoodTags(title: string, artist: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the song "${title}" by ${artist}. Give me 5 mood keywords separated by commas. Only return the keywords.`,
      });
      return response.text || 'neutral';
    } catch (error) {
      console.error("Error extracting mood:", error);
      return 'neutral';
    }
  },

  // 2. แปลงข้อความเป็น Vector (เปลี่ยนมาใช้ Local AI ฟรี 100%)
  async generateEmbedding(text: string): Promise<number[]> {
    console.log("--- DEBUG: Generating Vector with Local AI (@xenova/transformers) ---");
    try {
      // โหลดโมเดล AI ชื่อ all-MiniLM-L6-v2 (ครั้งแรกจะโหลดไฟล์ลงเครื่องนิดนึง ครั้งต่อไปจะไวมาก)
      // โมเดลนี้จะแปลงข้อความออกมาเป็นตัวเลข 384 มิติ
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      // แปลงชนิดข้อมูลให้เป็น Array ปกติส่งกลับไป
      return Array.from(output.data);
    } catch (error) {
      console.error("Error with Local AI:", error);
      throw error;
    }
  }
};