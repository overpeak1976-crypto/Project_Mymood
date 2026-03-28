import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { LogBox } from 'react-native';
import { supabase } from '../lib/supabase';

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
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // ใช้ useRef เพื่อให้ callback ใน setOnPlaybackStatusUpdate เข้าถึงค่าล่าสุดได้
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    queueRef.current = queue;
    currentIndexRef.current = currentIndex;
  }, [queue, currentIndex]);

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  const playNext = async () => {
    const nextIndex = currentIndexRef.current + 1;
    if (queueRef.current.length > 0 && nextIndex < queueRef.current.length) {
      const nextSong = queueRef.current[nextIndex];
      await playSong(nextSong, queueRef.current);
    } else {
      console.log("จบเพลย์ลิสต์แล้วครับ!");
    }
  };

  const playPrevious = async () => {
    // ดึงตำแหน่งปัจจุบันมาเช็ค (หน่วยเป็นวินาที)
    if (currentTime > 3) {
      await seekTo(0);
    } else {
      const prevIndex = currentIndexRef.current - 1;
      if (queueRef.current.length > 0 && prevIndex >= 0) {
        const prevSong = queueRef.current[prevIndex];
        await playSong(prevSong, queueRef.current);
      }
    }
  };

  const recordPlayHistory = async (songId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      // 🌟 เช็คบรรทัดนี้: ต้องดึงจาก process.env เท่านั้น
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${BACKEND_URL}/api/play/${songId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      console.log(`✅ [AudioContext] บันทึกยอดวิวเพลง ID: ${songId} สำเร็จ`);
    } catch (error) {
      console.error("❌ [AudioContext] บันทึกยอดวิวไม่สำเร็จ:", error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      // 🌟 อัปเดตสถานะการเล่นให้ตรงกับความจริง (แก้ปัญหา UI ไม่เปลี่ยนตาม)
      setIsPlaying(status.isPlaying);
      
      const duration = status.durationMillis || 0;
      setCurrentTime(status.positionMillis / 1000);
      setTotalDuration(duration / 1000);
      setProgressFraction(duration > 0 ? status.positionMillis / duration : 0);

      if (status.didJustFinish) {
        playNext();
      }
    } else if (status.error) {
      console.error(`Playback Error: ${status.error}`);
    }
  };

  const playSong = async (song: Song, playlist: Song[] = []) => {
    try {
      setIsLoading(true);
      
      // จัดการ Queue
      if (playlist.length > 0) {
        setQueue(playlist);
        setCurrentIndex(playlist.findIndex(s => s.id === song.id));
      }

      // ล้างเพลงเก่า
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audio_file_url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 }, // อัปเดตทุก 0.5 วินาที
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentSong(song);
      setIsPlaying(true);
      
      // บันทึกประวัติ
      recordPlayHistory(song.id);
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
    } else {
      await sound.playAsync();
    }
  };

  // ล้างหน่วยความจำเมื่อ Component ถูกทำลาย
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // ตั้งค่า Audio Mode ครั้งเดียวตอนเริ่ม
  useEffect(() => {
    const configureAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false
      });
    };
    configureAudio();
  }, []);

  return (
    <AudioContext.Provider value={{ 
      currentSong, isPlaying, isLoading, currentTime, totalDuration, progressFraction,
      playSong, togglePlayPause, seekTo, playNext, playPrevious, queue, currentIndex 
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