import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, Image, ScrollView, TouchableOpacity } from "react-native";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
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
    } finally {
      setLoading(false);
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
    <ScrollView className="flex-1 bg-[#F5F3FF]">
      {/* Header Section */}
      <View className="pt-4 pb-6 px-6 bg-white rounded-b-[40px] shadow-sm">
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
      <View className="px-6">
        <Text className="text-xl font-bold text-gray-800 mt-6 mb-4">สถานะระบบการออนไลน์</Text>
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-3"></View>
          <Text className="text-gray-600 font-medium">คุณกำลังแสดงสถานะ<Text className="text-green-600 font-bold"> "ออนไลน์"</Text> ให้คนอื่นเห็น</Text>
        </View>
      </View>
    </ScrollView>
  );
}
