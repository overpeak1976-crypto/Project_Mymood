import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, Image, ScrollView, TouchableOpacity, TextInput, Dimensions, RefreshControl } from "react-native";
import { supabase } from "../../../lib/supabase";
import { Sparkles, Flame, Sparkle, Headphones } from 'lucide-react-native'; // 🌟 เพิ่มไอคอน Headphones
import { useAudio } from '../../../context/AudioContext';
import MiniPlayer from "../../../components/MiniPlayer";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [newSongs, setNewSongs] = useState<any[]>([]);
  const [popularSongs, setPopularSongs] = useState<any[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { playSong } = useAudio();
  const [topGenres, setTopGenres] = useState<{ name: string, count: number }[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    loadInitialData();
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${BACKEND_URL}/api/users/my-top-genres`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    const data = await res.json();
    setTopGenres(data.topGenres);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  async function fetchDashboardData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id;

      if (myId) {
        // ดึงโปรไฟล์ตัวเอง
        const { data: profileData } = await supabase
          .from("users")
          .select("id, username, handle, profile_image_url")
          .eq("id", myId)
          .single();
        setProfile(profileData);

        //  ดึงรายชื่อเพื่อนของเรา (ที่ accept แล้ว)
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${myId},friend_id.eq.${myId}`);

        const friendIds = friendships?.map(f => f.user_id === myId ? f.friend_id : f.user_id) || [];

        // ดึงเพลงล่าสุดของเพื่อน (เอาเฉพาะคนที่กำลังออนไลน์)
        if (friendIds.length > 0) {
          const { data: onlineFriends } = await supabase
            .from('users')
            .select('id, username, profile_image_url')
            .in('id', friendIds)
            .eq('is_online', true); // เช็คว่าออนไลน์

          if (onlineFriends && onlineFriends.length > 0) {
            const activities = await Promise.all(onlineFriends.map(async (friend) => {
              // ไปดูในประวัติการฟังล่าสุดของเพื่อนคนนี้ (1 เพลงล่าสุด)
              const { data: history } = await supabase
                .from('play_history')
                .select(`
                  played_at,
                  song:songs (*)
                `)
                .eq('user_id', friend.id)
                .order('played_at', { ascending: false })
                .limit(1)
                .maybeSingle(); // ใช้ maybeSingle เพื่อไม่ให้ error ถ้าเพื่อนไม่เคยฟังเพลงเลย

              if (history && history.song) {
                return { friend, song: history.song };
              }
              return null;
            }));

            // กรองเอาเฉพาะเพื่อนที่มีประวัติฟังเพลงจริงๆ
            setFriendsActivity(activities.filter(a => a !== null));
          } else {
            setFriendsActivity([]);
          }
        }
      }

      // ดึงเพลงใหม่
      const { data: newData } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (newData) setNewSongs(newData);

      // ดึงเพลงฮิต
      const { data: popData } = await supabase
        .from("songs")
        .select("*")
        .order("play_count", { ascending: false, nullsFirst: false })
        .limit(10);
      if (popData) setPopularSongs(popData);

    } catch (err) {
      console.error("Error fetching dashboard data", err);
    }
  }

  const handlePlayAndNavigate = async (song: any, currentPlaylist: any[]) => {
    if (playSong) {
      playSong(song, currentPlaylist);
    }
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
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
        }
      >
        {/* Header Section */}
        <View className="pt-6 pb-6 px-6 bg-white rounded-b-[40px] shadow-sm">
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
          {/* AI Search Section */}
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

          {/* 🌟 Section ใหม่: เพื่อนกำลังฟัง (Friends' Activity) */}
          {friendsActivity.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Headphones color="#8B5CF6" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">เพื่อนกำลังฟัง</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                {friendsActivity.map((activity, index) => (
                  <TouchableOpacity
                    key={index}
                    className="mr-4 bg-white rounded-3xl p-3 border border-purple-100 shadow-sm w-48"
                    onPress={() => handlePlayAndNavigate(activity.song, friendsActivity.map(a => a.song))}
                  >
                    {/* ข้อมูลเพื่อน */}
                    <View className="flex-row items-center mb-3">
                      <View className="relative">
                        <Image
                          source={{ uri: activity.friend.profile_image_url || 'https://ui-avatars.com/api/?name=U' }}
                          className="w-8 h-8 rounded-full"
                        />
                        <View className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                      </View>
                      <Text className="ml-2 text-xs font-bold text-gray-700 flex-1" numberOfLines={1}>
                        {activity.friend.username}
                      </Text>
                    </View>

                    {/* ข้อมูลเพลงที่เพื่อนฟัง */}
                    <Image
                      source={{ uri: activity.song.cover_image_url }}
                      className="w-full h-32 rounded-2xl bg-gray-200"
                    />
                    <Text className="font-bold text-gray-800 mt-2 text-sm" numberOfLines={1}>
                      {activity.song.title}
                    </Text>
                    <Text className="text-purple-600 text-xs font-medium" numberOfLines={1}>
                      {activity.song.artist}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Section 1: เพลงใหม่ล่าสุด */}
          <View className="flex-row items-center mb-4 mt-2">
            <Sparkle color="#8B5CF6" size={24} className="mr-2" />
            <Text className="text-xl font-bold text-gray-800">เพลงใหม่ล่าสุด</Text>
          </View>

          {newSongs.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">ยังไม่มีเพลงในระบบ</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 overflow-visible">
              {newSongs.map((song) => (
                <TouchableOpacity
                  key={song.id}
                  className="mr-5"
                  onPress={() => handlePlayAndNavigate(song, newSongs)}
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

          {/* Section 2: เพลงฮิตติดชาร์ต (ฟังบ่อย) */}
          <View className="flex-row items-center mb-4">
            <Flame color="#F97316" size={24} className="mr-2" />
            <Text className="text-xl font-bold text-gray-800">ฮิตติดชาร์ต (ฟังบ่อย)</Text>
          </View>

          {popularSongs.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">ยังไม่มีข้อมูลเพลงฮิต</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 overflow-visible">
              {popularSongs.map((song) => (
                <TouchableOpacity
                  key={`pop-${song.id}`}
                  className="mr-5"
                  onPress={() => handlePlayAndNavigate(song, popularSongs)}
                >
                  <Image
                    source={{ uri: song.cover_image_url }}
                    className="w-32 h-32 rounded-full bg-gray-200 shadow-sm"
                  />
                  <Text className="font-bold text-gray-800 mt-3 text-base w-32 text-center" numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text className="text-gray-500 text-sm text-center" numberOfLines={1}>
                    {song.play_count || 0} views
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View className="h-24" />
        </View>
      </ScrollView>
      {/* Mini Player */}
      <MiniPlayer />
    </View>
  );
}