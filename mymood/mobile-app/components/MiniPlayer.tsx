import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAudio } from '../context/AudioContext';

function MiniPlayer() {
  const router = useRouter();
  const { currentSong, isPlaying, togglePlayPause, progressFraction, playNext } = useAudio();
  if (!currentSong) return null;
  return (
    <View className="absolute bottom-4 left-4 right-4 h-20 shadow-2xl rounded-[30px] overflow-hidden border border-white/60 bg-white/10 " >

      {/* 1. กระจกฝ้า (ฉากหลัง) */}
      <BlurView
        intensity={30}
        tint="light"
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
      />

      {/* 2. หลอดเพลงแบบ Liquid Fill */}
      <View
        className="absolute top-0 bottom-0 left-0 bg-purple-500/25"
        style={{ width: `${(progressFraction || 0) * 100}%` }}
      />

      {/* 3. ส่วนเนื้อหา */}
      <View className="flex-1 flex-row items-center justify-between px-4 z-10">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() => router.push('/player' as any)}
        >
          <View className="shadow-lg shadow-purple-500/40">
            <Image
              source={{ uri: currentSong.cover_image_url }}
              className="w-12 h-12 rounded-2xl"
            />
          </View>
          <View className="ml-4 flex-1">
            <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text className="text-purple-600/70 text-xs font-medium mt-0.5" numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row items-center gap-x-8">
          <TouchableOpacity onPress={togglePlayPause}>
            {isPlaying ? (
              <Pause color="#7C3AED" size={28} fill="#7c3aed50" />
            ) : (
              <Play color="#7C3AED" size={28} fill="#7c3aed50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => playNext()}>
            <SkipForward color="#7C3AED" size={28} fill="#7c3aed50" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default React.memo(MiniPlayer);
