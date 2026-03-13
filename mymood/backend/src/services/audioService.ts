// @ts-ignore
import { Essentia, EssentiaWASM } from 'essentia.js';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
// @ts-ignore
import wav from 'node-wav';

// ตั้งค่าให้ Node.js รู้จักโปรแกรม FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let essentia: any = null;

const initEssentia = async () => {
    if (!essentia) {
        essentia = new Essentia(EssentiaWASM);
    }
    return essentia;
};

export const audioService = {
  // 1. ฟังก์ชันย่อย: แปลงไฟล์ MP3 เป็น WAV (แบบ Mono เพื่อให้ AI อ่านง่าย)
  convertMp3ToWav(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioChannels(1) // แปลงเป็นเสียง Mono (1 ช่องสัญญาณ)
        .audioFrequency(44100) // มาตรฐานเสียง CD
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  },

  // 2. ฟังก์ชันหลัก: วิเคราะห์เสียง
  // 🌟 จุดที่แก้: เพิ่ม key, scale, energy เข้าไปในวงเล็บ Promise
  async analyzeAudio(filePath: string): Promise<{ bpm: number, danceability: number, key: string, scale: string, energy: number }> {
    const tempWavPath = `${filePath}_temp.wav`;

    try {
      console.log(`--- DEBUG: เริ่มสกัดคลื่นเสียงจริงจากไฟล์ ${filePath} ---`);
      const es = await initEssentia();
      
      // สเต็ป A: แปลง MP3 เป็น WAV
      console.log(`[1/3] กำลังแปลงไฟล์เป็น WAV ด้วย FFmpeg...`);
      await this.convertMp3ToWav(filePath, tempWavPath);

      // สเต็ป B: อ่านไฟล์ WAV แล้วแปลงเป็นตัวเลข
      console.log(`[2/3] กำลังถอดรหัสคลื่นเสียง...`);
      const buffer = fs.readFileSync(tempWavPath);
      const result = wav.decode(buffer);
      
      const audioArray = Array.from(result.channelData[0]); 
      const vectorAudio = es.arrayToVector(audioArray);

      // สเต็ป C: ให้ Essentia AI วิเคราะห์แบบจัดเต็ม!
      console.log(`[3/3] Essentia AI กำลังวิเคราะห์ข้อมูลเชิงลึก...`);
      const rhythm = es.RhythmExtractor2013(vectorAudio);
      const dance = es.Danceability(vectorAudio);
      
      // 🌟 เพิ่มการสกัดคีย์เพลงและพลังงาน
      const keyData = es.KeyExtractor(vectorAudio);
      const energyData = es.Energy(vectorAudio);

      const bpmResult = Math.round(rhythm.bpm);
      const danceResult = parseFloat(dance.danceability.toFixed(2));
      const energyResult = parseFloat(energyData.energy.toFixed(2));

      console.log(`✅ สำเร็จ! BPM: ${bpmResult}, Key: ${keyData.key} ${keyData.scale}, Energy: ${energyResult}`);

      // ลบไฟล์ WAV ชั่วคราวทิ้งเพื่อไม่ให้รกเซิร์ฟเวอร์
      if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);

      // 🌟 ส่งข้อมูลทั้ง 5 ตัวกลับไปให้ Controller
      return {
          bpm: bpmResult,
          danceability: danceResult,
          key: keyData.key,
          scale: keyData.scale,
          energy: energyResult
      };

    } catch (error) {
      console.error("❌ ล้มเหลวในการวิเคราะห์คลื่นเสียง:", error);
      if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);
      // 🌟 ถ้า Error ก็ต้องส่งกลับให้ครบ 5 ตัวเหมือนกัน ไม่งั้นแอปพัง
      return { bpm: 0, danceability: 0, key: 'Unknown', scale: 'Unknown', energy: 0 };
    }
  }
  
};