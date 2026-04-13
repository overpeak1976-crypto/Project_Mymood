import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAudio } from '../context/AudioContext';
import { useUIState } from '../context/UIStateContext';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentSong, isPlaying, togglePlayPause, progressFraction, playNext } = useAudio();
  const { isPlaylistSheetOpen, playlistSheetHeight } = useUIState();

  // Animated value for bottom position
  const translateY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // When playlist sheet opens, push MiniPlayer up
    // Assuming playlist sheet takes about 300px at minimum, add some buffer
    const targetTranslateY = isPlaylistSheetOpen ? -Math.max(playlistSheetHeight - 50, 0) : 0;

    Animated.spring(translateY, {
      toValue: targetTranslateY,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
  }, [isPlaylistSheetOpen, playlistSheetHeight, translateY]);

  if (!currentSong) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
      }}
      className="absolute bottom-4 left-4 right-4 h-20 shadow-2xl rounded-[30px] overflow-hidden border border-white/60 bg-white/10 z-10"
    >
      {/* 1. Blur background */}
      <BlurView
        intensity={30}
        tint="light"
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
      />

      {/* 2. Liquid fill progress bar */}
      <View
        className="absolute top-0 bottom-0 left-0 bg-purple-500/25"
        style={{ width: `${(progressFraction || 0) * 100}%` }}
      />

      {/* 3. Content */}
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
    </Animated.View>
  );
}