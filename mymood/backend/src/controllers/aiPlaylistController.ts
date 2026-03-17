import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { aiService } from '../services/aiService';
import { GoogleGenAI } from '@google/genai';
import { AuthRequest } from '../middlewares/authMiddleware';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiPlaylistController = {
  async generatePlaylist(req: Request, res: Response) {
    try {
      const { prompt } = req.body; // ผู้ใช้พิมพ์มา เช่น "อยากฟังเพลงเศร้าตอนฝนตก"

      if (!prompt) return res.status(400).json({ error: "Prompt is required" });
      
      console.log(`🎧 เริ่มจัด Playlist สำหรับ: "${prompt}"`);

      // 🌟 1. ท่าไม้ตาย: ให้ Gemini แปลงคำสั่งเป็นคีย์เวิร์ดดนตรีก่อน เพื่อให้หาเพลงแม่นขึ้น!
      console.log("--- กำลังให้ Gemini ช่วยวิเคราะห์อารมณ์ ---");
      const optimizedPrompt = await aiService.optimizeSearchPrompt(prompt);

      // 2. แปลงคำสั่งผู้ใช้เป็น Vector (384 มิติ)
      const queryEmbedding = await aiService.generateEmbedding(optimizedPrompt);

      // 3. ค้นหาเพลงใน Database ที่อารมณ์ตรงกัน (ผ่าน RPC ที่เราสร้างไว้)
      const { data: matchedSongs, error: rpcError } = await supabase.rpc('match_songs', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.1, // ปรับเป็น 0.1 ก่อนเพื่อให้หาเพลงเจอง่ายขึ้น
        match_count: 5 // ขอ 5 เพลงก่อน (พอเพลงเยอะค่อยปรับเป็น 10-20 เพลงครับ)
      });

      if (rpcError) throw rpcError;

      if (!matchedSongs || matchedSongs.length === 0) {
        return res.status(200).json({ message: "ไม่พบเพลงที่ตรงกับอารมณ์นี้ในระบบ", songs: [] });
      }

      // 4. ส่งให้ Gemini ช่วยตั้งชื่อ Playlist เท่ๆ ให้
      console.log("--- กำลังให้ Gemini ตั้งชื่อ Playlist ---");
      const songTitles = matchedSongs.map((s: any) => s.title).join(', ');
      const aiPrompt = `The user is feeling: "${prompt}". Here are the songs selected: ${songTitles}. Give me a short, cool playlist name (max 5 words) for this mood. Return ONLY the playlist name. Do not include quotes.`;
      
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
      });

      // ดักจับและลบเครื่องหมายคำพูด (") ที่ AI ชอบแถมมาให้ออกไป
      const playlistName = aiResponse.text?.replace(/"/g, '').trim() || "My Mood Playlist";
      console.log(`✅ ได้ชื่อ Playlist: ${playlistName}`);

      // 5. ส่งข้อมูลกลับไปให้ Frontend ไปจัดคิวเล่นเพลง
      res.status(200).json({
        playlist_name: playlistName,
        ai_prompt_used: prompt,
        total_songs: matchedSongs.length,
        songs: matchedSongs
      });

    } catch (error: any) {
      console.error("🚨 Generate Playlist Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
  // 🌟 ฟังก์ชันใหม่: บันทึก Playlist ที่ AI จัดให้ลงคลังส่วนตัว (เวอร์ชันปรับตาม Database ของคุณ Antonius)
 // 🌟 ฟังก์ชัน: บันทึก Playlist ที่ AI จัดให้ลงคลังส่วนตัว (เวอร์ชันตรงกับ Database ของคุณ)
  async savePlaylist(req: AuthRequest, res: Response) {
    try {
      const { name, description, cover_image_url, song_ids } = req.body;
      const user_id = req.user.id; 

      if (!name || !song_ids || song_ids.length === 0) {
        return res.status(400).json({ error: "ข้อมูลไม่ครบ ต้องมีชื่อ Playlist และรายชื่อเพลงครับ" });
      }

      console.log(`💾 กำลังบันทึกเพลย์ลิสต์: "${name}" ให้กับคุณ...`);

      // 1. สร้าง "หน้าปก" ลงตาราง playlists 
      // (สมมติว่าตารางหลักชื่อ playlists นะครับ ถ้าชื่ออื่นแก้ตรงนี้ได้เลย)
      const { data: newPlaylist, error: playlistError } = await supabase
        .from('playlists')
        .insert([{ user_id, name, description, cover_image_url }])
        .select()
        .single();

      if (playlistError) throw playlistError;

      // 🌟 2. อัปเกรดให้ตรงกับตาราง playlist_tracks ของคุณ!
      // ใช้ index ในการรันตัวเลขลำดับเพลง (1, 2, 3...) ใส่ช่อง order_index
      const playlistTracksData = song_ids.map((song_id: string, index: number) => ({
        playlist_id: newPlaylist.id,
        song_id: song_id,
        order_index: index + 1 // 🌟 ใส่ลำดับเพลงให้ตรงกับ Database
      }));

      // 3. ยัดไส้ในเพลงลงตาราง playlist_tracks รวดเดียว!
      const { error: tracksError } = await supabase
        .from('playlist_tracks') // 🌟 เปลี่ยนชื่อตารางให้ตรงกัน
        .insert(playlistTracksData);

      if (tracksError) throw tracksError;

      res.status(201).json({ 
        message: "บันทึกเพลย์ลิสต์ลงคลังส่วนตัวสำเร็จ!", 
        playlist: newPlaylist 
      });

    } catch (error: any) {
      console.error("🚨 Save Playlist Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
  // 🌟 ฟังก์ชันใหม่: ดึงเพลย์ลิสต์ทั้งหมดของฉัน พร้อมรายชื่อเพลงข้างใน
  async getMyPlaylists(req: AuthRequest, res: Response) {
    try {
      const user_id = req.user.id; // ดึง ID ของคนที่ล็อกอินอยู่

      console.log(`📦 กำลังค้นหาคลังเพลย์ลิสต์ของคุณ...`);

      // ใช้พลังของ Supabase ดึงข้อมูลข้าม 3 ตารางรวดเดียว!
      // playlists -> playlist_tracks -> songs
      const { data: playlists, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name, 
          description,
          cover_image_url,
          created_at,
          playlist_tracks (
            order_index,
            songs (
              id,
              title,
              artist,
              cover_image_url,
              audio_file_url
            )
          )
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false }); // เรียงเอาเพลย์ลิสต์ล่าสุดขึ้นก่อน

      if (error) throw error;

      res.status(200).json({ 
        message: "ดึงข้อมูลเพลย์ลิสต์สำเร็จ!", 
        total: playlists.length,
        playlists: playlists 
      });

    } catch (error: any) {
      console.error("🚨 Get My Playlists Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};