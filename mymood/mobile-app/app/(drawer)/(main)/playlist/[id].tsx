import "../../../global.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
    StyleSheet, Alert, RefreshControl, Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Play, Shuffle, Trash2, Music, MoreVertical, Pause } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import MiniPlayer from "@/components/MiniPlayer";
import SongContextMenu, { SongMenuItem } from "@/components/SongContextMenu";
import { httpClient } from "@/services/httpClient";
import { useAudio } from "@/context/AudioContext";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/context/ToastContext";
import { Heart } from "lucide-react-native";

type Track = SongMenuItem & {
    track_id: string;
    order_index: number;
    duration_seconds?: number;
};

type PlaylistDetail = {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    is_public: boolean;
    is_ai_generated: boolean;
    ai_prompt_used: string | null;
    created_at: string;
    track_count: number;
    tracks: Track[];
};

function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatTotalDuration(tracks: Track[]): string {
    const total = tracks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
    if (total <= 0) return "";
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    if (hrs > 0) return `${hrs} h. ${mins} m.`;
    return `${mins} m.`;
}

export default function PlaylistDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { playSong, currentSong, isPlaying, togglePlayPause } = useAudio();
    const { likedSongIds } = useUser();
    const { showToast } = useToast();

    const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSong, setSelectedSong] = useState<SongMenuItem | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const fetchPlaylist = useCallback(async (isBackground = false) => {
        if (!id) return;
        if (!isBackground) setLoading(true);
        try {
            const data = await httpClient.get<{ playlist: PlaylistDetail }>(`/api/playlists/${id}`);
            if (data?.playlist) setPlaylist(data.playlist);
        } catch (err: any) {
            console.error("Failed to fetch playlist:", err);
            showToast("ไม่สามารถโหลดเพลย์ลิสต์ได้", "error");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPlaylist();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start();
    }, [fetchPlaylist]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPlaylist(true);
        setRefreshing(false);
    };

    const handlePlayAll = () => {
        if (!playlist || playlist.tracks.length === 0) return;
        const songs = playlist.tracks as any[];
        playSong(songs[0], songs);
    };

    const handleShufflePlay = () => {
        if (!playlist || playlist.tracks.length === 0) return;
        const songs = [...playlist.tracks] as any[];
        // Fisher-Yates shuffle
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        playSong(songs[0], songs);
    };

    const handlePlayTrack = (track: Track, index: number) => {
        const songs = playlist!.tracks as any[];
        playSong(songs[index], songs);
    };

    const handleRemoveTrack = (track: Track) => {
        Alert.alert(
            "Remove Track",
            `Remove "${track.title}" from the playlist?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove", style: "destructive", onPress: async () => {
                        try {
                            await httpClient.delete(`/api/playlists/${id}/tracks/${track.track_id}`);
                            setPlaylist(prev => {
                                if (!prev) return prev;
                                const tracks = prev.tracks.filter(t => t.track_id !== track.track_id);
                                return { ...prev, tracks, track_count: tracks.length };
                            });
                            showToast("Track removed from playlist", "success");
                        } catch (err) {
                            showToast("Failed to remove track", "error");
                        }
                    }
                },
            ]
        );
    };

    const handleDeletePlaylist = () => {
        Alert.alert(
            "Delete Playlist",
            `Delete "${playlist?.name}" entirely?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        try {
                            await httpClient.delete(`/api/playlists/${id}`);
                            showToast("Playlist deleted successfully", "success");
                            router.back();
                        } catch (err) {
                            showToast("Failed to delete playlist", "error");
                        }
                    }
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F3FF" }}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    if (!playlist) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F3FF" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 16 }}>Playlist not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: "#7C3AED", fontWeight: "700" }}>← Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const coverUrl = playlist.cover_image_url || playlist.tracks[0]?.cover_image_url;
    const isCurrentPlaylist = playlist.tracks.some(t => t.id === currentSong?.id);

    return (
        <Animated.View style={{ flex: 1, backgroundColor: "#F5F3FF", opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={["#8B5CF6"]} />}
            >
                {/* ── Hero Header ── */}
                <View style={styles.heroContainer}>
                    {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFillObject} blurRadius={30} />
                    ) : (
                        <LinearGradient colors={["#7C3AED", "#A855F7", "#C084FC"]} style={StyleSheet.absoluteFillObject} />
                    )}
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)" }]} />

                    {/* Back button */}
                    
                      
                        <TouchableOpacity onPress={handleDeletePlaylist} style={styles.backBtn}>
                            <Trash2 color="#fff" size={20} />
                        </TouchableOpacity>
                    
                    

                    {/* Cover */}
                    <View style={styles.heroCoverShadow}>
                        {coverUrl ? (
                            <Image source={{ uri: coverUrl }} style={styles.heroCover} />
                        ) : (
                            <View style={[styles.heroCover, { overflow: "hidden" }]}>
                                <LinearGradient
                                    colors={["#7C3AED", "#A855F7", "#E9D5FF"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" }}>
                                    <Music color="#fff" size={36} />
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Info */}
                    <Text style={styles.heroTitle} numberOfLines={2}>{playlist.name}</Text>
                    {playlist.description ? (
                        <Text style={styles.heroDesc} numberOfLines={2}>{playlist.description}</Text>
                    ) : null}

                    <View style={styles.heroMeta}>
                        <Text style={styles.heroMetaText}>{playlist.track_count} เพลง</Text>
                        {formatTotalDuration(playlist.tracks) ? (
                            <>
                                <Text style={styles.heroMetaDot}>•</Text>
                                <Text style={styles.heroMetaText}>{formatTotalDuration(playlist.tracks)}</Text>
                            </>
                        ) : null}
                        {playlist.is_ai_generated && (
                            <>
                                <Text style={styles.heroMetaDot}>•</Text>
                                <Text style={[styles.heroMetaText, { color: "#C084FC" }]}>AI Generated</Text>
                            </>
                        )}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.heroActions}>
                        <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlay}>
                            <Shuffle color="#7C3AED" size={18} />
                            <Text style={styles.shuffleBtnText}>สุ่มเล่น</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.playAllBtn}
                            onPress={isCurrentPlaylist && isPlaying ? togglePlayPause : handlePlayAll}
                        >
                            {isCurrentPlaylist && isPlaying ? (
                                <Pause color="#fff" size={20} fill="#fff" />
                            ) : (
                                <Play color="#fff" size={20} fill="#fff" />
                            )}
                            <Text style={styles.playAllBtnText}>
                                {isCurrentPlaylist && isPlaying ? "หยุด" : "เล่นทั้งหมด"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Track List ── */}
                <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                    {playlist.tracks.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Music color="#D8B4FE" size={40} />
                            <Text style={styles.emptyText}>No tracks in this playlist</Text>
                            <Text style={styles.emptySubText}>Add tracks from the search page or long press on a track</Text>
                        </View>
                    ) : (
                        playlist.tracks.map((track, index) => {
                            const isActive = currentSong?.id === track.id;
                            return (
                                <TouchableOpacity
                                    key={track.track_id}
                                    style={[styles.trackRow, isActive && styles.trackRowActive]}
                                    onPress={() => handlePlayTrack(track, index)}
                                    onLongPress={() => setSelectedSong(track)}
                                    delayLongPress={350}
                                    activeOpacity={0.7}
                                >
                                    {/* Track number / playing indicator */}
                                    <View style={styles.trackIndex}>
                                        {isActive ? (
                                            <View style={styles.nowPlayingDot} />
                                        ) : (
                                            <Text style={styles.trackIndexText}>{index + 1}</Text>
                                        )}
                                    </View>

                                    {/* Cover */}
                                    <Image
                                        source={{ uri: track.cover_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(track.title)}&background=7C3AED&color=fff` }}
                                        style={styles.trackCover}
                                    />

                                    {/* Info */}
                                    <View style={styles.trackInfo}>
                                        <Text style={[styles.trackTitle, isActive && { color: "#7C3AED" }]} numberOfLines={1}>
                                            {track.title}
                                        </Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            {likedSongIds.has(track.id) && (
                                                <Heart size={10} color="#EF4444" fill="#EF4444" />
                                            )}
                                            <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                                        </View>
                                    </View>

                                    {/* Duration */}
                                    <Text style={styles.trackDuration}>
                                        {formatDuration(track.duration_seconds)}
                                    </Text>

                                    {/* Remove button */}
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => handleRemoveTrack(track)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <MoreVertical color="#9CA3AF" size={18} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    {/* AI prompt badge */}
                    {playlist.is_ai_generated && playlist.ai_prompt_used && (
                        <View style={styles.aiPromptCard}>
                            <Text style={styles.aiPromptLabel}>AI Prompt ที่ใช้สร้าง:</Text>
                            <Text style={styles.aiPromptText}>"{playlist.ai_prompt_used}"</Text>
                        </View>
                    )}

                    {/* Created date */}
                    <Text style={styles.createdAt}>
                        สร้างเมื่อ {new Date(playlist.created_at).toLocaleDateString("th-TH", {
                            year: "numeric", month: "long", day: "numeric",
                        })}
                    </Text>

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            <MiniPlayer />

            <SongContextMenu
                visible={!!selectedSong}
                song={selectedSong}
                onClose={() => setSelectedSong(null)}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    // Hero
    heroContainer: {
        alignItems: "center",
        paddingTop: 50,
        paddingBottom: 28,
        paddingHorizontal: 24,
        overflow: "hidden",
    },
    
    backBtn: {
        width: 40, height: 40, borderRadius: 20, padding: 10,
        position: "absolute", top: 24, right: 24,

        backgroundColor: "rgba(255,255,255,0.2)",
         alignItems: "center", justifyContent: "center",    
    },
    heroCoverShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
        marginBottom: 20,
    },
    heroCover: {
        width: 200, height: 200, borderRadius: 24,
        backgroundColor: "#E9D5FF",
    },
    heroTitle: {
        fontSize: 26, fontWeight: "800", color: "#fff",
        textAlign: "center", marginBottom: 6,
    },
    heroDesc: {
        fontSize: 14, color: "rgba(255,255,255,0.75)",
        textAlign: "center", marginBottom: 8,
    },
    heroMeta: {
        flexDirection: "row", alignItems: "center",
        marginBottom: 20,
    },
    heroMetaText: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
    heroMetaDot: { marginHorizontal: 8, color: "rgba(255,255,255,0.4)" },
    heroActions: {
        flexDirection: "row", gap: 12,
    },
    shuffleBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 20, paddingVertical: 12,
        backgroundColor: "#fff", borderRadius: 50,
    },
    shuffleBtnText: { fontWeight: "700", color: "#7C3AED", fontSize: 14 },
    playAllBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 24, paddingVertical: 12,
        backgroundColor: "#7C3AED", borderRadius: 50,
    },
    playAllBtnText: { fontWeight: "700", color: "#fff", fontSize: 14 },

    // Empty state
    emptyCard: {
        backgroundColor: "#fff", borderRadius: 24, padding: 32,
        alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6",
    },
    emptyText: { color: "#6B7280", marginTop: 12, fontWeight: "600", fontSize: 15 },
    emptySubText: { color: "#9CA3AF", marginTop: 4, fontSize: 12, textAlign: "center" },

    // Track row
    trackRow: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 10, paddingHorizontal: 8,
        marginBottom: 4, borderRadius: 14,
        backgroundColor: "transparent",
    },
    trackRowActive: {
        backgroundColor: "rgba(124, 58, 237, 0.08)",
    },
    trackIndex: {
        width: 28, alignItems: "center", justifyContent: "center",
    },
    trackIndexText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
    nowPlayingDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: "#7C3AED",
    },
    trackCover: {
        width: 48, height: 48, borderRadius: 10,
        backgroundColor: "#E9D5FF", marginRight: 12,
    },
    trackInfo: {
        flex: 1, justifyContent: "center",
    },
    trackTitle: {
        fontSize: 14, fontWeight: "700", color: "#1F2937",
        marginBottom: 2,
    },
    trackArtist: { fontSize: 12, color: "#6B7280" },
    trackDuration: {
        fontSize: 12, color: "#9CA3AF", fontWeight: "500",
        marginRight: 4, minWidth: 40, textAlign: "right",
    },
    removeBtn: {
        padding: 8,
    },

    // AI prompt
    aiPromptCard: {
        backgroundColor: "#FAF5FF", borderRadius: 16,
        padding: 16, marginTop: 20, borderWidth: 1, borderColor: "#EDE9FE",
    },
    aiPromptLabel: { fontSize: 12, color: "#7C3AED", fontWeight: "700", marginBottom: 4 },
    aiPromptText: { fontSize: 13, color: "#6B7280", fontStyle: "italic" },

    // Footer
    createdAt: {
        textAlign: "center", color: "#9CA3AF",
        fontSize: 12, marginTop: 24,
    },
});
