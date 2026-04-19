// @ts-ignore
import { Essentia, EssentiaWASM } from 'essentia.js';
import * as fs from 'fs';
import path from 'path'; // 🌟 1. นำเข้าโมดูล path เพิ่มเข้ามา
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
  // 1. ฟังก์ชันย่อย: แปลงไฟล์ MP3 เป็น WAV
  convertMp3ToWav(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(44100)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  },

  // 2. ฟังก์ชันหลัก: วิเคราะห์เสียง
  async analyzeAudio(filePath: string): Promise<{ bpm: number, danceability: number, key: string, scale: string, energy: number }> {
    
    // 🌟 2. แปลง Path แบบย่อ ให้เป็นแบบเต็ม (Absolute Path) เพื่อไม่ให้ FFmpeg งง
    const absoluteInputPath = path.resolve(filePath);
    const tempWavPath = path.resolve(`${filePath}_temp.wav`);

    try {
      console.log(`--- DEBUG: เริ่มสกัดคลื่นเสียงจริงจากไฟล์ ${absoluteInputPath} ---`);
      
      // 🌟 3. ดักเช็คให้ชัวร์ว่าไฟล์ยังมีชีวิตอยู่ไหม (เผื่อ Cloudinary แอบลบไฟล์ทิ้งไปก่อน)
      if (!fs.existsSync(absoluteInputPath)) {
          throw new Error(`หาไฟล์ไม่เจอ! ไฟล์อาจจะถูกลบไปแล้วก่อนถึงคิว FFmpeg: ${absoluteInputPath}`);
      }

      const es = await initEssentia();
      
      console.log(`[1/3] กำลังแปลงไฟล์เป็น WAV ด้วย FFmpeg...`);
      await this.convertMp3ToWav(absoluteInputPath, tempWavPath);

      console.log(`[2/3] กำลังถอดรหัสคลื่นเสียง...`);
      const buffer = fs.readFileSync(tempWavPath);
      const result = wav.decode(buffer);
      
      const audioArray = Array.from(result.channelData[0]); 
      const vectorAudio = es.arrayToVector(audioArray);

      console.log(`[3/3] Essentia AI กำลังวิเคราะห์ข้อมูลเชิงลึก...`);
      const rhythm = es.RhythmExtractor2013(vectorAudio);
      const dance = es.Danceability(vectorAudio);
      
      const keyData = es.KeyExtractor(vectorAudio);
      const energyData = es.Energy(vectorAudio);

      const bpmResult = Math.round(rhythm.bpm);
      const danceResult = parseFloat(dance.danceability.toFixed(2));
      const energyResult = parseFloat(energyData.energy.toFixed(2));

      console.log(` สำเร็จ! BPM: ${bpmResult}, Key: ${keyData.key} ${keyData.scale}, Energy: ${energyResult}`);

      // ลบไฟล์ WAV ชั่วคราวทิ้ง
      if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);

      return {
          bpm: bpmResult,
          danceability: danceResult,
          key: keyData.key,
          scale: keyData.scale,
          energy: energyResult
      };

    } catch (error) {
      console.error(" ล้มเหลวในการวิเคราะห์คลื่นเสียง:", error);
      if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);
      return { bpm: 0, danceability: 0, key: 'Unknown', scale: 'Unknown', energy: 0 };
    }
  }
};