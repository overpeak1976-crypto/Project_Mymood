import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, Image, ScrollView, TouchableOpacity, TextInput, Dimensions } from "react-native";
import { supabase } from "../../lib/supabase";
import { Play, Pause, Sparkles, Shuffle, SkipForward } from 'lucide-react-native';
import { useAudio } from '../../context/AudioContext';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  
  // 🌟 ดึง progressFraction มาจาก AudioContext
  const { currentSong, isPlaying, playSong, togglePlayPause, isLoading, progressFraction } = useAudio();
  
  const { width } = Dimensions.get('window');

  useEffect(() => {
    Promise.all([fetchProfile(), fetchSongs()]).finally(() => setLoading(false));
  }, []);

  async function fetchProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("users")
        .select("id, username, handle, profile_image_url")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  }

  async function fetchSongs() {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSongs(data || []);
    } catch (err) {
      console.error("Error fetching songs", err);
    }
  }

  const handlePlayAndNavigate = async (song: any) => {
    playSong(song);
    router.push('/player' as any);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F3FF]">
        <ActivityIndicator size="large" color="#6B21A8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F3FF]">
      <ScrollView className="flex-1">
        {/* Header Section */}
        <View className="pt-12 pb-6 px-6 bg-white rounded-b-[40px] shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-extrabold text-purple-900 mt-1">
                {profile?.username || "Guest"}!
              </Text>
              <Text className="text-purple-600 font-medium">@{profile?.handle || "User"}</Text>
            </View>

            <TouchableOpacity className="w-14 h-14 rounded-full border-2 border-purple-200 overflow-hidden shadow-sm">
              <Image
                source={{ uri: profile?.profile_image_url || "https://ui-avatars.com/api/?name=" + (profile?.username || "U") + "&background=random" }}
                className="w-full h-full"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View className="px-6 pt-6">

          <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center mb-6">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-3"></View>
            <Text className="text-gray-600 font-medium">คุณกำลังแสดงสถานะ<Text className="text-green-600 font-bold"> "ออนไลน์"</Text></Text>
          </View>

          <Text className="text-xl font-bold mb-3 text-gray-800">My mood</Text>
          <View className="flex-row items-center bg-white border border-purple-200 rounded-full px-4 py-3 shadow-sm mb-6">
            <Sparkles color="#8B5CF6" size={20} />
            <TextInput
              placeholder="บอกอารมณ์ของคุณตอนนี้..."
              className="flex-1 ml-3 text-base text-gray-800"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity className="bg-purple-100 px-4 py-1.5 rounded-full">
              <Text className="text-purple-700 font-bold">ค้นหา</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold mb-4 text-gray-800">เพลงใหม่ล่าสุด</Text>
          {songs.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">ยังไม่มีเพลงในระบบ</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 overflow-visible">
              {songs.map((song) => (
                <TouchableOpacity
                  key={song.id}
                  className="mr-5"
                  onPress={() => handlePlayAndNavigate(song)}
                >
                  <Image
                    source={{ uri: song.cover_image_url }}
                    className="w-36 h-36 rounded-2xl bg-gray-200 shadow-sm"
                  />
                  <Text className="font-bold text-gray-800 mt-3 text-base w-36" numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text className="text-gray-500 text-sm" numberOfLines={1}>{song.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View className="h-24" />
        </View>
      </ScrollView>

{/* 🎵 Mini Player - Liquid Fill Style 🎵 */}
      {currentSong && (
        <View className="absolute bottom-6 left-4 right-4 h-20 shadow-2xl rounded-[30px] overflow-hidden border border-white/60 bg-white/10">
          
          {/* 1. กระจกฝ้า (ฉากหลัง) */}
          <BlurView 
            intensity={80} 
            tint="light" 
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
          />

          {/* 🌟 2. หลอดเพลงแบบใหม่ (Background Fill) หมดปัญหาขอบกิน! */}
          {/* มันจะค่อยๆ เติมสีม่วงใสๆ ลงในแคปซูลจากซ้ายไปขวา โค้งรับมุมเป๊ะๆ */}
          <View 
            className="absolute top-0 bottom-0 left-0 bg-purple-500/25"
            style={{ width: `${(progressFraction || 0) * 100}%` }}
          />

          {/* 3. ส่วนเนื้อหา */}
          <View className="flex-1 flex-row items-center justify-between px-4 z-10">
            {/* ข้อมูลเพลง - กดแล้วขยายหน้าเต็ม */}
            <TouchableOpacity 
              className="flex-row items-center flex-1"
              onPress={() => router.push('/player' as any)}
            >
              <View className="shadow-lg shadow-purple-500/40">
                <Image 
                  source={{ uri: currentSong.cover_image_url }} 
                  className="w-12 h-12 rounded-2xl"
                />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text className="text-purple-600/70 text-xs font-medium mt-0.5" numberOfLines={1}>
                  {currentSong.artist}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ปุ่มควบคุม */}
            <View className="flex-row items-center gap-x-4">
              <TouchableOpacity onPress={togglePlayPause}>
                {isPlaying ? (
                  <Pause color="#7C3AED" size={28} fill="#7C3AED" />
                ) : (
                  <Play color="#7C3AED" size={28} fill="#7C3AED" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity>
                <Text className="text-purple-600 text-2xl font-light">|</Text>
              </TouchableOpacity>

              <TouchableOpacity>
            <SkipForward color="#7C3AED" size={28} fill="#7C3AED" />
          </TouchableOpacity>

            </View>
          </View>
        </View>
      )}
    </View>
  );
}