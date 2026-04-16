import "../../global.css";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, RefreshControl } from "react-native";

import { Search, UserPlus, Check, X, ChevronRight, Users, Send } from "lucide-react-native";
import { supabase } from "../../../lib/supabase"; 

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function FriendsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [requests, setRequests] = useState<any[]>([]); 
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      const headers = { 'Authorization': `Bearer ${token}` };
      const friendsRes = await fetch(`${BACKEND_URL}/api/friends/list`, { headers });
      const friendsData = await friendsRes.json();
      setFriends(friendsData.friends || []);
      const reqRes = await fetch(`${BACKEND_URL}/api/friends/requests`, { headers });
      const reqData = await reqRes.json();
      setRequests(reqData.requests || []);
      const sentRes = await fetch(`${BACKEND_URL}/api/friends/sent-requests`, { headers });
      const sentData = await sentRes.json();
      setSentRequests(sentData.sent_requests || []);
    } catch (error) {
      console.error("Error loading friends data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFriendsData();
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/users/search/${searchText}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/users/add-friend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ targetUserId: targetId })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      Alert.alert("สำเร็จ!", "ส่งคำขอเป็นเพื่อนไปแล้ว รอเขารับแอดนะ ⏳");
      setSearchText(""); 
      setSearchResults([]);
      loadFriendsData();
    } catch (error: any) {
      Alert.alert("อ๊ะ!", error.message);
    }
  };

const handleRequestAction = async (targetId: string, action: 'confirm' | 'delete' | 'cancel') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (action === 'confirm') {
        await fetch(`${BACKEND_URL}/api/users/accept-friend`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ senderId: targetId })
        });
        setRequests(requests.filter(req => req.senderId !== targetId));
      } else {
        await fetch(`${BACKEND_URL}/api/friends/reject/${targetId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (action === 'cancel') {
          setSentRequests(sentRequests.filter(req => req.receiverId !== targetId));
        } else {
          setRequests(requests.filter(req => req.senderId !== targetId));
        }
      }
      
      if (action === 'confirm') loadFriendsData(); 
      
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F3FF]">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFEFE] px-6 pt-16 relative">
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-3xl font-extrabold text-purple-900">My Friends</Text>
          <TouchableOpacity className="p-2">
            <Users color="#7C3AED" size={24} />
          </TouchableOpacity>
        </View>
        <Text className="text-gray-500 mb-6">ค้นหาและจัดการเพื่อนของคุณ</Text>
        
        <View className="flex-row items-center bg-white border border-purple-100 rounded-full px-5 py-4 shadow-sm mb-6">
          <Search color="#9CA3AF" size={20} />
          <TextInput
            placeholder="ค้นหาเพื่อนด้วย @handle..."
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
            <Text className="text-lg font-bold text-gray-800 mb-4">ผลการค้นหา</Text>
            {searchResults.map((user) => (
              <TouchableOpacity 
                  key={user.id} 
                  onPress={() => router.push(`/ProfilePublic/${user.id}`)}
                  className="flex-row items-center bg-purple-50 p-4 rounded-2xl mb-3 shadow-sm border border-purple-100">
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
                  <Text className="text-white ml-2 font-bold text-xs">แอดเพื่อน</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ใครแอดมาบ้าง (Incoming) */}
        {requests.length > 0 && (
          <View className="mb-8 overflow-visible">
            <Text className="text-xl font-bold text-gray-800 mb-4">มีคนอยากเป็นเพื่อน ({requests.length})</Text>
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
                      <Text className="text-white font-bold text-xs">รับแอด</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleRequestAction(item.senderId, 'delete')}
                      className="flex-1 border border-purple-200 py-3 rounded-xl items-center justify-center flex-row gap-x-1.5"
                    >
                      <X color="#9333ea" size={18} />
                      <Text className="text-purple-700 font-bold text-xs">ลบ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/*คำขอที่เราส่งไป (Outgoing/Sent) */}
        {sentRequests.length > 0 && (
          <View className="mb-8 overflow-visible">
            <Text className="text-lg font-bold text-gray-800 mb-4">คำขอที่ส่งไป ({sentRequests.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              {sentRequests.map(item => (
                <TouchableOpacity key={item.receiverId} 
                  onPress={() => router.push(`/ProfilePublic/${item.receiverId}`)}
                  className="bg-purple-50 rounded-3xl p-4 mr-4 items-center shadow-sm border border-purple-100 w-48">
                  <Image source={{ uri: item.receiver?.profile_image_url || 'https://ui-avatars.com/api/?name=U' }} className="w-12 h-12 rounded-full mb-2 opacity-80" />
                  <Text className="font-bold text-gray-900 text-sm" numberOfLines={1}>{item.receiver?.username || 'Unknown'}</Text>
                  <Text className="text-gray-500 mb-3 text-xs">รอรับแอด...</Text>
                  
                  <TouchableOpacity 
                    onPress={() => handleRequestAction(item.receiverId, 'cancel')}
                    className="w-full bg-white border border-gray-200 py-2 rounded-lg items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold text-xs">ยกเลิก</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* เพื่อนทั้งหมด (All Friends) */}
        <View className="mb-24">
          <Text className="text-xl font-bold text-gray-800 mb-4">เพื่อนทั้งหมด ({friends.length})</Text>
          {friends.length === 0 ? (
            <Text className="text-gray-500 text-center py-6">ยังไม่มีเพื่อน ลองค้นหาผู้ใช้แล้วแอดดูสิ!</Text>
          ) : (
            friends.map(item => (
  <TouchableOpacity 
    key={item.id}
    onPress={() => router.push(`/ProfilePublic/${item.id}`)}
    className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-50"
  >
                <View className="relative">
                  <Image source={{ uri: item.profile_image_url || 'https://ui-avatars.com/api/?name=U' }} className="w-14 h-14 rounded-full" />
                  <View className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${item.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                </View>
                
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-gray-900 text-base">{item.username}</Text>
                  <Text className="text-gray-500 text-xs mt-1">@{item.handle}</Text>
                </View>
                <ChevronRight color="#D1D5DB" size={20} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}