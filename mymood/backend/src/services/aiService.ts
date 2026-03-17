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
        model: 'gemma-3-27b-it',
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
  },
 // 🌟 1. ล่ามแปลภาษา (ตอนค้นหา): แปลงทุกอย่างให้เป็นโครงสร้าง Tags
  async optimizeSearchPrompt(userPrompt: string): Promise<string> {
    try {
      const prompt = `You are a Music Search Engine AI. The user entered this query in Thai: "${userPrompt}"
      
      Your job is to convert this query into a highly structured, comma-separated list of ENGLISH keywords for a Vector Database.

      THINKING PROCESS:
      1. EXACT MATCH: Is this query a lyric from a famous Thai or international song? If yes, you MUST output the exact English Song Title and Artist Name first.
      2. GENRE & TEMPO: What genre and tempo fits this query? (e.g., pop, rock, indie, fast tempo, slow tempo).
      3. MOOD & THEME: What is the emotional state and lyrical theme? (e.g., heartbreak, romantic, secret love, rebellious, chilling).

      CRITICAL RULES:
      - NO sentences. ONLY comma-separated keywords.
      - ENTIRELY IN ENGLISH. NO THAI CHARACTERS.
      - DO NOT use the word "Example" in your output.

     Output Format: [Song Title (if known)], [Artist], [Genre], [Tempo], [Mood Keywords], [Lyrical Theme Keywords], [Listening Scenario / Vibe]
      
      Process this query: "${userPrompt}"`;

      const response = await ai.models.generateContent({
        model: 'gemma-3-27b-it',
        contents: prompt,
      });
      
      const cleanResult = response.text ? response.text.trim() : userPrompt;
      return cleanResult;
       
    } catch (error) {
      console.error("❌ Gemini Optimize Error:", error);
      return userPrompt; 
    }
  },

  // 🌟 2. สร้างสมอง AI (ตอนอัปโหลด): สร้าง Tags โครงสร้างเดียวกับตอนค้นหาเป๊ะๆ!
  async generateSuperContext(title: string, artist: string, bpm: number, key: string, scale: string, energy: number, danceability: number): Promise<string> {
    try {
      const prompt = `You are an AI Music Tagger.
      Song details: "${title}" by "${artist}"
      Audio stats: ${bpm} BPM, Key ${key} ${scale}, Energy ${energy}, Danceability ${danceability}
      
      Your job is to generate a highly structured, comma-separated list of ENGLISH keywords for a Vector Database.
      Use your internet knowledge to identify the real lyrical meaning and genre of this specific song.

      CRITICAL INSTRUCTIONS:
      1. Output MUST start with the exact Song Title and Artist.
      2. Include the exact Music Genre and Sub-genre.
      3. Include Tempo classification based on the BPM (e.g., fast tempo, upbeat, slow tempo).
      4. Include 3-5 Keywords describing the Emotional Mood.
      5. Include 2-3 Keywords describing the Lyrical Theme or Story (e.g., unrequited love, motivation, breakup).
      6. Include 2-3 Keywords for the ideal Listening Scenario (e.g., late night, raining, driving, party, workout).
      CRITICAL RULES:
      - NO sentences or paragraphs. ONLY comma-separated keywords.
      - ENTIRELY IN ENGLISH. NO THAI CHARACTERS.

      Output Format: ${title}, ${artist}, [Genre], [Tempo], [Mood Keywords], [Lyrical Theme Keywords], [Listening Scenario / Vibe]`;

      const response = await ai.models.generateContent({
        model: 'gemma-3-27b-it',
        contents: prompt,
      });
      
      return response.text ? response.text.trim() : `${title}, ${artist}, bpm ${bpm}`;
    } catch (error) {
      console.error("❌ Gemini Super Context Error:", error);
      return `${title}, ${artist}, bpm ${bpm}`; 
    }
  },
  async generatePlaylistMetadata(userPrompt: string, songs: any[]): Promise<{ title: string, description: string }> {
    try {
      // ดึงแค่ชื่อเพลงและศิลปินมาให้ Gemini ดู
      const songList = songs.map(s => `- ${s.title} by ${s.artist}`).join('\n');
      
      const prompt = `คุณคือ AI Music Curator (นักจัดเพลย์ลิสต์มืออาชีพ)
      ผู้ใช้ต้องการเพลย์ลิสต์สำหรับ: "${userPrompt}"
      และนี่คือรายชื่อเพลงที่ระบบดึงมาได้:
      ${songList}
      
      หน้าที่ของคุณคือสร้าง "ชื่อ Playlist" สั้นๆ เท่ๆ โดนใจ และ "คำอธิบาย" (Description) ไม่เกิน 2 บรรทัด ให้เข้ากับอารมณ์เพลงเหล่านี้
      
      ตอบกลับมาเป็นรูปแบบ JSON เท่านั้น ห้ามมีข้อความอื่นปน:
      {
        "title": "ชื่อ Playlist",
        "description": "คำอธิบาย"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemma-3-27b-it',
        contents: prompt,
      });
      
      const text = response.text ? response.text.trim() : '{}';
      // ตัด backticks (```json ... ```) ที่ AI ชอบแถมมาออก
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '');
      
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("❌ Gemini Playlist Metadata Error:", error);
      return { title: "My Mood Playlist", description: "เพลย์ลิสต์ที่จัดเตรียมมาเพื่อคุณโดยเฉพาะ" };
    }
  }
};