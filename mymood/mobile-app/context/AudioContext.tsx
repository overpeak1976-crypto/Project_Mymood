import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { LogBox } from 'react-native';
import { supabase } from '@/lib/supabase';

LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated'
]);

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover_image_url: string;
  audio_file_url: string;
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;      
  totalDuration: number;    
  progressFraction: number; 
  // 🌟 1. อัปเดต playSong ให้รับ playlist ได้ และเพิ่มฟังก์ชันเปลี่ยนเพลง
  playSong: (song: Song, playlist?: Song[]) => Promise<void>; 
  togglePlayPause: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  queue: Song[];
  currentIndex: number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [progressFraction, setProgressFraction] = useState(0);

  // 🌟 2. เพิ่ม State สำหรับเก็บคิวเพลง (Playlist) และลำดับเพลง
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  // 🌟 3. ฟังก์ชันเล่นเพลงถัดไป
  const playNext = async () => {
    if (queue.length > 0 && currentIndex < queue.length - 1) {
      const nextSong = queue[currentIndex + 1];
      await playSong(nextSong, queue);
    } else {
      console.log("จบเพลย์ลิสต์แล้วครับ!");
      // ถ้าอยากให้วนลูป ให้เรียก await playSong(queue[0], queue); แทน
    }
  };

  // 🌟 4. ฟังก์ชันย้อนกลับเพลงเดิม/เล่นเพลงก่อนหน้า
  const playPrevious = async () => {
    if (currentTime > 3) {
      // ถ้าฟังไปเกิน 3 วินาทีแล้วกด Previous ให้เริ่มเพลงเดิมใหม่
      await seekTo(0);
    } else if (queue.length > 0 && currentIndex > 0) {
      // ถ้าเพิ่งเริ่มฟัง ให้ถอยไปเพลงก่อนหน้า
      const prevSong = queue[currentIndex - 1];
      await playSong(prevSong, queue);
    }
  };

  // ทริค: ใช้ useRef เก็บ playNext ไว้ เพื่อให้ฟังก์ชันใน setOnPlaybackStatusUpdate ดึงไปใช้ได้แบบข้อมูลไม่เพี้ยน
  const playNextRef = useRef(playNext);
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const recordPlayHistory = async (songId: string) => {
    try {
      // ดึง Token ของคนที่กำลังล็อกอินอยู่
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // ⚠️ สำคัญ: เปลี่ยน IP ตรงนี้ให้ตรงกับ IP เครื่องคอมของคุณ (ที่รัน Backend อยู่)
      const BACKEND_URL = "http://192.168.1.37:8080"; 

      const response = await fetch(`${BACKEND_URL}/api/play/${songId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // ส่งบัตรยืนยันตัวตนไปให้ยาม
        }
      });

      if (!response.ok) throw new Error("Backend ตอบกลับมาว่า Error");
      console.log(`✅ [AudioContext] บันทึกประวัติและบวกยอดวิวให้เพลง ID: ${songId} สำเร็จ!`);
    } catch (error) {
      console.error("❌ [AudioContext] ไม่สามารถบันทึกยอดวิวได้:", error);
    }
  };  
  // 🌟 5. อัปเดต playSong ให้รับ Playlist ได้
  const playSong = async (song: Song, playlist: Song[] = []) => {    
    setCurrentSong(song);
    setIsLoading(true); 

    if (playlist.length > 0) {
      setQueue(playlist);
      setCurrentIndex(playlist.findIndex(s => s.id === song.id));
    } else if (queue.length > 0) {
      setCurrentIndex(queue.findIndex(s => s.id === song.id));
    }

    try {
      if (sound) await sound.unloadAsync();

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audio_file_url },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      // 🌟🌟 ยิง API ไปบอก Backend ว่า "เห้ย มีคนเปิดฟังเพลงนี้นะ บวกวิวให้หน่อย!"
      // (เราสั่งให้มันทำงานไปเลยโดยไม่ต้องใช้ await นำหน้า เพื่อที่เพลงจะได้ไม่สะดุดรอ)
      recordPlayHistory(song.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        // ... (โค้ดดักจับเวลาเหมือนเดิม) ...
        if (status.isLoaded) {
          const duration = status.durationMillis || 0; 
          setCurrentTime(status.positionMillis / 1000);
          setTotalDuration(duration / 1000); 
          setProgressFraction(duration > 0 ? status.positionMillis / duration : 0); 
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTime(0);
            setProgressFraction(0);
            playNextRef.current(); 
          }
        }
      });
    } catch (error) {
      console.error("Error playing sound", error);
    } finally {
      setIsLoading(false); 
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    const configureAudioSession = async () => {
      try {
         await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix, 
          playThroughEarpieceAndroid: false
        });
      } catch (e) {
        console.error("❌ ตั้งค่า Audio Mode ไม่สำเร็จ:", e);
      }
    };

    configureAudioSession();
  }, []);

  return (
    <AudioContext.Provider value={{ 
      currentSong, 
      isPlaying, 
      isLoading, 
      currentTime, 
      totalDuration, 
      progressFraction,
      playSong, 
      togglePlayPause, 
      seekTo,
      playNext,        // 🌟 ส่งออกไปให้หน้าอื่นใช้
      playPrevious,    // 🌟 ส่งออกไปให้หน้าอื่นใช้
      queue,           
      currentIndex     
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};