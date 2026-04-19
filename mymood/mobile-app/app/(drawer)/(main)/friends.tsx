import "../../global.css";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl, Modal, FlatList } from "react-native";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Search, UserPlus, Check, X, ChevronRight, Users, Send, Music, ArrowLeft } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { httpClient } from "@/services/httpClient";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "expo-router";
import MiniPlayer from "@/components/MiniPlayer";

export default function FriendsScreen() {
  const { showToast } = useToast();
  const { likedSongs } = useUser();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Send song modal state
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [sendTargetFriend, setSendTargetFriend] = useState<any>(null);
  const [sendMessage, setSendMessage] = useState("");
  const [songSearchText, setSongSearchText] = useState("");
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFriendsData = async (isBackground = false) => {
      if (!isBackground) setLoading(true);

      try {
        const [friendsData, reqData, sentData] = await Promise.all([
          httpClient.get<{ friends: any[] }>('/api/friends/list'),
          httpClient.get<{ requests: any[] }>('/api/friends/requests'),
          httpClient.get<{ sent_requests: any[] }>('/api/friends/sent-requests'),
        ]);

        if (isMounted) {
          setFriends(friendsData?.friends || []);
          setRequests(reqData?.requests || []);
          setSentRequests(sentData?.sent_requests || []);
        }

      } catch (error: any) {
        console.error(' Friends API Error:', error?.message ?? error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadFriendsData();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.access_token) {
        loadFriendsData(true);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshTrigger]);
  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger(t => t + 1);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const data = await httpClient.get<any[]>(`/api/users/search/${searchText}`);
      setSearchResults(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    try {
      await httpClient.post('/api/users/add-friend', { targetUserId: targetId });
      showToast("Friend request sent!", "success");
      setSearchText('');
      setSearchResults([]);
      setRefreshTrigger(t => t + 1);
    } catch (error: any) {
      showToast(`${error.message}`, 'error');
    }
  };

  const handleRequestAction = async (targetId: string, action: 'confirm' | 'delete' | 'cancel') => {
    try {
      if (action === 'confirm') {
        await httpClient.put('/api/users/accept-friend', { senderId: targetId });
        setRequests(requests.filter(req => req.senderId !== targetId));
      } else {
        await httpClient.delete(`/api/friends/reject/${targetId}`);
        if (action === 'cancel') {
          setSentRequests(sentRequests.filter(req => req.receiverId !== targetId));
        } else {
          setRequests(requests.filter(req => req.senderId !== targetId));
        }
      }

      if (action === 'confirm') setRefreshTrigger(t => t + 1);

    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  const openSendSongModal = (friend: any) => {
    setSendTargetFriend(friend);
    setSelectedSong(null);
    setSendMessage("");
    setSongSearchText("");
    setSendModalVisible(true);
  };

  const handleSendSong = async () => {
    if (!selectedSong || !sendTargetFriend) return;
    setIsSending(true);
    try {
      await httpClient.post('/api/inbox/share', {
        receiverId: sendTargetFriend.id,
        songId: selectedSong.id,
        message: sendMessage.trim() || null,
      });
      showToast(`ส่งเพลงให้ ${sendTargetFriend.username} แล้ว! 🎵`, "success");
      setSendModalVisible(false);
    } catch (error: any) {
      showToast("ส่งเพลงไม่สำเร็จ", "error");
    } finally {
      setIsSending(false);
    }
  };

  const filteredSongs = likedSongs.filter((s: any) =>
    !songSearchText.trim() ||
    s.title?.toLowerCase().includes(songSearchText.toLowerCase()) ||
    s.artist?.toLowerCase().includes(songSearchText.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-[#FDFEFE] px-6 pt-12">
        <SkeletonLoader width="55%" height={28} className="mb-4" />
        <SkeletonLoader width="100%" height={44} borderRadius={22} className="mb-6" />
        {[1,2,3,4,5].map(i => (
          <View key={i} className="flex-row items-center mb-4" style={{ gap: 12 }}>
            <SkeletonLoader width={48} height={48} borderRadius={24} />
            <View style={{ flex: 1 }}>
              <SkeletonLoader width="60%" height={16} className="mb-2" />
              <SkeletonLoader width="35%" height={12} />
            </View>
            <SkeletonLoader width={70} height={32} borderRadius={16} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFEFE] px-6 pt-12 relative">
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-3xl font-extrabold text-purple-900">My Friends</Text>
          <TouchableOpacity className="p-2">
            <Users color="#7C3AED" size={24} />
          </TouchableOpacity>
        </View>
        <Text className="text-gray-500 mb-6">Search and manage your friends</Text>

        <View className="flex-row items-center bg-white border border-purple-100 rounded-full px-5 py-4 shadow-sm mb-6">
          <Search color="#9CA3AF" size={20} />
          <TextInput
            placeholder="Search friends by @handle..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            className="flex-1 ml-3 text-base text-gray-800"
            autoCapitalize="none"
          />
          {isSearching && <ActivityIndicator color="#7C3AED" size="small" />}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
      >

        {searchResults.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-bold text-gray-800 mb-4">Search Results</Text>
            {searchResults.map((user) => (
              <View key={user.id} className="flex-row items-center bg-purple-50 p-4 rounded-2xl mb-3 shadow-sm border border-purple-100">
                <Image source={{ uri: user.profile_image_url || 'https://ui-avatars.com/api/?name=U' }} className="w-12 h-12 rounded-full" />
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-gray-900">{user.username}</Text>
                  <Text className="text-gray-500 text-xs">@{user.handle}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => sendFriendRequest(user.id)}
                  className="bg-purple-600 px-4 py-2 rounded-full flex-row items-center"
                >
                  <UserPlus color="#fff" size={16} />
                  <Text className="text-white ml-2 font-bold text-xs">Send Friend Request</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Incoming Friend Requests */}
        {requests.length > 0 && (
          <View className="mb-8 overflow-visible">
            <Text className="text-xl font-bold text-gray-800 mb-4">Incoming Friend Requests ({requests.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              {requests.map(item => (
                <View key={item.senderId} className="bg-white rounded-3xl p-5 mr-4 items-center shadow-sm border border-purple-50 w-60">
                  <Image source={{ uri: item.sender?.profile_image_url || 'https://ui-avatars.com/api/?name=U' }} className="w-16 h-16 rounded-full mb-3" />
                  <Text className="font-bold text-gray-900 text-lg" numberOfLines={1}>{item.sender?.username || 'Unknown User'}</Text>
                  <Text className="text-gray-500 mb-5 text-sm">@{item.sender?.handle || 'unknown'}</Text>

                  <View className="flex-row gap-x-3 w-full">
                    <TouchableOpacity
                      onPress={() => handleRequestAction(item.senderId, 'confirm')}
                      className="flex-1 bg-purple-600 py-3 rounded-xl items-center justify-center flex-row gap-x-1.5"
                    >
                      <Check color="#fff" size={18} />
                      <Text className="text-white font-bold text-xs">Confirm</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRequestAction(item.senderId, 'delete')}
                      className="flex-1 border border-purple-200 py-3 rounded-xl items-center justify-center flex-row gap-x-1.5"
                    >
                      <X color="#9333ea" size={18} />
                      <Text className="text-purple-700 font-bold text-xs">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Outgoing Friend Requests */}
        {sentRequests.length > 0 && (
          <View className="mb-8 overflow-visible">
            <Text className="text-lg font-bold text-gray-800 mb-4">Outgoing Friend Requests ({sentRequests.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              {sentRequests.map(item => (
                <View key={item.receiverId} className="bg-purple-50 rounded-3xl p-4 mr-4 items-center shadow-sm border border-purple-100 w-48">
                  <Image source={{ uri: item.receiver?.profile_image_url || 'https://ui-avatars.com/api/?name=U' }} className="w-12 h-12 rounded-full mb-2 opacity-80" />
                  <Text className="font-bold text-gray-900 text-sm" numberOfLines={1}>{item.receiver?.username || 'Unknown'}</Text>
                  <Text className="text-gray-500 mb-3 text-xs">Pending...</Text>

                  <TouchableOpacity
                    onPress={() => handleRequestAction(item.receiverId, 'cancel')}
                    className="w-full bg-white border border-gray-200 py-2 rounded-lg items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold text-xs">Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Friends */}
        <View className="mb-24">
          <Text className="text-xl font-bold text-gray-800 mb-4">All Friends ({friends.length})</Text>
          {friends.length === 0 ? (
            <Text className="text-gray-500 text-center py-6">No friends found.</Text>
          ) : (
            friends.map(item => (
              <View key={item.id} className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-50">
                {/* Profile - tappable to view public profile */}
                <TouchableOpacity
                  className="flex-row items-center flex-1"
                  onPress={() => router.push({ pathname: "/(drawer)/(main)/user/[id]", params: { id: item.id } })}
                  activeOpacity={0.7}
                >
                  <View className="relative">
                    <Image source={{ uri: item.profile_image_url || 'https://ui-avatars.com/api/?name=U' }} className="w-14 h-14 rounded-full" />
                    <View className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${item.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="font-bold text-gray-900 text-base">{item.username}</Text>
                    <Text className="text-gray-500 text-xs mt-1">@{item.handle}</Text>
                  </View>
                </TouchableOpacity>

                {/* Send song button */}
                <TouchableOpacity
                  onPress={() => openSendSongModal(item)}
                  className="bg-purple-100 p-3 rounded-full mr-2"
                  activeOpacity={0.7}
                >
                  <Send color="#7C3AED" size={18} />
                </TouchableOpacity>

                <ChevronRight color="#D1D5DB" size={20} />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Send Song Modal */}
      <Modal
        visible={sendModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSendModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] pt-4">
            {/* Header */}
            <View className="flex-row items-center px-5 pb-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setSendModalVisible(false)} className="p-1">
                <ArrowLeft color="#374151" size={22} />
              </TouchableOpacity>
              <View className="flex-1 items-center">
                <Text className="text-lg font-bold text-gray-900">
                  Send song to {sendTargetFriend?.username}
                </Text>
                <Text className="text-xs text-gray-400">Select a song to send to your friend.</Text>
              </View>
              <View className="w-8" />
            </View>

            {/* Song search */}
            <View className="px-5 py-3">
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-full px-4 py-3">
                <Search color="#9CA3AF" size={18} />
                <TextInput
                  placeholder="Search for a song..."
                  value={songSearchText}
                  onChangeText={setSongSearchText}
                  className="flex-1 ml-3 text-sm text-gray-800"
                />
              </View>
            </View>

            {/* Song list */}
            <FlatList
              data={filteredSongs}
              keyExtractor={(item: any) => item.id}
              className="px-5"
              style={{ maxHeight: 300 }}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Music color="#D8B4FE" size={32} />
                  <Text className="text-gray-400 mt-2 text-sm">No songs found.</Text>
                </View>
              }
              renderItem={({ item }: { item: any }) => {
                const isSelected = selectedSong?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedSong(item)}
                    className={`flex-row items-center p-3 rounded-xl mb-2 ${isSelected ? 'bg-purple-100 border border-purple-300' : 'bg-gray-50'}`}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.cover_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=7C3AED&color=fff` }}
                      className="w-11 h-11 rounded-lg"
                    />
                    <View className="ml-3 flex-1">
                      <Text className={`font-semibold text-sm ${isSelected ? 'text-purple-700' : 'text-gray-900'}`} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text className="text-gray-500 text-xs" numberOfLines={1}>{item.artist}</Text>
                    </View>
                    {isSelected && (
                      <View className="bg-purple-600 w-6 h-6 rounded-full items-center justify-center">
                        <Check color="#fff" size={14} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Message input */}
            <View className="px-5 pt-3 pb-2">
              <TextInput
                placeholder="Write a message (optional)"
                value={sendMessage}
                onChangeText={setSendMessage}
                maxLength={100}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-800"
              />
              <Text className="text-right text-xs text-gray-400 mt-1">{sendMessage.length}/100</Text>
            </View>

            {/* Send button */}
            <View className="px-5 pb-8 pt-2">
              <TouchableOpacity
                onPress={handleSendSong}
                disabled={!selectedSong || isSending}
                className={`flex-row items-center justify-center py-4 rounded-2xl ${selectedSong ? 'bg-purple-600' : 'bg-gray-200'}`}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Send color={selectedSong ? "#fff" : "#9CA3AF"} size={18} />
                    <Text className={`ml-2 font-bold text-base ${selectedSong ? 'text-white' : 'text-gray-400'}`}>
                      Send Song
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <MiniPlayer />
    </View>
  );
}