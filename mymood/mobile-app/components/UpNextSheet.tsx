import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Sparkles, MoreVertical, Play, Pause, SkipForward } from 'lucide-react-native';
import { useAudio, Song } from '../context/AudioContext';
import { useToast } from '../context/ToastContext';
import { BlurView } from 'expo-blur';
import { validators } from '@/lib/validators';
import { crashReporter } from '@/lib/crashReporter';
import SongContextMenu from './SongContextMenu';

const UpNextSheet = forwardRef<BottomSheet, {}>((props, ref) => {
  // Snap points for the bottom sheet natively matching standard players
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  const { queue, currentSong, isPlaying, togglePlayPause, playNext, playSong, activeAiPrompt, isAiGenerating, startAiRadio } = useAudio();
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [showSongMenu, setShowSongMenu] = useState(false);
  const handleGenerateAI = async () => {
    if (!prompt.trim() || isAiGenerating) return;
    try {
      validators.validatePrompt(prompt);
      await startAiRadio(prompt.trim());
      setPrompt('');
      showToast('กำลังสร้างเพลย์ลิสต์จาก AI...', 'success');
    } catch (error) {
      crashReporter.captureError(error as Error, {
        context: 'UpNextSheet.handleGenerateAI',
        prompt: prompt.substring(0, 50),
      });

      let errorMessage = 'Failed to generate AI playlist';
      if (error instanceof Error) {
        if (error.message.includes('validation')) {
          errorMessage = 'Please enter a valid mood or genre (3-100 characters)';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      showToast(errorMessage, 'error');
      console.error('[UpNextSheet] AI Radio Error:', error);
    }
  };

  const renderItem = ({ item, index }: { item: Song; index: number }) => {
    const isPlayingThis = currentSong?.id === item.id;
    return (
      <TouchableOpacity
        onPress={() => {
          playSong(item, queue);
        }}
        className="flex-row items-center justify-between px-6 py-3"
      >
        <View className="flex-row items-center flex-1">
          <Image source={{ uri: item.cover_image_url }} className="w-12 h-12 rounded-lg bg-gray-800" />
          <View className="ml-4 flex-1">
            <Text className={`font-semibold ${isPlayingThis ? 'text-purple-400' : 'text-white'}`} numberOfLines={1}>
              {item.title}
            </Text>
            <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>{item.artist}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowSongMenu(true)} className="p-2">
          <MoreVertical color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };


  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      handleIndicatorStyle={{ backgroundColor: '#6B7280', width: 40, height: 5 }}
      backgroundComponent={({ style }) => (
        <View style={[style, { overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
          <BlurView intensity={200} tint="dark" style={{ flex: 1 }} />
        </View>
      )}
      enablePanDownToClose={true}
    >
      <View className="flex-1">
        {/* Now Playing Row Module */}
        {currentSong && (
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-800/60">
            <View className="flex-row items-center flex-1">
              <Image source={{ uri: currentSong.cover_image_url }} className="w-10 h-10 rounded-md bg-gray-800" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-semibold tracking-tight" numberOfLines={1}>{currentSong.title}</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>{currentSong.artist}</Text>
              </View>
            </View>
            <View className="flex-row items-center ml-2">
              <TouchableOpacity onPress={togglePlayPause} className="p-2 bg-white/10 rounded-full">
                {isPlaying ? <Pause color="#FFF" size={18} fill="#FFF" /> : <Play color="#FFF" size={18} fill="#FFF" className="ml-0.5" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => playNext()} className="p-2 ml-2 bg-white/10 rounded-full">
                <SkipForward color="#FFF" size={18} fill="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Mood Module */}
        <View className="px-6 py-6 border-b border-gray-800/60">
          <View className="flex-row justify-between items-center mb-3 hover:opacity-90">
            <Text className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold">Your vibe now :</Text>
            <Text className="text-purple-400 text-xs font-medium">{activeAiPrompt || "Custom Sync"}</Text>
          </View>
          <View className="flex-row items-center bg-gray-900/40 border border-gray-700/20 rounded-2xl p-2 px-4 shadow-sm">
            <Sparkles color="#7C3AED" size={20} />
            <TextInput
              placeholder={isAiGenerating ? "AI is curating your vibe..." : "Tell me your vibe..."}
              placeholderTextColor="#6B7280"
              editable={!isAiGenerating}
              className="flex-1 ml-3 text-white h-10 font-medium"
              value={prompt}
              onChangeText={setPrompt}
              onSubmitEditing={handleGenerateAI}
            />
            {isAiGenerating ? (
              <ActivityIndicator color="#7C3AED" size="small" className="mr-2" />
            ) : prompt.length > 0 && (
              <TouchableOpacity onPress={handleGenerateAI} className="bg-purple-600 px-3 py-1.5 rounded-full shadow-lg shadow-purple-900/50">
                <Text className="text-white text-xs font-semibold">Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Queue Header */}
        <View className="px-6 pt-6 pb-3 flex-row items-center justify-between">
          <Text className="text-white font-bold text-lg tracking-tight">Up Next</Text>
          <Text className="text-gray-500 text-xs font-medium">{queue.length} Tracks</Text>
        </View>

        {/* Scrollable Queue Content */}
        <BottomSheetFlatList
          data={queue}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 50 }} // generous padding for safe bounds
          showsVerticalScrollIndicator={false}
        />
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 60, zIndex: 20 }} pointerEvents="box-none">
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
    </BottomSheet>
    
  );
});

export default UpNextSheet;
