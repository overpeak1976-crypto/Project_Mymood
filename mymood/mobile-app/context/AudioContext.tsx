import React, { createContext, useState, useContext, useEffect } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { LogBox } from 'react-native';

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
  currentTime: number;      // เวลาปัจจุบัน (วินาที)
  totalDuration: number;    // เวลาทั้งหมด (วินาที)
  progressFraction: number; // สัดส่วนเวลาเพลง (0.0 - 1.0)
  playSong: (song: Song) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>; // 🌟 ประกาศไว้ตรงนี้
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

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  const playSong = async (song: Song) => {    
    setCurrentSong(song);
    setIsLoading(true); // 🌟 2. สั่งเริ่มโหลด        
    try {
      if (sound) await sound.unloadAsync();

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audio_file_url },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // 🌟 สร้างตัวแปรมาดักค่า undefined
          const duration = status.durationMillis || 0; 

          // คำนวณเป็นวินาที
          setCurrentTime(status.positionMillis / 1000);
          setTotalDuration(duration / 1000); 
          
          // คำนวณสัดส่วน 0.0 - 1.0
          setProgressFraction(duration > 0 ? status.positionMillis / duration : 0); 
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTime(0);
            setProgressFraction(0);
          }
        }
      });
    } catch (error) {
      console.error("Error playing sound", error);
    } finally {
      setIsLoading(false); // 🌟 3. โหลดเสร็จแล้วปิด Loading
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
    // 🌟 พระเอกของเราอยู่บรรทัดนี้ครับ! เพิ่ม seekTo เข้าไปให้เรียบร้อยแล้ว
    <AudioContext.Provider value={{ 
      currentSong, 
      isPlaying, 
      isLoading, 
      currentTime, 
      totalDuration, 
      progressFraction,
      playSong, 
      togglePlayPause, 
      seekTo 
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