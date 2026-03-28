import "../global.css";
import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const validateInput = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบทุกช่องครับ");
      return false;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert("แจ้งเตือน", "รูปแบบอีเมลไม่ถูกต้องครับ");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("รหัสผ่านอ่อนเกินไป", "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษรครับ");
      return false;
    }

    const strongPasswordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])/;
    if (!strongPasswordRegex.test(password)) {
      Alert.alert("รหัสผ่านคาดเดาง่าย", "รหัสผ่านต้องมี 'ตัวอักษร' และ 'ตัวเลข' ผสมกันครับ");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณายืนยันรหัสผ่านให้ตรงกันครับ");
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateInput()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          Alert.alert("สมัครไม่สำเร็จ", "อีเมลนี้มีในระบบแล้ว กรุณาใช้อีเมลอื่นครับ");
        } else {
          Alert.alert("สมัครไม่สำเร็จ", error.message);
        }
      } else if (data.user) {
        Alert.alert("เกือบเสร็จแล้ว!", "สร้างบัญชีสำเร็จ ไปตั้งชื่อโปรไฟล์กันต่อเลย 🎉");
        router.replace("/complete-profile"); 
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F3FF] px-6 pt-20">
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Text className="text-purple-600 font-bold text-lg">← Back</Text>
      </TouchableOpacity>

      <Text className="text-3xl font-extrabold text-purple-800 mb-2">Create Account</Text>
      <Text className="text-gray-500 mb-8">ใช้อีเมลสมัครใช้งาน เพื่อเริ่มต้นแชร์เสียงเพลงของคุณ</Text>

      <View className="mb-4">
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm"
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm"
          placeholder="Password (รหัสผ่าน 8 ตัวขึ้นไป)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput 
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-8 shadow-sm"
          placeholder="Confirm Password (ยืนยันรหัสผ่าน)"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity 
          onPress={handleSignUp}
          disabled={loading}
          className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-purple-300' : 'bg-purple-600'}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}