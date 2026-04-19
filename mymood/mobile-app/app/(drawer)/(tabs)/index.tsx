import React, { useEffect, useState, useRef, useCallback } from "react";
import { Text, View, ActivityIndicator, Image, ScrollView, TouchableOpacity, TextInput, RefreshControl } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { supabase } from "../../../lib/supabase";
import { httpClient } from "../../../lib/httpClient";
import { Sparkles, Flame, Sparkle, Headphones, Play, Plus, X, FolderHeart, Users, Crown, WifiOff, RefreshCw } from 'lucide-react-native';
import { useAudio } from '../../../context/AudioContext';
import { useUser } from "../../../context/UserContext";
import { useToast } from '../../../context/ToastContext';
import MiniPlayer from "../../../components/MiniPlayer";
import SongContextMenu from "../../../components/SongContextMenu";
import { Heart } from 'lucide-react-native';
import { ImageBackground } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from 'expo-linear-gradient';



export default function HomeScreen() {
  const { profile, likedSongIds, isUserLoading: contextLoading } = useUser();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { playSong } = useAudio();

  // ── Original Arrays ──
  const [newSongs, setNewSongs] = useState<any[]>([]);
  const [popularSongs, setPopularSongs] = useState<any[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<any[]>([]);

  // ── New API Arrays ──
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [friendsUploads, setFriendsUploads] = useState<any[]>([]);
  const [myTopSongs, setMyTopSongs] = useState<any[]>([]);

  // ── AI Generator States ──
  const [moodPrompt, setMoodPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string; description: string; songs: any[] } | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  // ── Server Status ──
  const [serverDown, setServerDown] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // ── Context Menu States ──
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedContextSong, setSelectedContextSong] = useState<any>(null);
  const aiSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (aiModalVisible) aiSheetRef.current?.expand();
    else aiSheetRef.current?.close();
  }, [aiModalVisible]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
        // Health check first
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const controller = new AbortController();
        const healthTimeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(backendUrl, { signal: controller.signal });
          clearTimeout(healthTimeout);
          if (!res.ok) throw new Error('Server not ok');
        } catch {
          clearTimeout(healthTimeout);
          if (isMounted) { setServerDown(true); setLoading(false); }
          return;
        }
        if (isMounted) setServerDown(false);

        const fetchPromise = fetchDashboardData();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase Timeout!")), 10000));
        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.access_token) loadInitialData(true);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const controller = new AbortController();
      const healthTimeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(backendUrl, { signal: controller.signal });
      clearTimeout(healthTimeout);
      if (!res.ok) throw new Error('Server not ok');
      setServerDown(false);
      await fetchDashboardData();
    } catch {
      setServerDown(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const controller = new AbortController();
      const healthTimeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(backendUrl, { signal: controller.signal });
      clearTimeout(healthTimeout);
      if (!res.ok) throw new Error('Server not ok');
      setServerDown(false);
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    } catch {
      setServerDown(true);
      showToast('เซิร์ฟเวอร์ยังไม่พร้อม ลองใหม่อีกครั้ง', 'error');
    } finally {
      setRetrying(false);
    }
  };

  async function fetchDashboardData() {
    const { data: { session } } = await supabase.auth.getSession();
    const myId = session?.user?.id;

    if (myId) {

      const { data: friendships } = await supabase.from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${myId},friend_id.eq.${myId}`);

      const friendIds = friendships?.map(f => f.user_id === myId ? f.friend_id : f.user_id) || [];

      if (friendIds.length > 0) {
        const { data: onlineFriends } = await supabase.from('users').select('id, username, profile_image_url, show_activity_status').in('id', friendIds).eq('is_online', true);
        if (onlineFriends && onlineFriends.length > 0) {
          // Only show activity for friends who have show_activity_status enabled
          const visibleFriends = onlineFriends.filter(f => f.show_activity_status !== false);
          const activities = await Promise.all(visibleFriends.map(async (friend) => {
            const { data: history } = await supabase.from('play_history').select(`played_at, song:songs (*)`).eq('user_id', friend.id).order('played_at', { ascending: false }).limit(1).maybeSingle();
            if (history && history.song && history.played_at) {
              // Only show if played within the last 15 minutes
              const playedAt = new Date(history.played_at).getTime();
              const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
              if (playedAt >= fifteenMinAgo) return { friend, song: history.song };
            }
            return null;
          }));
          setFriendsActivity(activities.filter(a => a !== null));
        } else {
          setFriendsActivity([]);
        }
      }

      // Fetch user-specific data via httpClient (auth handled automatically)
      try {
        const [myUploadsData, friendsUploadsData, topSongsData] = await Promise.all([
          httpClient.get<any[]>('/api/songs/my-uploads'),
          httpClient.get<any[]>('/api/songs/friends-uploads'),
          httpClient.get<any[]>('/api/songs/top-for-you'),
        ]);
        if (myUploadsData) setMyUploads(myUploadsData);
        if (friendsUploadsData) setFriendsUploads(friendsUploadsData);
        if (topSongsData) setMyTopSongs(topSongsData);
      } catch (e) {
        console.error("Failed to fetch new API segments: ", e);
      }
    }

    // Fetch new and popular songs via httpClient
    try {
      const [newData, popData] = await Promise.all([
        httpClient.get<any[]>('/api/songs?sort=newest&limit=10'),
        httpClient.get<any[]>('/api/songs?sort=popular&limit=10'),
      ]);
      if (newData) setNewSongs(Array.isArray(newData) ? newData : []);
      if (popData) setPopularSongs(Array.isArray(popData) ? popData : []);
    } catch (e) {
      console.error("Failed to fetch songs: ", e);
    }
  }

  const handleAiSearch = async () => {
    if (!moodPrompt.trim()) return;
    setIsAiLoading(true);
    setAiModalVisible(true);
    setAiResult(null);
    try {
      const data = await httpClient.post<{ songs?: any[]; title?: string; description?: string; message?: string }>('/api/ai/generate-playlist', {
        prompt: moodPrompt
      });

      if (data.songs && data.songs.length > 0) {
        setAiResult({
          title: data.title || 'AI Playlist',
          description: data.description || '',
          songs: data.songs
        });
      } else {
        showToast(data.message || "No songs found for this mood", 'info');
        setAiModalVisible(false);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
      setAiModalVisible(false);
    } finally {
      setIsAiLoading(false);
      setMoodPrompt("");
    }
  };

  const handleSaveAiPlaylist = async () => {
    if (!aiResult || aiResult.songs.length === 0) return;
    setIsSavingPlaylist(true);
    try {
      const songIds = aiResult.songs.map(s => s.id);
      await httpClient.post('/api/ai/save-playlist', {
        name: aiResult.title,
        description: aiResult.description,
        cover_image_url: aiResult.songs[0]?.cover_image_url || null,
        song_ids: songIds
      });

      showToast("Playlist saved to library!", 'success');
      setAiModalVisible(false);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handlePlayAndNavigate = (song: any, currentPlaylist: any[]) => {
    if (playSong) playSong(song, currentPlaylist);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F3FF]">
        <ActivityIndicator size="large" color="#6B21A8" />
      </View>
    );
  }

  if (serverDown) {
    return (
      <View className="flex-1 bg-[#F5F3FF] justify-center items-center px-8">
        <View className="bg-white rounded-3xl p-8 items-center shadow-lg w-full max-w-sm">
          <View className="w-20 h-20 bg-purple-100 rounded-full items-center justify-center mb-6">
            <WifiOff size={40} color="#7C3AED" />
          </View>
          <Text className="text-2xl font-extrabold text-gray-800 mb-2 text-center">
            ปิดปรับปรุงชั่วคราว
          </Text>
          <Text className="text-gray-500 text-center text-base mb-6 leading-6">
            เซิร์ฟเวอร์กำลังปิดปรับปรุง{"\n"}กรุณารอสักครู่แล้วลองใหม่อีกครั้ง
          </Text>
          <TouchableOpacity
            className="bg-purple-600 px-8 py-3.5 rounded-full flex-row items-center"
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <RefreshCw size={18} color="white" />
                <Text className="text-white font-bold text-base ml-2">ลองใหม่</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 text-xs mt-6">MyMood • Server Maintenance</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F3FF]">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Section ── */}
        <ImageBackground
          source={{
            uri: profile?.banner_image_url ||
              `https://ui-avatars.com/api/?name=${profile?.username || "U"}&background=7C3AED&color=fff`
          }}
          className="mb-6 z-10 w-full relative overflow-hidden "
        // ✅ แก้: ย้าย rounded มาที่นี่ + overflow-hidden
        >
          {/* ✅ เพิ่ม: Gradient overlay ไล่ระดับจากด้านล่างขึ้น ทำให้ข้อความอ่านง่ายขึ้น */}
          <LinearGradient
            colors={['transparent', 'rgba(245,243,255,0.95)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,          // 🔧 ปรับความสูงของ fade ได้ตามชอบ
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />

          {/* ✅ แก้: ลด intensity ลง + เปลี่ยน tint เพื่อให้ banner โชว์ผ่านมากขึ้น */}
          <BlurView
            intensity={30}
            tint="dark"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View className="pt-10 pb-10 px-5 z-10">

            {/* ── Row 1: Avatar + Name ── */}
            <View className="flex-row items-center gap-4">

              {/* ✅ เพิ่ม: Online indicator dot บน avatar */}
              <View className="relative">
                <TouchableOpacity
                  className="w-16 h-16 rounded-full border-2 border-purple-300 overflow-hidden shadow-lg"
                >
                  <Image
                    source={{
                      uri: profile?.profile_image_url ||
                        `https://ui-avatars.com/api/?name=${profile?.username || "U"}&background=random`
                    }}
                    className="w-full h-full"
                  />
                </TouchableOpacity>
                {/* ✅ เพิ่ม: สถานะ online */}
                <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
              </View>

              {/* Name block */}
              <View className="flex-1">


                <Text className="text-xl font-extrabold text-white leading-tight">
                  {profile?.username || "Guest"}
                </Text>
                <Text className="text-purple-300 text-sm font-medium">
                  @{profile?.handle || "user"}
                </Text>
              </View>
            </View>


          </View>
        </ImageBackground>

        <View className="px-6">
          {/* ── AI Search Section ── */}
          <View className="flex-row items-center mb-4">
            <Sparkles color="#8B5CF6" size={24} className="mr-2" />
            <Text className="text-xl font-bold text-gray-800">
              My mood
            </Text>
          </View>


          <View className="flex-row items-center bg-white border border-purple-200 rounded-full px-4 py-3 shadow-sm mb-8">
            <Sparkles color="#8B5CF6" size={20} />
            <TextInput
              placeholder="บอกอารมณ์ของคุณตอนนี้..."
              className="flex-1 ml-3 text-base text-gray-800"
              placeholderTextColor="#9CA3AF"
              value={moodPrompt}
              onChangeText={setMoodPrompt}
              onSubmitEditing={handleAiSearch}
            />
            <TouchableOpacity className="bg-purple-100 px-4 py-1.5 rounded-full" onPress={handleAiSearch}>
              <Text className="text-purple-700 font-bold">ค้นหา</Text>
            </TouchableOpacity>
          </View>

          {/* 🌟 Section: Friends' Activity (Original) */}
          {friendsActivity.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Headphones color="#8B5CF6" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">เพื่อนกำลังฟัง</Text>
              </View>

              <View className="flex-col">
                {friendsActivity.map((activity, index) => (
                  <TouchableOpacity
                    key={`activity-${index}`}
                    className="flex-row items-center bg-white rounded-3xl p-3 mb-3 border border-purple-100 shadow-sm"
                    onPress={() => handlePlayAndNavigate(activity.song, friendsActivity.map(a => a.song))}
                    onLongPress={() => { setSelectedContextSong(activity.song); setContextMenuVisible(true); }}
                  >
                    {/* ข้อมูลเพื่อน: Avatar & Online Status */}
                    <View className="relative mr-4">
                      <Image
                        source={{ uri: activity.friend.profile_image_url || 'https://ui-avatars.com/api/?name=U' }}
                        className="w-14 h-14 rounded-full bg-gray-200"
                      />
                      <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                    </View>

                    {/* ข้อมูลการฟังเพลง */}
                    <View className="flex-1 justify-center">
                      <Text className="text-gray-500 text-xs mb-0.5">
                        <Text className="font-bold text-gray-800 text-sm">{activity.friend.username}</Text> กำลังฟัง
                      </Text>
                      <Text className="font-bold text-purple-900 text-base" numberOfLines={1}>
                        {activity.song.title}
                      </Text>
                      <Text className="text-purple-600 font-medium text-xs mt-0.5" numberOfLines={1}>
                        {activity.song.artist}
                      </Text>
                    </View>

                    {/* ปกเพลงขวาแนบ */}
                    <Image
                      source={{ uri: activity.song.cover_image_url || 'https://ui-avatars.com/api/?name=Song' }}
                      className="w-12 h-12 rounded-xl bg-gray-100 ml-2"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}


          {/* 🌟 Section: Top For You */}
          {myTopSongs.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Crown color="#8B5CF6" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">เพลงประจำตัวคุณ (Top for You)</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                {myTopSongs.map((song) => (
                  <TouchableOpacity
                    key={`top-${song.id}`}
                    className="mr-5 relative"
                    onPress={() => handlePlayAndNavigate(song, myTopSongs)}
                    onLongPress={() => { setSelectedContextSong(song); setContextMenuVisible(true); }}
                  >
                    <View className="relative">
                      <Image source={{ uri: song.cover_image_url }} className="w-40 h-40 rounded-3xl bg-gray-200 shadow-md" />
                      {likedSongIds.has(song.id) && (
                        <View className="absolute top-2 right-2 bg-red-500 rounded-full p-1 shadow-sm">
                          <Heart size={12} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                    <Text className="font-bold text-gray-800 mt-3 text-lg w-40" numberOfLines={1}>{song.title}</Text>
                    <Text className="text-purple-600 font-semibold text-sm w-40" numberOfLines={1}>{song.artist}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 🌟 Section: New Songs (Original) */}
          {newSongs.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Sparkle color="#8B5CF6" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">เพลงใหม่ล่าสุด (New Releases)</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                {newSongs.map((song) => (
                  <TouchableOpacity
                    key={`new-${song.id}`}
                    className="mr-5"
                    onPress={() => handlePlayAndNavigate(song, newSongs)}
                    onLongPress={() => { setSelectedContextSong(song); setContextMenuVisible(true); }}
                  >
                    <View className="relative">
                      <Image source={{ uri: song.cover_image_url }} className="w-36 h-36 rounded-2xl bg-gray-200 shadow-sm" />
                      {likedSongIds.has(song.id) && (
                        <View className="absolute top-2 right-2 bg-red-500 rounded-full p-1 shadow-sm">
                          <Heart size={10} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                    <Text className="font-bold text-gray-800 mt-3 text-base w-36" numberOfLines={1}>{song.title}</Text>
                    <Text className="text-gray-500 text-sm w-36" numberOfLines={1}>{song.artist}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 🌟 Section: Popular Songs (Original) */}
          {popularSongs.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Flame color="#F97316" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">Top 10 เพลงยอดฮิต</Text>
              </View>
              <View>
                {popularSongs.map((song, index) => (
                  <TouchableOpacity
                    key={`pop-${song.id}`}
                    className="flex-row items-center mb-3 bg-white rounded-2xl p-3 shadow-sm"
                    onPress={() => handlePlayAndNavigate(song, popularSongs)}
                    onLongPress={() => { setSelectedContextSong(song); setContextMenuVisible(true); }}
                  >
                    {/* Ranking Number */}
                    <Text className={`text-2xl font-extrabold w-10 text-center ${index < 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {index + 1}
                    </Text>

                    {/* Cover Image */}
                    <View className="relative">
                      <Image source={{ uri: song.cover_image_url }} className="w-14 h-14 rounded-xl bg-gray-200 ml-2" />
                      {likedSongIds.has(song.id) && (
                        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                          <Heart size={8} color="white" fill="white" />
                        </View>
                      )}
                    </View>

                    {/* Song Info */}
                    <View className="flex-1 ml-4">
                      <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>{song.title}</Text>
                      <Text className="text-gray-500 text-sm" numberOfLines={1}>{song.artist}</Text>
                    </View>

                    {/* Play Count */}
                    <View className="flex-row items-center mr-2">
                      <Headphones size={14} color="#9CA3AF" />
                      <Text className="text-gray-400 text-xs ml-1">{song.play_count || 0}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 🌟 Section: Friends Uploads */}
          {friendsUploads.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Users color="#8B5CF6" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">เพลงจากเพื่อนคุณ</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                {friendsUploads.map((song) => (
                  <TouchableOpacity
                    key={`friend-up-${song.id}`}
                    className="mr-5"
                    onPress={() => handlePlayAndNavigate(song, friendsUploads)}
                    onLongPress={() => { setSelectedContextSong(song); setContextMenuVisible(true); }}
                  >
                    <View className="relative">
                      <Image source={{ uri: song.cover_image_url }} className="w-32 h-32 rounded-xl bg-gray-200 shadow-sm" />
                      {likedSongIds.has(song.id) && (
                        <View className="absolute top-1 right-1 bg-red-500 rounded-full p-1 shadow-sm">
                          <Heart size={10} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                    <Text className="font-bold text-gray-800 mt-3 text-sm w-32" numberOfLines={1}>{song.title}</Text>
                    <Text className="text-gray-500 text-xs w-32" numberOfLines={1}>{song.artist}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 🌟 Section: My Uploads */}
          {myUploads.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <FolderHeart color="#8B5CF6" size={24} className="mr-2" />
                <Text className="text-xl font-bold text-gray-800">เพลงที่ฉันอัปโหลด</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                {myUploads.map((song) => (
                  <TouchableOpacity
                    key={`my-up-${song.id}`}
                    className="mr-5"
                    onPress={() => handlePlayAndNavigate(song, myUploads)}
                    onLongPress={() => { setSelectedContextSong(song); setContextMenuVisible(true); }}
                  >
                    <View className="relative">
                      <Image source={{ uri: song.cover_image_url }} className="w-32 h-32 rounded-xl bg-gray-200 shadow-sm" />
                      {likedSongIds.has(song.id) && (
                        <View className="absolute top-1 right-1 bg-red-500 rounded-full p-1 shadow-sm">
                          <Heart size={10} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                    <Text className="font-bold text-gray-800 mt-3 text-sm w-32" numberOfLines={1}>{song.title}</Text>
                    <Text className="text-gray-500 text-xs w-32" numberOfLines={1}>{song.artist}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}


          <View className="h-24" />
        </View>
      </ScrollView>

      {/* ── AI Bottom Sheet ── */}
      <BottomSheet
        ref={aiSheetRef}
        index={-1}
        enableDynamicSizing={true}
        enablePanDownToClose={true}
        onClose={() => setAiModalVisible(false)}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ borderRadius: 32 }}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              className="absolute top-0 right-0 z-10 w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              onPress={() => setAiModalVisible(false)}
            >
              <X size={20} color="#4B5563" />
            </TouchableOpacity>

            {isAiLoading ? (
              <View className="flex-1 justify-center items-center py-10">
                <Sparkles size={48} color="#8B5CF6" className="mb-4" />
                <Text className="text-xl font-bold text-purple-900 mb-2">AI is thinking...</Text>
                <Text className="text-gray-500 text-center mb-6">✨ กำลังให้ AI จัดเพลย์ลิสต์...</Text>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : aiResult ? (

              <View className="flex-1 mt-6">
                <View className="items-center mb-6">
                  <View className="w-24 h-24 rounded-2xl bg-purple-100 items-center justify-center mb-4 shadow-sm overflow-hidden">
                    {aiResult.songs[0]?.cover_image_url ? (
                      <Image source={{ uri: aiResult.songs[0].cover_image_url }} className="w-full h-full" />
                    ) : (
                      <Sparkles size={40} color="#8B5CF6" />
                    )}
                  </View>
                  <Text className="text-2xl font-bold text-center text-gray-800 mb-2">{aiResult.title}</Text>
                  <Text className="text-center text-gray-500 mb-4">{aiResult.description}</Text>
                </View>

                <View className="flex-row justify-center space-x-4 mb-6 gap-3">
                  <TouchableOpacity
                    className="flex-row items-center bg-purple-600 px-6 py-3 rounded-full flex-1 justify-center"
                    onPress={() => handlePlayAndNavigate(aiResult.songs[0], aiResult.songs)}
                  >
                    <Play size={20} color="white" fill="white" className="mr-2" />
                    <Text className="text-white font-bold text-base">Play All</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center bg-purple-100 border border-purple-300 px-6 py-3 rounded-full flex-1 justify-center"
                    onPress={handleSaveAiPlaylist}
                    disabled={isSavingPlaylist}
                  >
                    {isSavingPlaylist ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <>
                        <Plus size={20} color="#7C3AED" className="mr-2" />
                        <Text className="text-purple-700 font-bold text-base">Save Playlist</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <Text className="font-bold text-lg mb-3">เพลงในแนวนี้ ({aiResult.songs.length})</Text>

                {aiResult.songs.map((song, idx) => (
                  <TouchableOpacity
                    key={`ai-${idx}`}
                    className="flex-row items-center mb-4 bg-gray-50 p-3 rounded-2xl"
                    onPress={() => playSong && playSong(song, aiResult.songs)}
                  >
                    <Image source={{ uri: song.cover_image_url }} className="w-14 h-14 rounded-xl mr-3 bg-gray-200" />
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>{song.title}</Text>
                      <Text className="text-gray-500 text-sm" numberOfLines={1}>{song.artist}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

              </View>

            ) : null}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Mini Player */}
      <MiniPlayer />
      <SongContextMenu
        visible={contextMenuVisible}
        song={selectedContextSong}
        onClose={() => setContextMenuVisible(false)}

      />

    </View>
  );
}