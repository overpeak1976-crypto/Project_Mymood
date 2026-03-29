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
      const prompt = `You are an Expert Music Search Engine AI. The user entered this search query in Thai: "${userPrompt}"
      
      Your job is to convert this query into a highly structured, comma-separated list of ENGLISH keywords tailored for a Semantic Vector Database.

      THINKING PROCESS:
      1. IDENTITY (Exact Match & Genre): Is this a specific lyric, song, or artist? If so, output the exact Song Title and Artist Name. Identify the best-fitting Genres (e.g., Pop, Rock, R&B, Indie).
      2. CORE MOOD & VIBE: Do not just use basic words. Expand into deep emotional synonyms based on the user's intent. (e.g., instead of just "sad", use "heartbroken, devastated, lonely, crying, melancholic"; instead of "happy", use "euphoric, energetic, joyful, feel-good").
      3. MUSICALITY (Human Words): Translate the requested feeling into physical musical characteristics. (e.g., "slow tempo, easy listening, acoustic, soft vocals, low energy" OR "high energy, upbeat, heavy bass, club banger, highly danceable").
      4. SITUATION & ACTIVITY: What real-life scenario, weather, or activity perfectly fits this query? (e.g., "driving at night, rainy day, late night thoughts, working out, studying, chilling by the beach, party").

      CRITICAL RULES:
      - NO sentences or paragraphs. ONLY a comma-separated list of keywords and short phrases.
      - ENTIRELY IN ENGLISH. NO THAI CHARACTERS ALLOWED in the output.
      - Output MUST be rich and diverse to maximize semantic matching (Cosine Similarity).
      - DO NOT use labels like "Mood:" or "Genre:" in your output. Just output the raw words.

      Expected Output Format (Just the raw values, comma-separated):
      [Song Title/Artist if known], [Genres], [Musicality & Tempo phrases], [Expanded Mood Synonyms], [Lyrical Themes], [Situations & Activities]
      
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
 async generateSuperContext(title: string, artist: string, bpm: number, key: string, scale: string, energy: number, danceability: number): Promise<{ superContext: string, genre: string }> {
    try {
      const prompt = `You are an Expert AI Music Profiler. 
      Song details: "${title}" by "${artist}"
      Raw Audio Stats: ${bpm} BPM, Key: ${key} ${scale}, Energy: ${energy}, Danceability: ${danceability}
      
      Your job is to generate a highly semantic, comma-separated list of ENGLISH keywords to be stored in a Vector Database for Semantic Search. 
      Use your knowledge base to identify the real lyrical meaning, story, and genre of this specific song.

      THINKING PROCESS & CRITICAL INSTRUCTIONS:
      1. IDENTITY: Start with the exact "${title}" and "${artist}". Then add specific Genres and Sub-genres (e.g., Synth-pop, R&B, Indie Rock).
      2. MUSICALITY (Translate Stats to Human Words): Analyze the provided BPM, Energy, and Danceability. Translate these raw numbers into descriptive musical phrases (e.g., "slow tempo, acoustic, low energy, easy listening" OR "fast tempo, heavy bass, high energy, club banger, highly danceable").
      3. CORE MOOD & VIBE: Generate 5-7 keywords describing the deep emotional state. Do not just use basic words. Expand into rich synonyms (e.g., heartbreaking, euphoric, melancholic, nostalgic, aggressive, chill).
      4. LYRICAL THEME: Generate 3-4 keywords about the song's story or message (e.g., unrequited love, moving on, rebellion, secret crush, motivation).
      5. SITUATION & ACTIVITY: Generate 3-4 keywords for the perfect real-life scenario or weather for this song (e.g., late night drive, rainy day, workout, party, chilling by the beach).

      CRITICAL RULES:
    - You MUST output ONLY a valid JSON object. No extra text or markdown blocks.
    - The JSON object must have exactly two keys: "genre" and "superContext".
    - "genre": A single primary music genre (e.g., "Pop", "Rock", "Hip-Hop", "R&B", "Indie", "Jazz").
    - "superContext": A flat, comma-separated list of keywords including title, artist, genres, musicality, mood, and situations.

    Expected JSON Format:
    {
      "genre": "Pop",
      "superContext": "${title}, ${artist}, [Genres], [Musicality Phrases], [Mood Synonyms], [Situations]"
    }`;

      const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it',
      contents: prompt,
    });

    const text = response.text ? response.text.trim() : '{}';
    
    // ดักจับกรณี AI เผลอส่ง Markdown ```json ... ``` กลับมา
    const cleanJsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanJsonStr);
      return {
        genre: parsed.genre || "Unknown",
        superContext: parsed.superContext || `${title}, ${artist}, bpm ${bpm}`
      };
    } catch (parseError) {
      console.error("❌ Parse JSON Error from AI:", cleanJsonStr);
      return { genre: "Unknown", superContext: `${title}, ${artist}, bpm ${bpm}` };
    }

  } catch (error) {
    console.error("❌ Gemini Super Context Error:", error);
    return { genre: "Unknown", superContext: `${title}, ${artist}, bpm ${bpm}` };
  }
},
  async generatePlaylistMetadata(userPrompt: string, songs: any[]): Promise<{ title: string, description: string }> {
    try {
      // ดึงแค่ชื่อเพลงและศิลปินมาให้ Gemini ดู
      const songList = songs.map(s => `- ${s.title} by ${s.artist}`).join('\n');

      const prompt = `You are a Master Music Curator and Expert Copywriter.
      The user requested a playlist for the following mood or situation: "${userPrompt}"

      Here is the list of songs the system found for them:
      ${songList}

      Your job is to create a highly engaging, emotional, and catchy Playlist Title and Description in THAI.

      CRITICAL INSTRUCTIONS:
      1. "title": Create a short, catchy, and emotional playlist name. Use modern Thai phrasing, idioms, or relatable internet slang if it fits the mood (e.g., "ฟีลแฟน", "นอยด์อะ", "แอบแซ่บ", "ฮีลใจ").
      2. "description": Write a 1-2 sentence description that perfectly bridges the user's exact request with the vibe of the provided songs. Make it feel empathetic, personalized, and inviting.
      3. OUTPUT LANGUAGE: Strictly in THAI.
      4. STRICT JSON FORMAT: Output ONLY a valid, raw JSON object. ABSOLUTELY NO Markdown formatting. DO NOT wrap the output in \`\`\`json or \`\`\`. NO introductory or closing text.

      Expected Output:
      {
        "title": "ชื่อเพลย์ลิสต์",
        "description": "คำอธิบายเพลย์ลิสต์"
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