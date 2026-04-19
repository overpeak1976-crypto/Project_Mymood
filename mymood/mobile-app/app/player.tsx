import "./global.css";
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, ActivityIndicator, Animated, Easing } from 'react-native';
import { ChevronDown, MoreVertical, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Airplay, Share2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import UpNextSheet from '../components/UpNextSheet';
import SongContextMenu from '../components/SongContextMenu';
import FriendPickerSheet from '../components/FriendPickerSheet';
import PlayerProgressBar from '../components/PlayerProgressBar';
import { useAudio } from '../context/AudioContext';
import { useToast } from '../context/ToastContext';
const { width, height } = Dimensions.get('window');
const ModernSpinner = ({ size = 24, color = "#7C3AED" }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }], width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        borderTopColor: 'transparent',
        borderRightColor: 'transparent'
      }} />
    </Animated.View>
  );
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const BouncyButton = ({ onPress, children, disabled, className, style }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.9}
      disabled={disabled}
      className={className}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedTouchable>
  );
};

export default function PlayerScreen() {
  const router = useRouter();
  const {
    currentSong, isPlaying, togglePlayPause, isLoading,
    playNext, playPrevious, isShuffle, isRepeat, toggleShuffle, toggleRepeat
  } = useAudio();
  const { showToast } = useToast();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showSongMenu, setShowSongMenu] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const openSheet = () => sheetRef.current?.expand();

  const breathingScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingScale, {
          toValue: 1.2,
          duration: 15000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(breathingScale, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      ])
    ).start();
  }, []);

  useEffect(() => {
    setIsImageLoading(true);
  }, [currentSong?.id]);

  if (!currentSong) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ModernSpinner color="#FFF" size={40} />
        <Text className="text-white mt-6 font-medium tracking-widest text-sm opacity-70">PREPARING AUDIO...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">

      {/* พื้นหลัง */}
      <Animated.Image
        key={`bg-${currentSong.id}`}
        source={{ uri: currentSong.cover_image_url }}
        className="absolute inset-0"
        resizeMode="cover"
        style={{ width, height, opacity: 0.5, transform: [{ scale: breathingScale }] }}
        blurRadius={25}
      />

      <BlurView
        intensity={20}
        tint="dark"
        className="absolute inset-0"
      />

      <View className="flex-1 px-8 pt-16 pb-20 justify-between" style={{ zIndex: 1 }}>

        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ChevronDown color="#FFF" size={28} />
          </TouchableOpacity>
          <Text className="text-white text-base font-semibold tracking-tight">Now Playing</Text>
          <TouchableOpacity onPress={() => setShowSongMenu(true)} className="p-2">
            <MoreVertical color="#FFF" size={26} />
          </TouchableOpacity>
        </View>

        {/* --- Artwork Section --- */}
        <View className="items-center my-8 shadow-2xl shadow-black/50 justify-center relative">
          {/* กรอบเงาดำรองรับรูปภาพ */}
          <View
            style={{ width: width * 0.8, height: width * 0.8 }}
            className="rounded-[40px] bg-gray-800/80 shadow-2xl items-center justify-center overflow-hidden"
          >
            {/* โชว์รูปภาพ */}
            <Image
              key={`artwork-${currentSong.id}`}
              source={{ uri: currentSong.cover_image_url }}
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              className="rounded-[40px]"
              onLoadEnd={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />

            {/* โชว์ Loading Spinner ถ้าเน็ตช้ารูปยังไม่มา */}
            {isImageLoading && (
              <View className="absolute inset-0 bg-gray-900/40 items-center justify-center rounded-[40px]">
                <ModernSpinner color="#FFF" size={50} />
              </View>
            )}
          </View>
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
        <PlayerProgressBar />

        {/* --- Controls Section --- */}
        <View className="flex-row items-center justify-between px-2 mb-12">
          {/* Shuffle Button: Active = Purple, Inactive = White (0.6 opacity) */}
          <BouncyButton onPress={() => {
            console.log('[PlayerScreen] Shuffle button pressed');
            const newShuffleState = !isShuffle;
            toggleShuffle();

            // Show premium toast notification
            if (newShuffleState) {
              showToast('Songs in this tag have been shuffled. Playing randomly through remaining songs.', 'success');
            } else {
              showToast('Playing songs in this tag in original order.', 'info');
            }
          }}>
            <Shuffle
              color={isShuffle ? "#7C3AED" : "#FFFFFF"}
              size={24}
              style={{ opacity: isShuffle ? 1 : 0.6 }}
            />
          </BouncyButton>

          {/* Previous Button */}
          <BouncyButton onPress={() => {
            console.log('[PlayerScreen] Previous button pressed');
            playPrevious();
          }}>
            <SkipBack color="#FFF" size={32} fill="#FFF" />
          </BouncyButton>

          {/* Play/Pause Button (Center): Optimistic response with instant visual feedback */}
          <BouncyButton
            onPress={() => {
              console.log('[PlayerScreen] Play/Pause button pressed');
              togglePlayPause();
            }}
            disabled={isLoading}
            className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-md shadow-black/30"
          >
            {isLoading ? (
              // Show spinner while loading
              <ModernSpinner color="#000" size={36} />
            ) : isPlaying ? (
              // Show pause icon when playing
              <Pause color="#000" size={36} fill="#000" />
            ) : (
              // Show play icon when paused
              <Play color="#000" size={36} fill="#000" className="ml-2" />
            )}
          </BouncyButton>

          {/* Next Button */}
          <BouncyButton onPress={() => {
            console.log('[PlayerScreen] Next button pressed');
            playNext();
          }}>
            <SkipForward color="#FFF" size={32} fill="#FFF" />
          </BouncyButton>

          {/* Repeat Button: Active (isRepeat=true) = Purple, Inactive (false) = White (0.6 opacity) */}
          <BouncyButton onPress={() => {
            console.log('[PlayerScreen] Repeat button pressed');
            toggleRepeat();
          }}>
            <Repeat
              color={isRepeat ? "#7C3AED" : "#FFFFFF"}
              size={24}
              style={{ opacity: isRepeat ? 1 : 0.6 }}
            />
          </BouncyButton>
        </View>

        {/* --- Footer (Device & Share) --- */}
        <View className="flex-row items-center justify-between px-10">
          <TouchableOpacity>
            <Airplay color="#FFF" size={24} style={{ opacity: 0.7 }} />
          </TouchableOpacity>

          <BouncyButton onPress={openSheet} className="px-5 py-2 bg-gray-900/30 rounded-full border border-gray-700/20 shadow-lg">
            <Text className="text-white font-semibold text-xs tracking-wider uppercase">Up Next</Text>
          </BouncyButton>

          <TouchableOpacity onPress={() => setShowFriendPicker(true)}>
            <Share2 color="#FFF" size={24} style={{ opacity: 0.7 }} />
          </TouchableOpacity>
        </View>

      </View>

      {/* Render Slide Up Sheet safely over everything (Absolute Z-Index natively) */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} pointerEvents="box-none">
        <UpNextSheet ref={sheetRef} />
      </View>

      {/* Song Context Menu */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }} pointerEvents="box-none">
        <SongContextMenu
          visible={showSongMenu}
          song={currentSong ? {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            cover_image_url: currentSong.cover_image_url,
            audio_file_url: currentSong.audio_file_url,
          } : null}
          onClose={() => setShowSongMenu(false)}
        />
      </View>

      {/* Friend Picker for sharing */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }} pointerEvents="box-none">
        <FriendPickerSheet
          visible={showFriendPicker}
          songId={currentSong?.id || null}
          songTitle={currentSong?.title || null}
          onClose={() => setShowFriendPicker(false)}
        />
      </View>
    </View>
  );
}