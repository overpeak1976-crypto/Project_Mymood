import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { Heart, ListPlus, Share2, ChevronLeft, ListMusic } from "lucide-react-native";
import { httpClient } from "../lib/httpClient";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { BlurView } from 'expo-blur';
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import FriendPickerSheet from "./FriendPickerSheet";

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
}

export default function SongContextMenu({
  visible,
  song,
  onClose,
}: SongContextMenuProps) {
  const { likedSongIds, toggleLike } = useUser();
  const { showToast } = useToast();
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const isLiked = song ? likedSongIds.has(song.id) : false;
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
    []
  );

  const handleClose = () => {
    setShowPlaylistSelector(false);
    onClose();
  };

  const handleToggleLike = async () => {
    if (!song) return;
    await toggleLike(song as any);
    handleClose();
  };

  const openPlaylistSelector = async () => {
    setLoadingPlaylists(true);
    setShowPlaylistSelector(true);
    try {
      const data = await httpClient.get<{ playlists: Playlist[] }>('/api/playlists');
      setPlaylists(data?.playlists || []);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
      setShowPlaylistSelector(false);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!song) return;
    setIsAddingTrack(true);
    try {
      await httpClient.post(`/api/playlists/${playlist.id}/tracks`, { song_id: song.id });

      handleClose();
      showToast(`"${song.title}" added to "${playlist.name}"`, 'success');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsAddingTrack(false);
    }
  };

  const handleShare = () => {
    if (!song) return;
    handleClose();
    setTimeout(() => setShowFriendPicker(true), 300);
  };

  const coverUri =
    song?.cover_image_url ||
    (song ? `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=7C3AED&color=fff` : "");

  return (
    <>
    <BottomSheet
      ref={sheetRef}
      // ปิด Dynamic Sizing เพื่อให้ Scroll ทำงานได้ 100%
      enableDynamicSizing={false} 
      // เพิ่มระยะให้ยืดจอได้กว้างขึ้นเวลาดูเพลย์ลิสต์
      snapPoints={useMemo(() => showPlaylistSelector ? ['90%'] : ['45%'], [showPlaylistSelector])}
      enablePanDownToClose={true}
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      backgroundComponent={({ style }) => (
              <View style={[style, { overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
                <BlurView intensity={200} tint="dark" style={{ flex: 1 }} />
              </View>
      )}
      backgroundStyle={{ borderRadius: 32 }}
      handleIndicatorStyle={{ backgroundColor: "#D1D5DB", width: 40, height: 4, marginTop: 10 }}
      index={-1}
    >
      {/* เปลี่ยนจาก BottomSheetView เป็น BottomSheetScrollView คลุมทั้งหมด */}
      <BottomSheetScrollView 
        contentContainerStyle={styles.sheet}
        showsVerticalScrollIndicator={false}
      >
        {song && (
          <>
            {/* Song Header */}
            <View style={styles.songHeader} className="pt-2">
              <Image source={{ uri: coverUri }} style={styles.cover} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
              </View>
            </View>

            {/* ── View: Options ── */}
            {!showPlaylistSelector && (
              <>
                <TouchableOpacity style={styles.menuRow} onPress={handleToggleLike}>
                  <View style={[styles.iconBg, { backgroundColor: isLiked ? "#FEE2E2" : "#F3F4F6" }]}>
                    <Heart
                      size={20}
                      color={isLiked ? "#EF4444" : "#6B7280"}
                      fill={isLiked ? "#EF4444" : "none"}
                    />
                  </View>
                  <Text style={styles.menuLabel}>{isLiked ? "Unlike" : "Like"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={openPlaylistSelector}>
                  <View style={[styles.iconBg, { backgroundColor: "#EDE9FE" }]}>
                    <ListPlus size={20} color="#7C3AED" />
                  </View>
                  <Text style={styles.menuLabel}>Add to Playlist</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={handleShare}>
                  <View style={[styles.iconBg, { backgroundColor: "#E0F2FE" }]}>
                    <Share2 size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.menuLabel}>Share</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── View: Playlist Selector ── */}
            {showPlaylistSelector && (
              <>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
                  onPress={() => setShowPlaylistSelector(false)}
                >
                  <ChevronLeft size={18} color="#7C3AED" />
                  <Text style={{ color: "#7C3AED", fontWeight: "600", marginLeft: 4 }}>Back</Text>
                </TouchableOpacity>

                <Text style={[styles.songTitle, { marginBottom: 12 }]}>Add to Playlist</Text>

                {loadingPlaylists ? (
                  <ActivityIndicator color="#7C3AED" style={{ paddingVertical: 24 }} />
                ) : (
                  <View>
                    {playlists.length === 0 ? (
                      <Text style={{ color: "#9CA3AF", textAlign: "center", paddingVertical: 20 }}>
                        ยังไม่มีเพลย์ลิสต์ครับ
                      </Text>
                    ) : (
                      playlists.map((pl) => (
                        <TouchableOpacity
                          key={pl.id}
                          style={styles.plRow}
                          onPress={() => handleAddToPlaylist(pl)}
                          disabled={isAddingTrack}
                        >
                          {pl.cover_image_url ? (
                            <Image source={{ uri: pl.cover_image_url }} style={styles.plThumb} />
                          ) : (
                            <View style={[styles.plThumb, { backgroundColor: "#EDE9FE", justifyContent: "center", alignItems: "center" }]}>
                              <ListMusic size={20} color="#7C3AED" />
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.menuLabel} numberOfLines={1}>{pl.name}</Text>
                            <Text style={styles.songArtist}>{pl.track_count} เพลง</Text>
                          </View>
                          {isAddingTrack && <ActivityIndicator size="small" color="#7C3AED" />}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>

    <FriendPickerSheet
      visible={showFriendPicker}
      songId={song?.id || null}
      songTitle={song?.title || null}
      onClose={() => setShowFriendPicker(false)}
    />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  songHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cover: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#EDE9FE" },
  songTitle: { fontWeight: "700", fontSize: 15, color: "#ffffffee" },
  songArtist: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 16 },
  menuLabel: { fontSize: 15, fontWeight: "600", color: "#ffffffd7" },
  plRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  plThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#EDE9FE" },
});