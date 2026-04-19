import "../../../global.css";
import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
    Modal, TextInput, Switch, StyleSheet, Dimensions, RefreshControl
} from "react-native";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Upload, Heart, Music, ListMusic } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import MiniPlayer from "@/components/MiniPlayer";
import SongContextMenu, { SongMenuItem } from "@/components/SongContextMenu";
import { supabase } from "@/lib/supabase";
import { httpClient } from "@/services/httpClient";
import { useAudio } from "@/context/AudioContext";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "expo-router";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
type Song = SongMenuItem;
type Playlist = { id: string; name: string; cover_image_url?: string; track_count: number };

export default function LibraryScreen() {
    const { playSong } = useAudio();
    const { likedSongs, likedSongIds, toggleLike } = useUser();
    const { showToast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [recentSongs, setRecentSongs] = useState<Song[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const loadLibraryData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const [historyData, playlistsData] = await Promise.all([
                httpClient.get<{ recent_songs: Song[] }>('/api/play/history'),
                httpClient.get<{ playlists: Playlist[] }>('/api/playlists'),
            ]);

            if (historyData?.recent_songs) setRecentSongs(historyData.recent_songs);
            if (playlistsData?.playlists) setPlaylists(playlistsData.playlists);
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
    const openContextMenu = (song: Song) => setSelectedSong(song);
    const closeContextMenu = () => setSelectedSong(null);

    const pickCoverImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) { showToast("Please enter a playlist name", 'info'); return; }
        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', newPlaylistName.trim());
            if (coverImage) {
                const filename = coverImage.split('/').pop() || 'cover.jpg';
                const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
                const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                formData.append('cover_image', {
                    uri: coverImage,
                    name: filename,
                    type: mimeType,
                } as any);
            }
            const data = await httpClient.postFormData<{ playlist: { id: string; name: string; cover_image_url?: string } }>('/api/playlists', formData);
            setPlaylists((prev) => [{
                id: data.playlist.id, name: data.playlist.name,
                cover_image_url: data.playlist.cover_image_url, track_count: 0,
            }, ...prev]);
            setCreateModalVisible(false);
            setNewPlaylistName("");
            setCoverImage(null);
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: "#F5F3FF", paddingTop: 20, paddingHorizontal: 20 }}>
                <SkeletonLoader width="50%" height={28} className="mb-6" />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                    {[1,2,3,4,5,6].map(i => (
                        <View key={i} style={{ width: (Dimensions.get("window").width - 56) / 2 }}>
                            <SkeletonLoader width="100%" height={140} borderRadius={16} className="mb-2" />
                            <SkeletonLoader width="70%" height={14} className="mb-1" />
                            <SkeletonLoader width="40%" height={12} />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#F5F3FF" }}>
            <ScrollView showsVerticalScrollIndicator={false} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
            }>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Library</Text>
                    <Text style={styles.headerSub}>เน€เธเธฅเธเนเธฅเธฐเน€เธเธฅเธขเนเธฅเธดเธชเธ•เนเธเธญเธเธเธธเธ“</Text>
                </View>

                <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>

                    {/* Recently Played */}
                    <Text style={styles.sectionTitle}>Recently Played</Text>
                    {recentSongs.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Music color="#D8B4FE" size={40} />
                            <Text style={styles.emptyText}>You haven't played any songs recently.</Text>
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
                                        {likedSongIds.has(song.id) && (
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

                    {/* Playlists */}
                    <Text style={styles.sectionTitle}>Playlists</Text>
                    <View style={styles.grid}>

                        {/* Liked Songs card */}
                        <TouchableOpacity style={styles.gridCell} onPress={() => router.push('/(drawer)/(main)/liked-songs')}>
                            <View style={[styles.gridCover, { backgroundColor: "#F3E8FF", borderWidth: 1, borderColor: "#DDD6FE" }]}>
                                <Heart color="#9333ea" size={44} fill="#9333ea" />
                            </View>
                            <Text style={styles.gridLabel} numberOfLines={1}>Liked Songs</Text>
                            <Text style={styles.gridSub}>{likedSongs.length} songs</Text>
                        </TouchableOpacity>

                        {/* New Playlist button */}
                        <TouchableOpacity style={styles.gridCell} onPress={() => setCreateModalVisible(true)}>
                            <View style={[styles.gridCover, { backgroundColor: "#fff", borderWidth: 2, borderColor: "#C4B5FD", borderStyle: "dashed" }]}>
                                <Text style={{ fontSize: 44, color: "#A78BFA", lineHeight: 52 }}>+</Text>
                            </View>
                            <Text style={styles.gridLabel}>New Playlist</Text>
                            <Text style={styles.gridSub}>Create a new playlist</Text>
                        </TouchableOpacity>

                        {/* User playlists */}
                        {playlists.map((playlist, idx) => (
                            <TouchableOpacity
                                key={playlist.id}
                                style={styles.gridCell}
                                onPress={() => router.push({ pathname: "/(drawer)/(main)/playlist/[id]", params: { id: playlist.id } })}
                            >
                                {playlist.cover_image_url ? (
                                    <Image source={{ uri: playlist.cover_image_url }} style={styles.gridCover} />
                                ) : (
                                    <View style={styles.gridCover}>
                                        <LinearGradient
                                            colors={[
                                                ['#7C3AED', '#A855F7', '#E9D5FF'],
                                                ['#6366F1', '#818CF8', '#C7D2FE'],
                                                ['#8B5CF6', '#C084FC', '#F5D0FE'],
                                                ['#7C3AED', '#EC4899', '#FDE68A'],
                                            ][idx % 4] as [string, string, string]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFillObject}
                                        />
                                        <View style={styles.gridCoverIconRing}>
                                            <Music color="#fff" size={28} />
                                        </View>
                                    </View>
                                )}
                                <Text style={styles.gridLabel} numberOfLines={1}>{playlist.name}</Text>
                                <Text style={styles.gridSub}>{playlist.track_count} songs</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            <MiniPlayer />

            {/* Song Context Menu (long-press bottom sheet) */}
            <SongContextMenu
                visible={!!selectedSong}
                song={selectedSong}
                onClose={closeContextMenu}
            />


            {/* CREATE PLAYLIST — Centered pop-up (from previous build) */}

            <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => { setCreateModalVisible(false); setCoverImage(null); }}>
                <TouchableOpacity activeOpacity={1} onPress={() => { setCreateModalVisible(false); setCoverImage(null); }} style={styles.centeredOverlay}>
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.centeredCard}>
                        <Text style={styles.cardTitle}>NEW PLAYLIST</Text>

                        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={pickCoverImage}>
                            {coverImage ? (
                                <Image source={{ uri: coverImage }} style={styles.uploadPreview} />
                            ) : (
                                <>
                                    <Upload color="#7C3AED" size={32} />
                                    <Text style={styles.uploadText}>upload</Text>
                                </>
                            )}
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

// Styles
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
    gridCoverIconRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
    gridLabel: { fontWeight: "700", color: "#1F2937", fontSize: 13, marginTop: 8 },
    gridSub: { color: "#6B7280", fontSize: 11, marginTop: 2 },

    // Bottom Sheet (context menu)
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

    // Create Playlist modal
    centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
    centeredCard: { width: "100%", backgroundColor: "#fff", borderRadius: 28, padding: 24, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    cardTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937", letterSpacing: 1.5, marginBottom: 20 },
    uploadBox: { alignSelf: "center", width: 140, height: 140, borderRadius: 16, borderWidth: 2.5, borderColor: "#7C3AED", borderStyle: "dashed", justifyContent: "center", alignItems: "center", marginBottom: 24, backgroundColor: "#FAF5FF", overflow: "hidden" },
    uploadPreview: { width: "100%", height: "100%", borderRadius: 14 },
    uploadText: { marginTop: 8, color: "#7C3AED", fontWeight: "600", fontSize: 14 },
    toggleRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    toggleLabel: { fontSize: 15, fontWeight: "700", color: "#7C3AED" },
    toggleSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    input: { borderWidth: 1.5, borderColor: "#7C3AED", borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#374151", letterSpacing: 1, marginBottom: 16 },
    createBtn: { borderWidth: 1.5, borderColor: "#7C3AED", borderRadius: 24, paddingVertical: 12, alignItems: "center" },
    createBtnText: { color: "#7C3AED", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
});