import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { aiService } from '../services/aiService';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiPlaylistController = {
  async generatePlaylist(req: Request, res: Response) {
    try {
      const { prompt } = req.body; // ผู้ใช้พิมพ์มา เช่น "อยากฟังเพลงเศร้าตอนฝนตก"

      if (!prompt) return res.status(400).json({ error: "Prompt is required" });

      // 1. แปลงคำสั่งผู้ใช้เป็น Vector
      const queryEmbedding = await aiService.generateEmbedding(prompt);

      // 2. ค้นหาเพลงใน Database ที่อารมณ์ตรงกัน (ผ่าน RPC ที่เราสร้างไว้)
      const { data: matchedSongs, error: rpcError } = await supabase.rpc('match_songs', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.2, // ความคล้ายคลึงขั้นต่ำ ปรับได้ตามความเหมาะสม
        match_count: 10 // ขอ 10 เพลง
      });

      if (rpcError) throw rpcError;

      if (!matchedSongs || matchedSongs.length === 0) {
        return res.status(404).json({ message: "No matching songs found for this mood." });
      }

      // 3. (Optional) ส่งให้ Gemini ช่วยตั้งชื่อ Playlist เท่ๆ ให้
      const songTitles = matchedSongs.map((s: any) => s.title).join(', ');
      const aiPrompt = `The user is feeling: "${prompt}". Here are the songs selected: ${songTitles}. Give me a short, cool playlist name (max 5 words) for this mood. Return ONLY the playlist name.`;
      
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
      });

      const playlistName = aiResponse.text?.trim() || "My Mood Playlist";

      // 4. ส่งข้อมูลกลับไปให้ Frontend ไปจัดคิวเล่นเพลง
      res.status(200).json({
        playlist_name: playlistName,
        ai_prompt_used: prompt,
        songs: matchedSongs
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};