import React, { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setHandle(`user${randomDigits}`);

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setSessionUser(data.user);
        if (data.user.user_metadata?.full_name) {
            setUsername(data.user.user_metadata.full_name);
            const baseName = data.user.user_metadata.full_name.toLowerCase().replace(/[^a-z0-9]/g, "");
            setHandle(`${baseName}${randomDigits}`);
        }
      }
    });
  }, []);

  const handleCompleteProfile = async () => {
    if (!username || !handle) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วนครับ");
      return;
    }
    if (!sessionUser) {
      Alert.alert("ข้อผิดพลาด", "ไม่พบเซสชันการล็อกอิน กรุณาล็อกอินใหม่");
      router.replace("/(auth)");
      return;
    }

    setLoading(true);

    try {
      const { data: existingHandle } = await supabase
        .from("users")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();

      if (existingHandle) {
        Alert.alert("อ๊ะ!", "Handle นี้มีคนใช้ไปแล้วครับ ลองเปลี่ยนใหม่ดูนะ");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("users").upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        username: username,
        handle: handle,
        password_hash: "google_oauth_managed",
        profile_image_url: sessionUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=random`,
        is_online: true,
        last_active: new Date(),
        updated_at: new Date()
      });

      if (error) {
        throw error;
      }

      Alert.alert("สำเร็จ!", "สร้างโปรไฟล์เรียบร้อยแล้ว ยินดีต้อนรับครับ 🎉");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message || "ไม่สามารถอัปเดตโปรไฟล์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F3FF] px-6 pt-24">
      <Text className="text-3xl font-extrabold text-purple-800 mb-2">ยินดีต้อนรับ!</Text>
      <Text className="text-gray-500 mb-10">เพื่อประสบการณ์ที่ดีที่สุด ขอชื่อและไอดีหน่อยครับ</Text>

      <View className="mb-6">
        <Text className="text-gray-700 font-bold mb-2 ml-1">ชื่อที่ใช้แสดง (Username)</Text>
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm"
          placeholder="เช่น คุณสมชาย"
          value={username}
          onChangeText={setUsername}
        />

        <Text className="text-gray-700 font-bold mb-2 ml-1">ไอดีผู้ใช้ (@Handle)</Text>
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-8 shadow-sm text-gray-800 font-medium"
          placeholder="เช่น somchai1234"
          value={handle}
          onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} 
          autoCapitalize="none"
        />

        <TouchableOpacity 
          onPress={handleCompleteProfile}
          disabled={loading}
          className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-purple-300' : 'bg-purple-600'}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">เริ่มต้นใช้งาน</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
