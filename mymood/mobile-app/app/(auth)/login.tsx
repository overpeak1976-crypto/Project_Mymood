import "../global.css";
import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from 'expo-linking';
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกอีเมลและรหัสผ่านให้ครบครับ");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("เข้าสู่ระบบล้มเหลว", "อีเมลหรือรหัสผ่านไม่ถูกต้องครับ");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('users').update({ 
            is_online: true, 
            last_active: new Date() 
        }).eq('id', userData.user.id);
      }
      Alert.alert("สำเร็จ!", "เข้าสู่ระบบเรียบร้อยแล้ว");
      router.replace("/");
    }
    setLoading(false);
  };

  const onGoogleLogin = async () => {
    try {
      const redirectUrl = Linking.createURL('/');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {redirectTo: redirectUrl,},
      });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Google Login Error", error.message);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F3FF] px-6 pt-20">
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Text className="text-purple-600 font-bold text-lg">← Back</Text>
      </TouchableOpacity>

      <Text className="text-3xl font-extrabold text-purple-800 mb-2">Welcome Back!</Text>
      <Text className="text-gray-500 mb-10">ล็อกอินเพื่อดูว่าเพื่อนๆ กำลังฟังเพลงอะไรอยู่</Text>

      <View className="mb-6">
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm"
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          onPress={handleLogin}
          disabled={loading}
          className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-purple-300' : 'bg-purple-600'}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-[1px] bg-gray-300" />
        <Text className="mx-4 text-gray-400">หรือ</Text>
        <View className="flex-1 h-[1px] bg-gray-300" />
      </View>

      {/* ปุ่ม Google Login */}
      <TouchableOpacity 
        onPress={onGoogleLogin}
        className="bg-white py-4 rounded-2xl flex-row justify-center items-center border border-gray-200 shadow-sm"
      >
        <Image 
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" }} 
          className="w-6 h-6 mr-3" 
        />
        <Text className="text-gray-700 font-bold text-base">Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}