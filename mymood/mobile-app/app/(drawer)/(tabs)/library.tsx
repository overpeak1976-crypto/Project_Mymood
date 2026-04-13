import "../../global.css";
import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
    Modal, TextInput, Alert, Switch, StyleSheet, Dimensions, RefreshControl
} from "react-native";
import { Upload, Heart, Music, ListMusic } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import MiniPlayer from "../../../components/MiniPlayer";
import SongContextMenu, { SongMenuItem } from "../../../components/SongContextMenu";
import { supabase } from "../../../lib/supabase";
import { useAudio } from "../../../context/AudioContext";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
type Song = SongMenuItem;
type Playlist = { id: string; name: string; cover_image_url?: string; track_count: number };

export default function LibraryScreen() {
    const { playSong } = useAudio();

    // ─── Data state ──────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [recentSongs, setRecentSongs] = useState<Song[]>([]);
    const [likedSongs, setLikedSongs] = useState<Song[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [refreshing, setRefreshing] = useState(false);

    // ─── Create-playlist modal ────────────────────────────────────────────────────
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // ─── Long-press context menu ─────────────────────────────────────────────────
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    // ─── Data Fetching ────────────────────────────────────────────────────────────
    const loadLibraryData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) { setLoading(false); return; }
            const headers = { Authorization: `Bearer ${session.access_token}` };

            const [historyRes, likesRes, playlistsRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/play/history`, { headers }),
                fetch(`${BACKEND_URL}/api/likes/my-likes`, { headers }),
                fetch(`${BACKEND_URL}/api/playlists`, { headers }),
            ]);

            if (historyRes.ok) setRecentSongs((await historyRes.json()).recent_songs || []);
            if (likesRes.ok) {
                const liked = (await likesRes.json()).liked_songs || [];
                setLikedSongs(liked);
                // Build a Set of liked song IDs for O(1) look-up
                setLikedIds(new Set(liked.map((s: any) => s.id)));
            }
            if (playlistsRes.ok) setPlaylists((await playlistsRes.json()).playlists || []);
        } catch (err) {
            console.error("Library fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLibraryData(true);
        setRefreshing(false);
    };

    useEffect(() => {
        loadLibraryData();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.access_token) {
                loadLibraryData(true);
            }
        });
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // ─── Context Menu Handlers ────────────────────────────────────────────────────

    const openContextMenu = (song: Song) => setSelectedSong(song);
    const closeContextMenu = () => setSelectedSong(null);

    /** Called by SongContextMenu after a successful like/unlike */
    const handleLikeToggled = (songId: string, isNowLiked: boolean) => {
        setLikedIds((prev) => {
            const next = new Set(prev);
            isNowLiked ? next.add(songId) : next.delete(songId);
            return next;
        });
    };

    // ─── Create Playlist ──────────────────────────────────────────────────────────
    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) { Alert.alert("แจ้งเตือน", "กรุณาใส่ชื่อก่อนครับ"); return; }
        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("ไม่มี session");
            const res = await fetch(`${BACKEND_URL}/api/playlists`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ name: newPlaylistName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlaylists((prev) => [{
                id: data.playlist.id, name: data.playlist.name,
                cover_image_url: undefined, track_count: 0,
            }, ...prev]);
            setCreateModalVisible(false);
            setNewPlaylistName("");
        } catch (err: any) {
            Alert.alert("เกิดข้อผิดพลาด", err.message);
        } finally {
            setIsCreating(false);
        }
    };



    // ─── Loading ──────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F3FF" }}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    // ─── Main Render ──────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: "#F5F3FF" }}>
            <ScrollView showsVerticalScrollIndicator={false} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
            }>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Library</Text>
                    <Text style={styles.headerSub}>เพลงและเพลย์ลิสต์ของคุณ</Text>
                </View>

                <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>

                    {/* ── Recently Played ── */}
                    <Text style={styles.sectionTitle}>เล่นล่าสุด</Text>
                    {recentSongs.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Music color="#D8B4FE" size={40} />
                            <Text style={styles.emptyText}>ยังไม่มีประวัติการฟังเพลงครับ</Text>
                        </View>
                    ) : (
                        <View style={{ position: "relative", marginBottom: 28 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {recentSongs.map((song) => (
                                    <TouchableOpacity
                                        key={song.id}
                                        style={{ marginRight: 14, width: 120 }}
                                        onPress={() => playSong?.(song as any, recentSongs as any)}
                                        onLongPress={() => openContextMenu(song)}
                                        delayLongPress={350}
                                    >
                                        <Image
                                            source={{ uri: song.cover_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=7C3AED&color=fff` }}
                                            style={styles.songCover}
                                        />
                                        {/* Heart badge if liked */}
                                        {likedIds.has(song.id) && (
                                            <View style={styles.heartBadge}>
                                                <Heart size={10} color="#fff" fill="#fff" />
                                            </View>
                                        )}
                                        <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                                        <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* ── Playlists ── */}
                    <Text style={styles.sectionTitle}>เพลย์ลิสต์</Text>
                    <View style={styles.grid}>

                        {/* Liked Songs card */}
                        <TouchableOpacity style={styles.gridCell}>
                            <View style={[styles.gridCover, { backgroundColor: "#F3E8FF", borderWidth: 1, borderColor: "#DDD6FE" }]}>
                                <Heart color="#9333ea" size={44} fill="#9333ea" />
                            </View>
                            <Text style={styles.gridLabel} numberOfLines={1}>เพลงที่ถูกใจ</Text>
                            <Text style={styles.gridSub}>{likedSongs.length} เพลง</Text>
                        </TouchableOpacity>

                        {/* New Playlist button */}
                        <TouchableOpacity style={styles.gridCell} onPress={() => setCreateModalVisible(true)}>
                            <View style={[styles.gridCover, { backgroundColor: "#fff", borderWidth: 2, borderColor: "#C4B5FD", borderStyle: "dashed" }]}>
                                <Text style={{ fontSize: 44, color: "#A78BFA", lineHeight: 52 }}>+</Text>
                            </View>
                            <Text style={styles.gridLabel}>เพลย์ลิสต์ใหม่</Text>
                            <Text style={styles.gridSub}>สร้างเองได้เลย</Text>
                        </TouchableOpacity>

                        {/* User playlists */}
                        {playlists.map((playlist) => (
                            <TouchableOpacity key={playlist.id} style={styles.gridCell}>
                                {playlist.cover_image_url ? (
                                    <Image source={{ uri: playlist.cover_image_url }} style={styles.gridCover} />
                                ) : (
                                    <View style={[styles.gridCover, { backgroundColor: "#EDE9FE" }]}>
                                        <ListMusic color="#7C3AED" size={40} />
                                    </View>
                                )}
                                <Text style={styles.gridLabel} numberOfLines={1}>{playlist.name}</Text>
                                <Text style={styles.gridSub}>{playlist.track_count} เพลง</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            <MiniPlayer />

            {/* ── Song Context Menu (long-press bottom sheet) ── */}
            <SongContextMenu
                visible={!!selectedSong}
                song={selectedSong}
                onClose={closeContextMenu}
                likedIds={likedIds}
                onLikeToggled={handleLikeToggled}
            />


            {/* ═══════════════════════════════════════════════════════════════════════
          CREATE PLAYLIST — Centered pop-up (from previous build)
      ═══════════════════════════════════════════════════════════════════════ */}
            <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setCreateModalVisible(false)} style={styles.centeredOverlay}>
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.centeredCard}>
                        <Text style={styles.cardTitle}>NEW PLAYLIST</Text>

                        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
                            <Upload color="#7C3AED" size={32} />
                            <Text style={styles.uploadText}>upload</Text>
                        </TouchableOpacity>

                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>Public Playlist</Text>
                                <Text style={styles.toggleSub}>Everyone can see this Playlist.</Text>
                            </View>
                            <Switch
                                value={isPublic}
                                onValueChange={setIsPublic}
                                trackColor={{ false: "#E5E7EB", true: "#7C3AED" }}
                                thumbColor="#ffffff"
                            />
                        </View>

                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="PLAYLIST NAME"
                            placeholderTextColor="#9CA3AF"
                            style={styles.input}
                            autoCapitalize="characters"
                            maxLength={50}
                        />

                        <TouchableOpacity onPress={handleCreatePlaylist} disabled={isCreating} style={[styles.createBtn, isCreating && { opacity: 0.5 }]}>
                            {isCreating ? <ActivityIndicator color="#7C3AED" /> : <Text style={styles.createBtnText}>Create</Text>}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Layout
    header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, backgroundColor: "#fff", borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
    headerTitle: { fontSize: 30, fontWeight: "800", color: "#4C1D95" },
    headerSub: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
    sectionTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
    emptyCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 28, borderWidth: 1, borderColor: "#F3F4F6" },
    emptyText: { color: "#9CA3AF", marginTop: 10, textAlign: "center" },

    // Song card (horizontal scroll)
    songCover: { width: 120, height: 120, borderRadius: 16, backgroundColor: "#E9D5FF" },
    heartBadge: { position: "absolute", top: 6, right: 6, backgroundColor: "#EF4444", borderRadius: 10, padding: 3 },
    songTitle: { fontWeight: "700", color: "#1F2937", fontSize: 13, marginTop: 8 },
    songArtist: { color: "#6B7280", fontSize: 11, marginTop: 2 },

    // Grid (playlists)
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    gridCell: { width: "48%", marginBottom: 20 },
    gridCover: { width: "100%", aspectRatio: 1, borderRadius: 24, backgroundColor: "#EDE9FE", justifyContent: "center", alignItems: "center", overflow: "hidden" },
    gridLabel: { fontWeight: "700", color: "#1F2937", fontSize: 13, marginTop: 8 },
    gridSub: { color: "#6B7280", fontSize: 11, marginTop: 2 },

    // ── Bottom Sheet (context menu)
    sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheetContainer: { backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
    dragHandle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    sheetCover: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#EDE9FE" },
    sheetSongTitle: { fontWeight: "700", fontSize: 15, color: "#111827" },
    sheetSongArtist: { color: "#6B7280", fontSize: 13, marginTop: 2 },
    sheetDivider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 8 },
    menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    menuIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 16 },
    menuLabel: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
    playlistRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    playlistRowThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#EDE9FE" },

    // ── Create Playlist modal
    centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
    centeredCard: { width: "100%", backgroundColor: "#fff", borderRadius: 28, padding: 24, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    cardTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937", letterSpacing: 1.5, marginBottom: 20 },
    uploadBox: { alignSelf: "center", width: 140, height: 140, borderRadius: 16, borderWidth: 2.5, borderColor: "#7C3AED", borderStyle: "dashed", justifyContent: "center", alignItems: "center", marginBottom: 24, backgroundColor: "#FAF5FF" },
    uploadText: { marginTop: 8, color: "#7C3AED", fontWeight: "600", fontSize: 14 },
    toggleRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    toggleLabel: { fontSize: 15, fontWeight: "700", color: "#7C3AED" },
    toggleSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    input: { borderWidth: 1.5, borderColor: "#7C3AED", borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#374151", letterSpacing: 1, marginBottom: 16 },
    createBtn: { borderWidth: 1.5, borderColor: "#7C3AED", borderRadius: 24, paddingVertical: 12, alignItems: "center" },
    createBtnText: { color: "#7C3AED", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
});