import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { aiService } from '../services/aiService';
import { audioService } from '../services/audioService';
import { AuthRequest } from '../middlewares/authMiddleware';

export const songController = {
  // ดึงเพลงทั้งหมด
  async getAllSongs(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // อัปโหลดเพลง + สร้าง Super Embedding ให้ AI ฉลาดสุดๆ
  async uploadSong(req: AuthRequest, res: Response) {
    try {
      const { title, artist, audio_file_url, cover_image_url } = req.body;

      // 1. ดักจับไฟล์
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "ไม่พบไฟล์เพลง กรุณาแนบไฟล์ .mp3 มาด้วยครับ" });
      }

      const localFilePath = file.path;

      // 2. วิเคราะห์คลื่นเสียงดนตรี (จะได้ค่าทั้ง 5 ตัวมา)
      console.log("--- กำลังส่งไฟล์ให้ Audio AI วิเคราะห์ ---");
      const audioStats = await audioService.analyzeAudio(localFilePath);

      // 3. บันทึกข้อมูลเพลงลงตาราง songs (เก็บข้อมูลเชิงลึกทั้งหมด)
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .insert([{ 
          title, 
          artist, 
          uploaded_by: req.user.id,
          audio_file_url: audio_file_url,
          cover_image_url: cover_image_url || null,
          bpm: audioStats.bpm, 
          danceability: audioStats.danceability,
          music_key: audioStats.key,       // 🌟 เก็บ Key
          music_scale: audioStats.scale,   // 🌟 เก็บ Scale
          energy: audioStats.energy        // 🌟 เก็บ Energy
        }])
        .select()
        .single();

      if (songError) {
        console.error("Supabase Insert Song Error:", songError);
        throw songError;
      }

      // 4. สกัดอารมณ์ด้วย Text AI
      console.log("--- กำลังส่งให้ Text AI สกัดอารมณ์ ---");
      const moodKeywords = await aiService.extractMoodTags(title, artist);

      let energyText = "ปานกลาง";
      if (audioStats.energy > 800000) {
        energyText = "สูงมาก (มันส์จัด จังหวะหนักแน่น)";
      } else if (audioStats.energy > 300000) {
        energyText = "ปานกลาง (ฟังสบาย โยกหัวตามได้)";
      } else {
        energyText = "ต่ำ (ชิลๆ อะคูสติก หรือเพลงช้า)";
      }
      // 🌟🌟 5. ท่าไม้ตาย! ยำรวมข้อมูลสร้าง "Super Context" ให้ AI เข้าใจลึกซึ้ง 🌟🌟
      const superContextForAI = `เพลง "${title}" โดยศิลปิน "${artist}". อารมณ์ของเพลงคือ: ${moodKeywords}. ข้อมูลดนตรีเชิงลึก: จังหวะ ${audioStats.bpm} BPM, คีย์เพลง ${audioStats.key} ${audioStats.scale}, พลังงานความมันส์ ${audioStats.energy}, และความน่าเต้น ${audioStats.danceability}. ,พลังงานของเพลงนี้จัดอยู่ในระดับ: ${energyText}.`;
      
      console.log("👉 ประโยคที่จะฝังลงสมอง AI คือ:", superContextForAI);

      // 6. แปลงประโยค Super Context เป็นตัวเลข Vector
      const embedding = await aiService.generateEmbedding(superContextForAI);

      // 7. บันทึก Vector ลงตาราง song_vectors
      const { error: vectorError } = await supabase
        .from('song_vectors')
        .insert([{ 
          song_id: songData.id, 
          mood_keywords: superContextForAI, // เก็บประโยคเต็มๆ ไว้ให้ดูง่ายๆ
          embedding: `[${embedding.join(',')}]` 
        }]);

      if (vectorError) {
        console.error("Supabase Insert Vector Error:", vectorError);
        throw vectorError;
      }

      res.status(201).json({ message: "อัปโหลดและสร้าง Super AI Vector สำเร็จ!", song: songData });
    } catch (error: any) {
      console.error("🚨 Upload Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};