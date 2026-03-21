import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, Image, ScrollView, } from "react-native";
import { supabase } from "../../../lib/supabase";

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log("SESSION:", session);

      if (!session?.user) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      console.log("PROFILE:", data);
      console.log("ERROR:", error);

      if (error) throw error;

      setProfile(data);

    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F3FF]">
        <ActivityIndicator size="large" color="#6C2BD9" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F5F3FF]">

      {/* Header */}
      <View className="pt-6 pb-6 px-6 bg-white rounded-b-[40px] flex-row items-center justify-between">

        {/* ข้อมูล user */}
        <View>
          <Text className="text-2xl font-extrabold text-purple-900">
            {profile?.username || "Guest"}!
          </Text>
          <Text className="text-purple-600">
            @{profile?.handle || "user"}
          </Text>
        </View>

        {/* 🔥 รูปโปรไฟล์ (แก้แล้ว) */}
        <Image
          source={{
            uri:
              profile?.profile_image_url &&
              profile.profile_image_url.startsWith("http")
                ? profile.profile_image_url
                : `https://ui-avatars.com/api/?name=${profile?.username || "User"}&background=6C2BD9&color=fff`,
          }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30, // 🔥 กลมแน่นอน
            borderWidth: 2,
            borderColor: "#E9D5FF",
          }}
        />

      </View>

      {/* Content */}
      <View className="px-6 mt-6">
        <Text className="text-xl font-bold text-gray-800 mb-4">
          สถานะระบบการออนไลน์
        </Text>

        <View className="bg-white p-4 rounded-2xl border border-gray-100 flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-3"></View>
          <Text className="text-gray-600">
            คุณกำลังแสดงสถานะ
            <Text className="text-green-600 font-bold"> "ออนไลน์"</Text>
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}