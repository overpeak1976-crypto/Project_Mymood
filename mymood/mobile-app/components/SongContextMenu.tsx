import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions } from "react-native";
import { Heart, ListPlus, Share2, ListMusic } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useUIState } from "../context/UIStateContext";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { height: screenHeight } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
export type SongMenuItem = {
  id: string;
  title: string;
  artist: string;
  cover_image_url?: string;
  audio_file_url?: string;
};

type Playlist = { id: string; name: string; cover_image_url?: string; track_count: number };

interface SongContextMenuProps {
  visible: boolean;
  song: SongMenuItem | null;
  onClose: () => void;
  likedIds?: Set<string>;
  onLikeToggled?: (songId: string, isNowLiked: boolean) => void;
  onPlaylistSheetOpen?: (isOpen: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SongContextMenu({
  visible,
  song,
  onClose,
  likedIds = new Set(),
  onLikeToggled,
  onPlaylistSheetOpen,
}: SongContextMenuProps) {
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [isAddingTrack, setIsAddingTrack] = useState(false);

  const { setPlaylistSheetOpen } = useUIState();

  const isLiked = song ? likedIds.has(song.id) : false;

  const playlistSheetRef = useRef<BottomSheet>(null);

  // Handle playlist sheet visibility with callback
  useEffect(() => {
    if (showPlaylistSheet) {
      setPlaylistSheetOpen(true);
      playlistSheetRef.current?.expand();
    } else {
      setPlaylistSheetOpen(false);
      playlistSheetRef.current?.close();
    }
  }, [showPlaylistSheet, setPlaylistSheetOpen]);

  const handleCloseMenu = () => {
    onClose();
  };

  const handleClosePlaylistSheet = () => {
    setShowPlaylistSheet(false);
  };

  const handleToggleLike = async () => {
    if (!song) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(`${BACKEND_URL}/api/likes/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ song_id: song.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLikeToggled?.(song.id, data.isLiked);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    handleCloseMenu();
  };

  const openPlaylistSheet = async () => {
    setLoadingPlaylists(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(`${BACKEND_URL}/api/playlists`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlaylists(data.playlists || []);
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setShowPlaylistSheet(false);
    } finally {
      setLoadingPlaylists(false);
    }
    setShowPlaylistSheet(true);
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!song) return;
    setIsAddingTrack(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ song_id: song.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      handleClosePlaylistSheet();
      handleCloseMenu();
      Alert.alert("เพิ่มสำเร็จ! 🎵", `"${song.title}" เข้า "${playlist.name}" แล้ว`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsAddingTrack(false);
    }
  };

  const handleShare = () => {
    if (!song) return;
    Alert.alert("Share", `Shared ${song.title} successfully!`);
    handleCloseMenu();
  };

  const coverUri =
    song?.cover_image_url ||
    (song ? `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=7C3AED&color=fff` : "");



  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CONTEXT MENU MODAL (POP-UP STYLE) */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={visible && !showPlaylistSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        {/* Semi-transparent backdrop */}
        <View className="flex-1 bg-black/40 justify-center items-center">
          {/* Touchable backdrop to close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleCloseMenu}
            className="absolute inset-0"
          />

          {/* Pop-up Menu Card */}
          {song && (
            <View className="relative w-80 bg-white rounded-2xl shadow-2xl overflow-hidden">
              <BlurView intensity={80} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

              <View className="relative z-10">
                {/* Song Info Header */}
                <View className="px-5 pt-5 pb-4 border-b border-gray-200/50">
                  <View className="flex-row items-center gap-3">
                    <Image
                      source={{ uri: coverUri }}
                      className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-300 to-purple-600"
                    />
                    <View className="flex-1">
                      <Text
                        className="text-gray-900 font-bold text-base"
                        numberOfLines={1}
                      >
                        {song.title}
                      </Text>
                      <Text
                        className="text-gray-500 text-xs mt-1"
                        numberOfLines={1}
                      >
                        {song.artist}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="px-5 py-2">
                  {/* Like Button */}
                  <TouchableOpacity
                    className="flex-row items-center py-4 px-2 rounded-xl active:bg-gray-100/50"
                    onPress={handleToggleLike}
                  >
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isLiked ? 'bg-red-500/20' : 'bg-gray-200/50'
                        }`}
                    >
                      <Heart
                        size={20}
                        color={isLiked ? "#EF4444" : "#6B7280"}
                        fill={isLiked ? "#EF4444" : "none"}
                      />
                    </View>
                    <Text className="text-gray-900 font-semibold text-base">
                      {isLiked ? "Unlike" : "Like"}
                    </Text>
                  </TouchableOpacity>

                  {/* Add to Playlist Button */}
                  <TouchableOpacity
                    className="flex-row items-center py-4 px-2 rounded-xl active:bg-gray-100/50"
                    onPress={openPlaylistSheet}
                  >
                    <View className="w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center mr-3">
                      <ListPlus size={20} color="#9F7AEA" />
                    </View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Add to Playlist
                    </Text>
                  </TouchableOpacity>

                  {/* Share Button */}
                  <TouchableOpacity
                    className="flex-row items-center py-4 px-2 rounded-xl active:bg-gray-100/50"
                    onPress={handleShare}
                  >
                    <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center mr-3">
                      <Share2 size={20} color="#3B82F6" />
                    </View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Share
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* PLAYLIST SELECTOR BOTTOM SHEET */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <BottomSheet
        ref={playlistSheetRef}
        index={-1}
        snapPoints={["70%"]}
        enablePanDownToClose={true}
        onClose={handleClosePlaylistSheet}
        enableDynamicSizing={true}
        handleIndicatorStyle={{ backgroundColor: '#9F7AEA', width: 40, height: 5 }}
        backgroundComponent={({ style }) => (
          <View style={[style, { overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
            <BlurView intensity={200} tint="light" style={{ flex: 1 }} />
          </View>
        )}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-200/50">
            <Text className="text-gray-900 font-bold text-xl tracking-tight">
              Add to Playlist
            </Text>
            {song && (
              <Text className="text-gray-500 text-xs mt-2 font-medium">
                {song.title}
              </Text>
            )}
          </View>

          {/* Playlist List */}
          {loadingPlaylists ? (
            <View className="h-32 justify-center items-center">
              <ActivityIndicator color="#9F7AEA" size="large" />
            </View>
          ) : playlists.length === 0 ? (
            <View className="h-32 justify-center items-center px-6">
              <ListMusic size={40} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-3 font-medium">
                ยังไม่มีเพลย์ลิสต์ครับ
              </Text>
            </View>
          ) : (
            <View>
              {playlists.map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  onPress={() => handleAddToPlaylist(pl)}
                  disabled={isAddingTrack}
                  className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100/50 active:bg-gray-50/30"
                >
                  <View className="flex-row items-center flex-1">
                    {pl.cover_image_url ? (
                      <Image
                        source={{ uri: pl.cover_image_url }}
                        className="w-12 h-12 rounded-lg bg-gray-200"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-300 to-purple-600 items-center justify-center">
                        <ListMusic size={20} color="#FFFFFF" />
                      </View>
                    )}
                    <View className="flex-1 ml-4 justify-center">
                      <Text
                        className="text-gray-900 font-semibold text-base"
                        numberOfLines={1}
                      >
                        {pl.name}
                      </Text>
                      <Text className="text-gray-500 text-xs mt-1">
                        {pl.track_count} เพลง
                      </Text>
                    </View>
                  </View>
                  {isAddingTrack && (
                    <ActivityIndicator size="small" color="#9F7AEA" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
}
