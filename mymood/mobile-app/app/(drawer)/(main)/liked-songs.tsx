import "../../global.css";
import React, { useState, useRef, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    StyleSheet, RefreshControl, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Play, Shuffle, Heart, Pause, Music } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import MiniPlayer from "@/components/MiniPlayer";
import SongContextMenu, { SongMenuItem } from "@/components/SongContextMenu";
import { useAudio } from "@/context/AudioContext";
import { useUser } from "@/context/UserContext";

function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function LikedSongsScreen() {
    const router = useRouter();
    const { playSong, currentSong, isPlaying, togglePlayPause } = useAudio();
    const { likedSongs, refreshUserData } = useUser();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedSong, setSelectedSong] = useState<SongMenuItem | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshUserData();
        setRefreshing(false);
    };

    const handlePlayAll = () => {
        if (likedSongs.length === 0) return;
        playSong(likedSongs[0] as any, likedSongs as any[]);
    };

    const handleShufflePlay = () => {
        if (likedSongs.length === 0) return;
        const songs = [...likedSongs] as any[];
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        playSong(songs[0], songs);
    };

    const handlePlayTrack = (index: number) => {
        playSong(likedSongs[index] as any, likedSongs as any[]);
    };

    const isCurrentLiked = likedSongs.some((s: any) => s.id === currentSong?.id);

    return (
        <Animated.View style={{ flex: 1, backgroundColor: "#F5F3FF", opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={["#8B5CF6"]} />}
            >
                {/* Hero */}
                <LinearGradient colors={["#7C3AED", "#EC4899", "#F97316"]} style={styles.hero}>
                    

                    <View style={styles.heartIcon}>
                        <Heart color="#fff" size={64} fill="#fff" />
                    </View>
                    <Text style={styles.heroTitle}>Liked Songs</Text>
                    <Text style={styles.heroSub}>{likedSongs.length} songs</Text>

                    <View style={styles.heroActions}>
                        <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlay}>
                            <Shuffle color="#7C3AED" size={18} />
                            <Text style={styles.shuffleBtnText}>Shuffle Play</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.playAllBtn}
                            onPress={isCurrentLiked && isPlaying ? togglePlayPause : handlePlayAll}
                        >
                            {isCurrentLiked && isPlaying ? (
                                <Pause color="#fff" size={20} fill="#fff" />
                            ) : (
                                <Play color="#fff" size={20} fill="#fff" />
                            )}
                            <Text style={styles.playAllBtnText}>
                                {isCurrentLiked && isPlaying ? "Pause" : "Play All"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Track list */}
                <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                    {likedSongs.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Music color="#D8B4FE" size={40} />
                            <Text style={styles.emptyText}>No liked songs found.</Text>
                            <Text style={styles.emptySubText}>You haven't liked any songs yet. Start exploring and like your favorite tracks!</Text>
                        </View>
                    ) : (
                        likedSongs.map((song: any, index: number) => {
                            const isActive = currentSong?.id === song.id;
                            return (
                                <TouchableOpacity
                                    key={song.id}
                                    style={[styles.trackRow, isActive && styles.trackRowActive]}
                                    onPress={() => handlePlayTrack(index)}
                                    onLongPress={() => setSelectedSong(song)}
                                    delayLongPress={350}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.trackIndex}>
                                        {isActive ? (
                                            <View style={styles.nowPlayingDot} />
                                        ) : (
                                            <Text style={styles.trackIndexText}>{index + 1}</Text>
                                        )}
                                    </View>
                                    <Image
                                        source={{ uri: song.cover_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=7C3AED&color=fff` }}
                                        style={styles.trackCover}
                                    />
                                    <View style={styles.trackInfo}>
                                        <Text style={[styles.trackTitle, isActive && { color: "#7C3AED" }]} numberOfLines={1}>
                                            {song.title}
                                        </Text>
                                        <Text style={styles.trackArtist} numberOfLines={1}>{song.artist}</Text>
                                    </View>
                                    <Text style={styles.trackDuration}>
                                        {formatDuration(song.duration_seconds)}
                                    </Text>
                                    <Heart size={16} color="#EF4444" fill="#EF4444" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            );
                        })
                    )}
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
    hero: {
        alignItems: "center",
        paddingTop: 50,
        paddingBottom: 28,
        paddingHorizontal: 24,
    },
    heroTopRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        width: "100%",
        marginBottom: 20,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center",
    },
    heartIcon: { marginBottom: 16 },
    heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 4 },
    heroSub: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 20 },
    heroActions: { flexDirection: "row", gap: 12 },
    shuffleBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 20, paddingVertical: 12,
        backgroundColor: "#fff", borderRadius: 50,
    },
    shuffleBtnText: { fontWeight: "700", color: "#7C3AED", fontSize: 14 },
    playAllBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 24, paddingVertical: 12,
        backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 50,
    },
    playAllBtnText: { fontWeight: "700", color: "#fff", fontSize: 14 },
    emptyCard: {
        backgroundColor: "#fff", borderRadius: 24, padding: 32,
        alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6",
    },
    emptyText: { color: "#6B7280", marginTop: 12, fontWeight: "600", fontSize: 15 },
    emptySubText: { color: "#9CA3AF", marginTop: 4, fontSize: 12, textAlign: "center" },
    trackRow: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 10, paddingHorizontal: 8,
        marginBottom: 4, borderRadius: 14,
    },
    trackRowActive: { backgroundColor: "rgba(124, 58, 237, 0.08)" },
    trackIndex: { width: 28, alignItems: "center", justifyContent: "center" },
    trackIndexText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
    nowPlayingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#7C3AED" },
    trackCover: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#E9D5FF", marginRight: 12 },
    trackInfo: { flex: 1, justifyContent: "center" },
    trackTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 2 },
    trackArtist: { fontSize: 12, color: "#6B7280" },
    trackDuration: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginRight: 4, minWidth: 40, textAlign: "right" },
});
