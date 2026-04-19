import React, { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView } from "react-native";
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      showToast("กรุณากรอกชื่อและไอดี", 'info');
      return;
    }

    // บังคับสร้างรหัสผ่านสำหรับ Google Login
    if (isGoogleLogin) {
      if (!password || !confirmPassword) {
        showToast("กรุณาสร้างรหัสผ่านสำหรับบัญชีของคุณ", 'info');
        return;
      }
      if (password.length < 8) {
        showToast("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", 'error');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        showToast("ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว", 'error');
        return;
      }
      if (!/[a-z]/.test(password)) {
        showToast("ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว", 'error');
        return;
      }
      if (!/[0-9]/.test(password)) {
        showToast("ต้องมีตัวเลขอย่างน้อย 1 ตัว", 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast("รหัสผ่านไม่ตรงกัน", 'error');
        return;
      }
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
        password_hash: (isGoogleLogin && password) ? "supabase_managed" : (isGoogleLogin ? "google_oauth_managed" : "supabase_managed"),
        profile_image_url: finalImageUrl,
        is_online: true,
        last_active: new Date(),
        updated_at: new Date()
      }, { onConflict: 'id' });

      if (dbError) throw dbError;

      // 4. อัปเดต Auth Metadata 
      const updateData: any = {
        data: {
          picture: finalImageUrl,
          full_name: username
        }
      };

      // ถ้าเป็น Google Login → ตั้งรหัสผ่านด้วย
      if (isGoogleLogin && password) {
        updateData.password = password;
      }

      await supabase.auth.updateUser(updateData);

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
    <ScrollView className="flex-1 bg-[#F5F3FF]" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 96, paddingBottom: 40 }}>
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
        className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm text-gray-800 font-medium"
        placeholder="ไอดี"
        value={handle}
        onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
        autoCapitalize="none"
      />

      {isGoogleLogin && (
        <View className="bg-purple-50 p-4 rounded-2xl border border-purple-200 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="lock-closed" size={18} color="#7C3AED" />
            <Text className="text-purple-700 font-bold ml-2">สร้างรหัสผ่าน</Text>
          </View>
          <Text className="text-gray-500 text-xs mb-3">คุณเข้าสู่ระบบด้วย Google — กรุณาตั้งรหัสผ่านเพื่อเข้าใช้แอป{'\n'}(ตัวพิมพ์ใหญ่ + ตัวพิมพ์เล็ก + ตัวเลข อย่างน้อย 8 ตัว)</Text>

          <Text className="text-gray-700 font-semibold mb-1 ml-1">รหัสผ่าน</Text>
          <View className="mb-3">
            <TextInput
              className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 16, top: 16 }}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-700 font-semibold mb-1 ml-1">ยืนยันรหัสผ่าน</Text>
          <View>
            <TextInput
              className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              style={{ position: 'absolute', right: 16, top: 16 }}
            >
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="gray" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={handleCompleteProfile}
        disabled={loading}
        className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-purple-300' : 'bg-purple-600'}`}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-lg font-bold">เริ่มต้นใช้งาน</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}