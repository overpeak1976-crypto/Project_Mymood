import "./global.css";
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { ChevronDown, MoreVertical, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Airplay, Share2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur'; 
import { useRouter } from 'expo-router';
import { useAudio } from '../context/AudioContext'; 
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const router = useRouter();

  // 🌟 ดึงข้อมูลจาก Context
  const { currentSong, isPlaying, togglePlayPause, isLoading, seekTo, totalDuration, currentTime } = useAudio();
  
  const [isSliding, setIsSliding] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  // 🌟 1. แก้ไขให้อัปเดตตาม currentTime (เวลาปัจจุบันที่เป็นวินาที)
  useEffect(() => {
    if (!isSliding) {
      setSliderValue(currentTime || 0);
    }
  }, [currentTime, isSliding]);

  // 🌟 ฟังก์ชันแปลงเวลา
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentSong) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator color="#FFF" size="large" />
        <Text className="text-white mt-4">กำลังเตรียมเพลง...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">

      {/* พื้นหลัง */}
      <Image
        source={{ uri: currentSong.cover_image_url }}
        className="absolute inset-0"
        resizeMode="cover"
        style={{ width, height, opacity: 0.5 }}
        blurRadius={100} 
      />

      {/* เลเยอร์กระจกฝ้า */}
      <BlurView
        intensity={20} 
        tint="dark" 
        className="absolute inset-0"
      />

      {/* --- ส่วนแสดงผลหลัก --- */}
      <View className="flex-1 px-8 pt-16 pb-12 justify-between">

        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ChevronDown color="#FFF" size={28} />
          </TouchableOpacity>
          <Text className="text-white text-base font-semibold tracking-tight">Now Playing</Text>
          <TouchableOpacity className="p-2">
            <MoreVertical color="#FFF" size={26} />
          </TouchableOpacity>
        </View>

        {/* --- Artwork Section --- */}
        <View className="items-center my-8 shadow-2xl shadow-black/50">
          <Image
            source={{ uri: currentSong.cover_image_url }}
            style={{ width: width * 0.8, height: width * 0.8 }}
            className="rounded-[40px] bg-gray-700 shadow-2xl"
          />
        </View>

        {/* --- Song Title & Artist --- */}
        <View className="items-center mb-10">
          <Text
            className="text-white text-3xl font-extrabold tracking-tighter text-center"
            numberOfLines={1}
          >
            {currentSong.title}
          </Text>
          <Text className="text-gray-300 text-lg mt-1 text-center" numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>

        {/* --- Timeline / Seekbar Section --- */}
        <View className="mb-10 w-full">
          <Slider
            style={{ width: '100%', height: 67 }}
            minimumValue={0}
            // 🌟 2. ให้ความยาวสุดของหลอด เท่ากับความยาวเพลงจริงๆ (วินาที)
            maximumValue={totalDuration || 1}
            value={sliderValue}
            onValueChange={(value) => {
              setIsSliding(true);
              setSliderValue(value);
            }}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#FFFFFF40"
            thumbTintColor="#ffffff"
            onSlidingComplete={async (value) => {
              // 🌟 3. เติม * 1000 เพื่อแปลงวินาทีกลับเป็นมิลลิวินาทีส่งให้ระบบเสียง
              await seekTo(value * 1000);
              setIsSliding(false);
            }}
          />
          <View className="flex-row justify-between px-4 mt-[-10px]">
            
            <Text className="text-gray-300 text-xs font-open-sans">{formatTime(sliderValue)}</Text>
            {/* เวลาที่เหลือ คือ ความยาวรวม ลบด้วย เวลาปัจจุบัน */}
            <Text className="text-gray-300 text-xs font-open-sans">-{formatTime((totalDuration || 0) - sliderValue)}</Text>
          </View>
        </View>

        {/* --- Controls Section --- */}
        <View className="flex-row items-center justify-between px-2 mb-12">
          <TouchableOpacity>
            <Shuffle color="#FFF" size={24} style={{ opacity: 0.6 }} />
          </TouchableOpacity>

          <TouchableOpacity>
            <SkipBack color="#FFF" size={32} fill="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayPause}
            disabled={isLoading} 
            className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-md shadow-black/30"
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="large" /> 
            ) : isPlaying ? (
              <Pause color="#000" size={36} fill="#000" />
            ) : (
              <Play color="#000" size={36} fill="#000" className="ml-2" />
            )}
          </TouchableOpacity>

          <TouchableOpacity>
            <SkipForward color="#FFF" size={32} fill="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity>
            <Repeat color="#FFF" size={24} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        {/* --- Footer (Device & Share) --- */}
        <View className="flex-row items-center justify-between px-10">
          <TouchableOpacity>
            <Airplay color="#FFF" size={24} style={{ opacity: 0.7 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Share2 color="#FFF" size={24} style={{ opacity: 0.7 }} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
} 