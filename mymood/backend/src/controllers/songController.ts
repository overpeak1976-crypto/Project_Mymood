import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { aiService } from '../services/aiService';
import { audioService } from '../services/audioService';
import { AuthRequest } from '../middlewares/authMiddleware';
import { cloudinaryService } from '../services/cloudinaryService';
import fs from 'fs';
import * as mm from 'music-metadata';
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

  // อัปโหลดเพลง + รูปปก + สร้าง Super Embedding ให้ AI ฉลาดสุดๆ
  async uploadSong(req: AuthRequest, res: Response) {
    try {
      const { title, artist } = req.body;

      // 🌟 1. ดักจับไฟล์ทั้ง 2 ชนิดที่ส่งมาพร้อมกัน
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // เช็คว่ามีส่งไฟล์เสียงมาด้วยไหม (จำเป็นต้องมี)
      if (!files || !files['audio']) {
        return res.status(400).json({ error: "ไม่พบไฟล์เพลง กรุณาแนบไฟล์ .mp3 มาด้วยครับ" });
      }
      if (!files['cover_image']) {
        return res.status(400).json({ error: "กรุณาแนบรูปปกเพลงมาด้วยครับ" });
      }
      // แยกไฟล์ออกมาเตรียมไว้
      const audioFile = files['audio'][0];
      const coverImageFile = files['cover_image'][0];

      const localFilePath = audioFile.path;
      console.log(`🎵 กำลังประมวลผลเพลง: ${title} - ${artist}`);

      const metadata = await mm.parseFile(localFilePath);
      const durationSeconds = Math.round(metadata.format.duration || 0); // ปัดเศษให้เป็นจำนวนเต็ม
      console.log(`✅ ความยาวเพลง: ${durationSeconds} วินาที`);
      // 🌟 1. ดักจับชื่ออัลบั้ม (ถ้ามีส่งมาด้วย) เพื่อจัดการข้อมูลให้ครบถ้วน
      const albumName = req.body.album;

      // 🌟🌟 สเต็ปใหม่ 1.5: ระบบจัดการศิลปิน (Artist) และอัลบั้ม (Album) อัตโนมัติ 🌟🌟
      console.log(`🧑‍🎤 กำลังตรวจสอบข้อมูลศิลปิน: ${artist}`);
      let finalArtistId = null;

      // 1. ลองค้นหาชื่อศิลปินในตาราง artists (ilike คือหาแบบไม่สนตัวพิมพ์เล็ก-ใหญ่)
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .ilike('name', artist)
        .maybeSingle();

      if (existingArtist) {
        finalArtistId = existingArtist.id;
        console.log("เจอศิลปินในระบบแล้ว! ใช้ ID เดิม");
      } else {
        // 2. ถ้าไม่เจอ ให้สร้างโปรไฟล์ศิลปินใหม่เลย!
        console.log("ไม่พบศิลปิน สร้างโปรไฟล์ศิลปินใหม่...");
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert([{ name: artist }])
          .select('id')
          .single();

        if (artistError) throw artistError;
        finalArtistId = newArtist.id;
      }
      console.log("--- กำลังส่งไฟล์ให้ Audio AI วิเคราะห์ ---");
      const audioStats = await audioService.analyzeAudio(localFilePath);
      //  2. อัปโหลดรูปปกและไฟล์เสียงขึ้น Cloudinary 
      console.log("☁️ กำลังส่งไฟล์เสียงและรูปปกขึ้น Cloudinary...");
      const coverImageUrl = await cloudinaryService.uploadImage(coverImageFile.path, 'mymood_covers');
      const finalAudioUrl = await cloudinaryService.uploadAudio(localFilePath, 'mymood_audio');
      console.log(`✅ อัปโหลดไฟล์เสียงสำเร็จ! URL: ${finalAudioUrl}`);
      // 3. วิเคราะห์คลื่นเสียงดนตรี (จะได้ค่าทั้ง 5 ตัวมา)


      // 3. ระบบจัดการอัลบั้ม (ถ้าผู้ใช้ส่งชื่ออัลบั้มมาด้วย)
      let finalAlbumId = null;
      if (albumName) {
        console.log(`💿 กำลังตรวจสอบข้อมูลอัลบั้ม: ${albumName}`);
        const { data: existingAlbum } = await supabase
          .from('albums')
          .select('id')
          .ilike('title', albumName)
          .eq('artist_id', finalArtistId) // ต้องเป็นอัลบั้มของศิลปินคนนี้เท่านั้น
          .maybeSingle();

        if (existingAlbum) {
          finalAlbumId = existingAlbum.id;
        } else {
          // ถ้าไม่มีอัลบั้มนี้ ให้สร้างใหม่ พร้อมเอารูปปกเพลงไปเป็นรูปปกอัลบั้มด้วย
          const { data: newAlbum, error: albumError } = await supabase
            .from('albums')
            .insert([{
              title: albumName,
              artist_id: finalArtistId,
              cover_image_url: coverImageUrl
            }])
            .select('id')
            .single();

          if (albumError) throw albumError;
          finalAlbumId = newAlbum.id;
        }
      }

      // 🌟 4. ให้ AI วิเคราะห์ก่อนบันทึกลงฐานข้อมูล (ย้ายขึ้นมาตรงนี้)
      console.log("--- 🤖 กำลังให้ Gemini วิเคราะห์และแต่งเรื่องราวของเพลง ---");
      const aiAnalysis = await aiService.generateSuperContext(
        title,
        artist,
        audioStats.bpm,
        audioStats.key,
        audioStats.scale,
        audioStats.energy,
        audioStats.danceability
      );
      console.log("👉 แนวเพลงที่ AI คิดได้:", aiAnalysis.genre);
      console.log("👉 ประโยค Super Context:", aiAnalysis.superContext);

      // 🌟 5. บันทึกข้อมูลเพลงลงตาราง songs (เก็บข้อมูลเชิงลึกทั้งหมด + รูป + แนวเพลง ลง Database)
      console.log("💾 กำลังบันทึกข้อมูลเพลงลง Database...");
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .insert([{
          title,
          artist,
          artist_id: finalArtistId,
          album_id: finalAlbumId,
          uploaded_by: req.user.id,
          audio_file_url: finalAudioUrl,
          cover_image_url: coverImageUrl,
          bpm: audioStats.bpm,
          danceability: audioStats.danceability,
          music_key: audioStats.key,
          music_scale: audioStats.scale,
          energy: audioStats.energy,
          duration_seconds: durationSeconds,
          genre: aiAnalysis.genre // <--- 🌟 ยัดแนวเพลงที่ AI ให้มาตรงนี้!
        }])
        .select('id')
        .single();

      if (songError) {
        console.error("Supabase Insert Song Error:", songError);
        throw songError;
      }

      // 🌟 6. แปลงประโยค Super Context เป็นตัวเลข Vector
      const embedding = await aiService.generateEmbedding(aiAnalysis.superContext);

      // 🌟 7. บันทึก Vector ลงตาราง song_vectors
      const { error: vectorError } = await supabase
        .from('song_vectors')
        .insert([{
          song_id: songData.id,
          mood_keywords: aiAnalysis.superContext, // เก็บประโยคเต็มๆ ไว้ด้วย
          embedding: `[${embedding.join(',')}]`
        }]);

      if (vectorError) {
        console.error("Supabase Insert Vector Error:", vectorError);
        throw vectorError;
      }
      res.status(201).json({ message: "อัปโหลดเพลง รูปปก และสร้าง AI Vector สำเร็จ!", song: songData });
    } catch (error: any) {
      console.error("🚨 Upload Route Error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      // ดึงไฟล์จาก req โดยตรงเพื่อป้องกันปัญหาตัวแปร files มองไม่เห็น
      const uploadedFiles = req.files as { [fieldname: string]: Express.Multer.File[] };

      // 🧹 เคลียร์ขยะ: ลบไฟล์เสียงที่พักไว้ชั่วคราวทิ้ง
      if (uploadedFiles && uploadedFiles['file'] && fs.existsSync(uploadedFiles['file'][0].path)) {
        fs.unlinkSync(uploadedFiles['file'][0].path);
      }

      // 🧹 เคลียร์ขยะ: ลบไฟล์รูปปกที่พักไว้ชั่วคราวทิ้ง
      if (uploadedFiles && uploadedFiles['cover_image'] && fs.existsSync(uploadedFiles['cover_image'][0].path)) {
        fs.unlinkSync(uploadedFiles['cover_image'][0].path);
      }
    }
  },

  // ระบบค้นหาเพลงด้วย AI (AI Search)
  async searchSongsByAI(req: AuthRequest, res: Response) {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "กรุณาใส่คำค้นหา (prompt)" });

      console.log(`ผู้ใช้พิมพ์ค้นหา: "${prompt}" \n`);


      // 1. ให้ Gemini ช่วยแปลคำวัยรุ่น เป็นคีย์เวิร์ดเทพๆ
      console.log("--- กำลังให้ Gemini ช่วยวิเคราะห์คำค้นหา ---");
      const optimizedPrompt = await aiService.optimizeSearchPrompt(prompt);
      console.log(`🧠 Gemini ตีความได้ว่า: "${optimizedPrompt}"`);

      // 2. เอาคำที่ Gemini แปลให้ ไปแปลงเป็น Vector!
      const queryVector = await aiService.generateEmbedding(optimizedPrompt);

      // 3. ยิงไปถาม Database
      const { data: songs, error: matchError } = await supabase.rpc('match_songs', {
        query_embedding: `[${queryVector.join(',')}]`,
        match_threshold: 0.1,
        match_count: 5
      });

      if (matchError) throw matchError;

      if (!songs || songs.length === 0) {
        return res.status(200).json({ message: "ไม่พบเพลงที่ตรงกับอารมณ์นี้", songs: [] });
      }

      res.status(200).json({ message: "ค้นหาสำเร็จ!", songs: songs });

    } catch (error: any) {
      console.error("🚨 Search AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
  async reanalyzeSong(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // 1. ดึงข้อมูลเพลงเดิมขึ้นมา
      const { data: song, error: fetchError } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !song) return res.status(404).json({ error: "ไม่พบข้อมูลเพลง" });

      // 2. โยนให้ Gemini วิเคราะห์ใหม่ (ถ้าค่า bpm, key ไม่มี ให้ใช้ค่า default ไปก่อน)
      console.log(`🤖 แอดมินสั่ง Re-analyze เพลง: ${song.title}`);
      const aiAnalysis = await aiService.generateSuperContext(
        song.title,
        song.artist,
        song.bpm ,
        song.music_key ,
        song.music_scale ,
        song.energy ,
        song.danceability
      );

      // 3. อัปเดตแนวเพลง (Genre) ในตาราง songs
      const { error: updateError } = await supabase
        .from('songs')
        .update({ genre: aiAnalysis.genre })
        .eq('id', id);

      if (updateError) throw updateError;

      // 4. แปลงคำเป็น Vector
      const embedding = await aiService.generateEmbedding(aiAnalysis.superContext);

      // 5. เช็คว่าเคยมี Vector หรือยัง (เพื่อเลือกว่าจะ Update หรือ Insert)
      const { data: existingVector } = await supabase
        .from('song_vectors')
        .select('id')
        .eq('song_id', id)
        .maybeSingle();

      if (existingVector) {
        await supabase
          .from('song_vectors')
          .update({
            mood_keywords: aiAnalysis.superContext,
            embedding: `[${embedding.join(',')}]`
          })
          .eq('song_id', id);
      } else {
        await supabase
          .from('song_vectors')
          .insert([{
            song_id: id,
            mood_keywords: aiAnalysis.superContext,
            embedding: `[${embedding.join(',')}]`
          }]);
      }

      res.status(200).json({ message: "อัปเดตข้อมูล AI สำเร็จ!", genre: aiAnalysis.genre });
    } catch (error: any) {
      console.error("❌ Reanalyze Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
