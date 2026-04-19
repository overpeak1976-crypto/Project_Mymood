import React, { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useToast } from "../../context/ToastContext";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';


export default function CompleteProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);

  useEffect(() => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const user = data.user;
        setSessionUser(user);

        // เช็คว่าเป็น Google หรือไม่
        const isGoogle = user.app_metadata?.provider === 'google' || user.app_metadata?.providers?.includes('google');
        setIsGoogleLogin(isGoogle ?? false);

        // ดึงข้อมูลเบื้องต้นจาก Metadata
        const fullName = user.user_metadata?.full_name || "";
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

        if (fullName) {
          setUsername(fullName);
          const baseName = fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
          setHandle(`${baseName}${randomDigits}`);
        } else {
          setHandle(`user${randomDigits}`);
        }

        if (avatarUrl) {
          setProfileImage(avatarUrl);
        }
      }
    });
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleCompleteProfile = async () => {
    if (!username || !handle) {
      showToast("Please fill in your name and ID", 'info');
      return;
    }
    if (!sessionUser) return;

    setLoading(true);

    try {
      // 1. เช็ค Handle ซ้ำ
      const { data: existingHandle } = await supabase
        .from("users")
        .select("id")
        .eq("handle", handle)
        .neq("id", sessionUser.id)
        .maybeSingle();

      if (existingHandle) {
        showToast("This handle is already taken", 'error');
        setLoading(false);
        return;
      }

      let finalImageUrl = profileImage;

      if (profileImage && !profileImage.includes('supabase.co')) {
        try {
          let uploadUri = profileImage;

          // ถ้าเป็น Google URL ใช้ URL ตรงๆ ไม่ต้องดาวน์โหลดมาก่อน
          // เพราะ FormData ใน RN รับ local uri เท่านั้น
          // ถ้าเป็น http ให้ข้ามการ upload แล้วใช้ URL นั้นเลย
          if (profileImage.startsWith('http')) {
            finalImageUrl = profileImage; // ✅ ใช้ Google URL ตรงๆ
          } else {
            // เป็นไฟล์ในเครื่อง → upload ด้วย FormData
            const fileName = `${sessionUser.id}-${Date.now()}.jpg`;

            const formData = new FormData();
            formData.append("file", {
              uri: uploadUri,
              type: "image/jpeg",
              name: fileName,
            } as any);

            const { error: uploadError } = await supabase.storage
              .from("picture")
              .upload(fileName, formData, {
                contentType: "multipart/form-data",
                upsert: true,
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from("picture")
              .getPublicUrl(fileName);

            finalImageUrl = publicUrl;
          }
        } catch (imgError) {
          console.error("Image Upload Error:", imgError);
          finalImageUrl = null;
        }
      }

      // ถ้าไม่มีรูป ให้ใช้ UI Avatars
      if (!finalImageUrl) {
        finalImageUrl = `https://ui-avatars.com/api/?name=${username}&background=random`;
      }

      // 3. 💾 Upsert ลงตาราง users
      const { error: dbError } = await supabase.from("users").upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        username: username,
        handle: handle,
        password_hash: isGoogleLogin ? "google_oauth_managed" : "supabase_managed",
        profile_image_url: finalImageUrl,
        is_online: true,
        last_active: new Date(),
        updated_at: new Date()
      }, { onConflict: 'id' });

      if (dbError) throw dbError;

      // 4. อัปเดต Auth Metadata 
      await supabase.auth.updateUser({
        data: {
          picture: finalImageUrl,
          full_name: username
        }
      });

      showToast("Profile created successfully!", 'success');
      router.replace("/(drawer)/(tabs)");
    } catch (error: any) {
      console.error(error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F3FF] px-6 pt-24">
      <Text className="text-3xl font-extrabold text-purple-800 mb-2">ยินดีต้อนรับ!</Text>

      <View className="items-center mb-8 mt-6">
        <TouchableOpacity
          onPress={pickImage}
          className="w-28 h-28 bg-purple-100 rounded-full items-center justify-center border-2 border-purple-300 shadow-sm relative overflow-hidden"
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} className="w-full h-full" />
          ) : (
            <Ionicons name="camera" size={40} color="#9333ea" />
          )}
          <View className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full border-2 border-white">
            <Ionicons name="pencil" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <Text className="text-gray-700 font-bold mb-2 ml-1">ชื่อที่ใช้แสดง (Username)</Text>
      <TextInput
        className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm"
        placeholder="ชื่อของคุณ"
        value={username}
        onChangeText={setUsername}
      />

      <Text className="text-gray-700 font-bold mb-2 ml-1">ไอดีผู้ใช้ (@Handle)</Text>
      <TextInput
        className="bg-white p-4 rounded-2xl border border-purple-100 mb-8 shadow-sm text-gray-800 font-medium"
        placeholder="ไอดี"
        value={handle}
        onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
        autoCapitalize="none"
      />

      <TouchableOpacity
        onPress={handleCompleteProfile}
        disabled={loading}
        className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-purple-300' : 'bg-purple-600'}`}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-lg font-bold">เริ่มต้นใช้งาน</Text>}
      </TouchableOpacity>
    </View>
  );
}