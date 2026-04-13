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
  playNext: (isAutoAdvance?: boolean) => Promise<void>;
  playPrevious: () => Promise<void>;
  queue: Song[];
  currentIndex: number;
  isShuffle: boolean;
  isRepeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  activeAiPrompt: string | null;
  isAiGenerating: boolean;
  startAiRadio: (prompt: string) => Promise<void>;
  clearAiRadio: () => void;
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
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // AI Radio Variables
  const [activeAiPrompt, setActiveAiPrompt] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiExhausted, setIsAiExhausted] = useState(false);
  const activeAiPromptRef = useRef(activeAiPrompt);
  const isAiGeneratingRef = useRef(isAiGenerating);
  const isRefillingRef = useRef(false);

  // ใช้ useRef เพื่อให้ callback ใน setOnPlaybackStatusUpdate เข้าถึงค่าล่าสุดได้
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const isShuffleRef = useRef(isShuffle);
  const isRepeatRef = useRef(isRepeat);

  useEffect(() => { activeAiPromptRef.current = activeAiPrompt; }, [activeAiPrompt]);
  useEffect(() => { isAiGeneratingRef.current = isAiGenerating; }, [isAiGenerating]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  const playNext = async (isAutoAdvance: boolean = false) => {
    // ถ้าผู้ใช้ปล่อยให้เพลงจบเอง (Auto Advance) และปุ่ม "วนเพลง" เปิดอยู่ -> เล่นเพลงเดิมซ้ำครับ
    if (isAutoAdvance && isRepeatRef.current) {
      const current = queueRef.current[currentIndexRef.current];
      if (current) {
        await playSong(current, queueRef.current);
      }
      return;
    }

    let nextIndex = currentIndexRef.current + 1;

    // Safety Net: Refill Infinite AI Radio BEFORE finishing the queue natively
    if (activeAiPromptRef.current && !isAiExhausted && !isRefillingRef.current) {
      if (queueRef.current.length - nextIndex <= 5) {
        refillAiRadio(); // Fire async background refill
      }
    }

    if (nextIndex >= queueRef.current.length) {
      if (isRepeatRef.current) {
        nextIndex = 1; // Loop back to start (กรณีผู้ใช้ลากกด next เองจนหมดคิว)
      } else {
        console.log("จบเพลย์ลิสต์แล้วครับ! (Playlist finished)");
        setIsPlaying(false);
        return;
      }
    }

    if (queueRef.current.length > 0 && nextIndex < queueRef.current.length) {
      const nextSong = queueRef.current[nextIndex];
      await playSong(nextSong, queueRef.current);
    }
  };

  const shuffleQueue = () => {
    if (queueRef.current.length <= 1) return;

    // Fisher-Yates array shuffle
    const newQueue = [...queueRef.current];
    for (let i = newQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
    }

    // Safely recalculate current position so playback isn't interrupted
    if (currentSong) {
      const newIndex = newQueue.findIndex(s => s.id === currentSong.id);
      if (newIndex !== -1) {
        setCurrentIndex(newIndex);
      }
    }

    setQueue(newQueue);
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

  const clearAiRadio = () => {
    setActiveAiPrompt(null);
    setIsAiExhausted(false);
    setIsAiGenerating(false);
    setQueue([]);
    setCurrentIndex(-1);
  };

  const startAiRadio = async (prompt: string) => {
    if (!prompt) return;
    try {
      clearAiRadio();
      setIsAiGenerating(true);
      setActiveAiPrompt(prompt);

      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      console.log('🔧 Backend URL:', BACKEND_URL);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('ไม่พบการยืนยันตัวตน กรุณาเข้าสู่ระบบใหม่');
      }

      const payload = {
        prompt,
        limit: 10,
        excludeIds: currentSong ? [currentSong.id] : []
      };

      console.log('📤 Sending to backend:', payload);

      const res = await fetch(`${BACKEND_URL}/api/ai/generate-playlist`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ AI Radio Error Response:", errorText);
        throw new Error(`Backend error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Received songs:', data.songs?.length || 0);
      
      if (data.songs && data.songs.length > 0) {
        // Log current queue состояние
        console.log(`📋 Current queue status: ${queueRef.current.length} songs`);
        const currentQueueIds = queueRef.current.map(s => s.id);
        console.log(`   IDs in queue: [${currentQueueIds.slice(0, 3).join(", ")}${currentQueueIds.length > 3 ? ", ..." : ""}]`);
        
        // Log current song
        if (currentSong) {
          console.log(`🎵 Current song: ${currentSong.id}`);
        }
        
        const existingIds = new Set(queueRef.current.map(song => song.id));
        if (currentSong) existingIds.add(currentSong.id);
        
        console.log(`🔍 Total existing IDs to exclude: ${existingIds.size}`);

        // Log received songs
        const receivedIds = data.songs.map((s: Song) => s.id);
        console.log(`📥 Received song IDs: [${receivedIds.slice(0, 3).join(", ")}${receivedIds.length > 3 ? ", ..." : ""}]`);
        
        const uniqueNewSongs = data.songs.filter((song: Song) => !existingIds.has(song.id));
        console.log(`✨ After filtering duplicates: ${uniqueNewSongs.length} unique new songs`);
        
        // Log which songs were filtered out
        const duplicates = data.songs.filter((song: Song) => existingIds.has(song.id));
        if (duplicates.length > 0) {
          console.log(`⚠️ Filtered out ${duplicates.length} duplicate/existing songs`);
          console.log(`   Duplicates: [${duplicates.slice(0, 3).map((s: Song) => s.id).join(", ")}${duplicates.length > 3 ? ", ..." : ""}]`);
        }

        if (uniqueNewSongs.length === 0) {
          setIsAiExhausted(true);
          setActiveAiPrompt(null);
          throw new Error('ไม่พบเพลงใหม่ในระบบ กรุณาลองค้นหาอารมณ์อื่นหรือปรับลิมิต');
        }

        let newQueue: Song[] = [];
        if (currentSong && currentIndexRef.current >= 0) {
          newQueue = queueRef.current.slice(0, currentIndexRef.current + 1);
        }
        newQueue = [...newQueue, ...uniqueNewSongs];

        setQueue(newQueue);

        if (!currentSong) {
          await playSong(uniqueNewSongs[0], newQueue);
        }
      } else {
        setIsAiExhausted(true);
        setActiveAiPrompt(null);
        throw new Error('ไม่พบเพลงที่ตรงกับอารมณ์นี้');
      }
    } catch (e) {
      console.error("❌ AI Radio Error:", e);
      throw e;
    } finally {
      setIsAiGenerating(false);
    }
  };

  const refillAiRadio = async () => {
    if (isRefillingRef.current || isAiExhausted || !activeAiPromptRef.current) return;

    try {
      isRefillingRef.current = true;
      console.log('🔄 Refilling AI Radio queue...');
      
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const currentQueueIds = queueRef.current.map(s => s.id);
      const payload = {
        prompt: activeAiPromptRef.current,
        limit: 5,
        excludeIds: currentQueueIds
      };

      console.log('📤 Refill payload:', { prompt: payload.prompt, excludeCount: payload.excludeIds.length });

      const res = await fetch(`${BACKEND_URL}/api/ai/generate-playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ AI Refill Error Response:", errorText);
        setIsAiExhausted(true);
        setActiveAiPrompt(null);
        return;
      }

      const data = await res.json();
      console.log('✅ Refill received songs:', data.songs?.length || 0);

      if (data.songs && data.songs.length > 0) {
        const existingIds = new Set(queueRef.current.map(song => song.id));
        if (currentSong) existingIds.add(currentSong.id);

        const uniqueNewSongs = data.songs.filter((song: Song) => !existingIds.has(song.id));

        if (uniqueNewSongs.length === 0) {
          setIsAiExhausted(true);
          setActiveAiPrompt(null);
          console.log("⚠️ AI Radio exhausted - no unique songs found");
          return;
        }

        setQueue(prev => [...prev, ...uniqueNewSongs]);
      } else {
        setIsAiExhausted(true);
        setActiveAiPrompt(null);
        console.log("⚠️ AI Radio exhausted - no songs returned");
      }
    } catch (e) {
      console.error("❌ AI Refill Error:", e);
    } finally {
      isRefillingRef.current = false;
    }
  };

  const playNextRef = useRef(playNext);
  playNextRef.current = playNext; // Bulletproof stale closure fix on every render

  const isTransitioningRef = useRef(false); // Fix didJustFinish race condition

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      // Keep UI playing truth
      setIsPlaying(status.isPlaying);
      // 🌟 Ensures your slider stays in-sync natively via position update:
      const duration = status.durationMillis || 0;
      setCurrentTime(status.positionMillis / 1000);
      setTotalDuration(duration / 1000);
      setProgressFraction(duration > 0 ? status.positionMillis / duration : 0);
      // 3. Auto-Play Implementation
      if (status.didJustFinish && !isTransitioningRef.current) {
        isTransitioningRef.current = true;

        if (playNextRef.current) {
          playNextRef.current(true); // Triggers explicitly that this is a native auto jump!
        }

        // Debounce to prevent multiple didJustFinish executions from Expo AV bugs
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 1500);
      }
    } else if (status.error) {
      console.error(`Playback Error: ${status.error}`);
    }
  };


  const playSong = async (song: Song, playlist: Song[] = []) => {
    try {
      setIsLoading(true);

      // Manual Override Safety Net
      if (playlist.length > 0 && playlist !== queueRef.current && !isAiGeneratingRef.current) {
        clearAiRadio();
      }

      // Queue Handle
      if (playlist.length > 0) {
        setQueue(playlist);
        setCurrentIndex(playlist.findIndex(s => s.id === song.id));
      }
      // Cleanup
      if (sound) {
        await sound.unloadAsync();
      }
      // Execution mapping to correctly load with bound listener
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audio_file_url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 }, // Updates slider every 0.5s smoothly
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setCurrentSong(song);
      setIsPlaying(true);

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

  const toggleShuffle = () => {
    const nextState = !isShuffle;
    setIsShuffle(nextState);
    if (nextState) {
      shuffleQueue();
    }
  };

  const toggleRepeat = () => {
    setIsRepeat(prev => !prev);
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
      playSong, togglePlayPause, seekTo, playNext, playPrevious, queue, currentIndex,
      isShuffle, isRepeat, toggleShuffle, toggleRepeat,
      activeAiPrompt, isAiGenerating, startAiRadio, clearAiRadio
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