import "../global.css";
import React from "react";
import { Text, View, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router"; 

export default function WelcomeScreen() {
  const router = useRouter(); 

  return (
    <View className="flex-1 bg-[#F5F3FF] items-center justify-between py-20 px-6">
      <View className="flex-1 justify-center items-center w-full mt-10">
        <Image source={require("../../assets/images/logo_Mymood.png")} style={{ width: 280, height: 140 }} resizeMode="contain" className="mb-8"/>
        <Text className="text-purple-800 font-extrabold text-3xl mb-3 text-center">
          Sync Your Vibe
        </Text>
        <Text className="text-gray-500 text-center text-base px-4">
          ฟังเพลงพร้อมเพื่อนแบบ Real-time และแชร์อารมณ์ของคุณผ่านเสียงเพลง
        </Text>
      </View>
      <View className="w-full pb-10">
        <TouchableOpacity onPress={() => router.push("/login")} className="bg-purple-600 w-full py-5 rounded-full items-center shadow-lg shadow-purple-300">
          <Text className="text-white text-xl font-bold tracking-wider">
            Get Started
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center items-center mt-6">
          <Text className="text-gray-500 text-base">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text className="text-purple-600 font-bold text-base">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}