import "../../global.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    Image, ActivityIndicator, StyleSheet, Keyboard,
} from "react-native";
import { Search, X, Sparkles, Music } from "lucide-react-native";
import MiniPlayer from "../../../components/MiniPlayer";
import SongContextMenu, { SongMenuItem } from "../../../components/SongContextMenu";
import { supabase } from "../../../lib/supabase";
import { useAudio } from "../../../context/AudioContext";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEBOUNCE_MS = 500;

type SearchResult = SongMenuItem & {
    match_type: "standard" | "ai_vibe";
    similarity?: number;
    genre?: string;
};

export default function AISearchScreen() {
    const { playSong } = useAudio();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    // ── Long-press context menu ─────────────────────────────────────────────
    const [selectedSong, setSelectedSong] = useState<SongMenuItem | null>(null);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Fetch liked ids on mount for heart state ────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                const res = await fetch(`${BACKEND_URL}/api/likes/my-likes`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    const ids: string[] = (data.liked_songs || []).map((s: any) => s.id);
                    setLikedIds(new Set(ids));
                }
            } catch { /* best effort */ }
        })();
    }, []);

    // ── Debounced search ────────────────────────────────────────────────────
    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setHasSearched(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        setHasSearched(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("Not authenticated");

            const res = await fetch(
                `${BACKEND_URL}/api/search?q=${encodeURIComponent(q)}`,
                { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
            const data = await res.json();
            setResults(data.results || []);
        } catch (err) {
            console.error("Search error:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleQueryChange = (text: string) => {
        setQuery(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!text.trim()) {
            setResults([]);
            setHasSearched(false);
            setLoading(false);
            return;
        }
        setLoading(true); // show spinner immediately while debouncing
        debounceTimer.current = setTimeout(() => doSearch(text), DEBOUNCE_MS);
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setHasSearched(false);
        setLoading(false);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };

    // ── Like toggle callback ────────────────────────────────────────────────
    const handleLikeToggled = (songId: string, isNowLiked: boolean) => {
        setLikedIds((prev) => {
            const next = new Set(prev);
            isNowLiked ? next.add(songId) : next.delete(songId);
            return next;
        });
    };

    // ── Render each result row ──────────────────────────────────────────────
    const renderItem = ({ item }: { item: SearchResult }) => {
        const isAI = item.match_type === "ai_vibe";
        const coverUri = item.cover_image_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=7C3AED&color=fff`;

        return (
            <TouchableOpacity
                style={styles.resultRow}
                onPress={() => playSong?.(item as any, results as any)}
                onLongPress={() => setSelectedSong(item)}
                delayLongPress={350}
                activeOpacity={0.7}
            >
                <Image source={{ uri: coverUri }} style={styles.resultCover} />

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.resultArtist} numberOfLines={1}>{item.artist}</Text>
                    {item.genre ? <Text style={styles.resultGenre} numberOfLines={1}>{item.genre}</Text> : null}
                </View>

                {/* Match type badge */}
                <View style={[styles.badge, isAI ? styles.badgeAI : styles.badgeStd]}>
                    {isAI
                        ? <Sparkles size={11} color="#7C3AED" />
                        : <Music size={11} color="#059669" />
                    }
                    <Text style={[styles.badgeText, { color: isAI ? "#7C3AED" : "#059669" }]}>
                        {isAI ? "AI Vibe" : "Match"}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // ── Empty / idle states ─────────────────────────────────────────────────
    const renderEmpty = () => {
        if (loading) return null;
        if (!hasSearched) {
            return (
                <View style={styles.idleContainer}>
                    <Sparkles size={64} color="#DDD6FE" />
                    <Text style={styles.idleTitle}>ค้นหาเพลง</Text>
                    <Text style={styles.idleSub}>
                        พิมพ์ชื่อเพลง, ศิลปิน, genre{"\n"}หรืออารมณ์ที่รู้สึก เช่น "เพลงเศร้ายามดึก"
                    </Text>
                </View>
            );
        }
        return (
            <View style={styles.idleContainer}>
                <Music size={56} color="#DDD6FE" />
                <Text style={styles.idleTitle}>ไม่พบเพลง</Text>
                <Text style={styles.idleSub}>ลองค้นหาด้วยคำอื่นดูครับ</Text>
            </View>
        );
    };

    // ── Main ────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: "#F5F3FF" }}>

            {/* ── Header ── */}
            <View style={styles.headerSection}>
                <Text style={styles.headerTitle}>Search</Text>
                <Text style={styles.headerSub}>เพลง ศิลปิน หรือ AI Vibe</Text>

                {/* Search bar */}
                <View style={styles.searchBar}>
                    {loading
                        ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginLeft: 14 }} />
                        : <Search size={18} color="#9CA3AF" style={{ marginLeft: 14 }} />
                    }
                    <TextInput
                        value={query}
                        onChangeText={handleQueryChange}
                        placeholder="ค้นหาเพลง, ศิลปิน, หรืออารมณ์..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.searchInput}
                        returnKeyType="search"
                        onSubmitEditing={() => { if (debounceTimer.current) clearTimeout(debounceTimer.current); doSearch(query); }}
                        clearButtonMode="never"
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={handleClear} style={{ paddingRight: 14 }}>
                            <View style={styles.clearBtn}>
                                <X size={12} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Legend ── */}
            {results.length > 0 && (
                <View style={styles.legend}>
                    <View style={[styles.badge, styles.badgeStd]}><Music size={11} color="#059669" /><Text style={[styles.badgeText, { color: "#059669" }]}>Match = ตรงชื่อ</Text></View>
                    <View style={[styles.badge, styles.badgeAI]}><Sparkles size={11} color="#7C3AED" /><Text style={[styles.badgeText, { color: "#7C3AED" }]}>AI Vibe = ใกล้เคียงอารมณ์</Text></View>
                </View>
            )}

            {/* ── Results ── */}
            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />}
            />

            <MiniPlayer />

            {/* Context menu */}
            <SongContextMenu
                visible={!!selectedSong}
                song={selectedSong}
                onClose={() => setSelectedSong(null)}
                likedIds={likedIds}
                onLikeToggled={handleLikeToggled}
            />
        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Header
    headerSection: {
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#7C3AED",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    headerTitle: { fontSize: 30, fontWeight: "800", color: "#4C1D95" },
    headerSub: { fontSize: 14, color: "#9CA3AF", marginTop: 4, marginBottom: 16 },

    // Search bar
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F3FF",
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "#DDD6FE",
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#1F2937",
        paddingVertical: 13,
        paddingHorizontal: 10,
    },
    clearBtn: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: "#9CA3AF",
        justifyContent: "center", alignItems: "center",
    },

    // Legend
    legend: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
    },

    // Result row
    resultRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        borderRadius: 24,
        marginBottom: 12,
    },
    resultCover: {
        width: 52, height: 52, borderRadius: 10,
        backgroundColor: "#EDE9FE",
    },
    resultTitle: { fontWeight: "700", fontSize: 14, color: "#111827" },
    resultArtist: { color: "#6B7280", fontSize: 12, marginTop: 2 },
    resultGenre: { color: "#A78BFA", fontSize: 11, marginTop: 2 },

    // Badge
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 20,
    },
    badgeStd: { backgroundColor: "#D1FAE5" },
    badgeAI: { backgroundColor: "#EDE9FE" },
    badgeText: { fontSize: 11, fontWeight: "600" },

    // Idle / empty state
    idleContainer: {
        flex: 1, justifyContent: "center", alignItems: "center",
        paddingTop: 80, gap: 12,
    },
    idleTitle: { fontSize: 20, fontWeight: "700", color: "#6B7280" },
    idleSub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 22 },
});