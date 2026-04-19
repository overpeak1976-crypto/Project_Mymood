import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Dimensions,
    Animated,
    Linking,
    ImageBackground,
} from "react-native";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { httpClient } from "@/services/httpClient";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAudio } from "@/context/AudioContext";
import { useToast } from "@/context/ToastContext";
import MiniPlayer from "@/components/MiniPlayer";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
    Play,
    Pause,
    UserPlus,
    UserCheck,
    Clock,
    ChevronLeft,
    Music2,
    Music,
    Link2,
    Users,
    Upload,
    ListMusic,
    Disc3,
    Headphones,
} from "lucide-react-native";

const { width: SCREEN_W } = Dimensions.get("window");
const BANNER_H = 260;
const AVATAR_SIZE = 110;

export default function PublicProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { playSong, currentSong, isPlaying, togglePlayPause } = useAudio();

    const [profile, setProfile] = useState<any>(null);
    const [uploadedSongs, setUploadedSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingFriend, setAddingFriend] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const avatarScale = useRef(new Animated.Value(0.7)).current;
    const cardSlide1 = useRef(new Animated.Value(60)).current;
    const cardSlide2 = useRef(new Animated.Value(60)).current;
    const cardSlide3 = useRef(new Animated.Value(60)).current;
    const cardFade1 = useRef(new Animated.Value(0)).current;
    const cardFade2 = useRef(new Animated.Value(0)).current;
    const cardFade3 = useRef(new Animated.Value(0)).current;

    const runEntrance = () => {
        fadeAnim.setValue(0);
        slideAnim.setValue(40);
        avatarScale.setValue(0.7);
        cardSlide1.setValue(60); cardSlide2.setValue(60); cardSlide3.setValue(60);
        cardFade1.setValue(0); cardFade2.setValue(0); cardFade3.setValue(0);

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            Animated.spring(avatarScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();

        // Staggered cards
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(cardFade1, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(cardSlide1, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            ]).start();
        }, 200);
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(cardFade2, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(cardSlide2, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            ]).start();
        }, 350);
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(cardFade3, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(cardSlide3, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            ]).start();
        }, 500);
    };

    useFocusEffect(
        useCallback(() => {
            if (id) fetchProfile();
        }, [id])
    );

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const data = await httpClient.get<any>(`/api/users/public-profile/${id}`);
            setProfile(data);

            if (data?.show_uploads) {
                const { data: userSongs } = await supabase
                    .from("songs")
                    .select("id, title, artist, cover_image_url, audio_file_url, duration_seconds")
                    .eq("uploaded_by", id)
                    .order("created_at", { ascending: false });
                setUploadedSongs(userSongs || []);
            } else {
                setUploadedSongs([]);
            }
        } catch (error) {
            console.error("Error fetching public profile:", error);
        }
        setLoading(false);
        runEntrance();
    };

    const handleFriendAction = async () => {
        if (!profile || addingFriend) return;
        setAddingFriend(true);
        try {
            if (profile.friendship_status === 'none') {
                await httpClient.post('/api/users/add-friend', { targetUserId: id });
                setProfile((p: any) => ({ ...p, friendship_status: 'pending_sent' }));
                showToast('Friend request sent!', 'success');
            } else if (profile.friendship_status === 'pending_received') {
                await httpClient.put('/api/users/accept-friend', { senderId: id });
                setProfile((p: any) => ({ ...p, friendship_status: 'friends', friend_count: (p.friend_count || 0) + 1 }));
                showToast('You are now friends!', 'success');
            }
        } catch (error: any) {
            showToast(error.message || 'An error occurred', 'error');
        }
        setAddingFriend(false);
    };

    const handlePlaySong = (song: any, playlist: any[]) => {
        if (currentSong?.id === song.id) {
            togglePlayPause();
        } else {
            playSong(song, playlist);
        }
    };

    const formatDuration = (sec?: number) => {
        if (!sec) return '';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getFriendButtonConfig = () => {
        switch (profile?.friendship_status) {
            case 'friends':
                return { label: 'Friends', icon: <UserCheck size={18} color="#fff" />, colors: ['#7C3AED', '#9333EA'] as [string, string], disabled: true };
            case 'pending_sent':
                return { label: 'Pending', icon: <Clock size={18} color="#7C3AED" />, colors: ['#F3F4F6', '#F3F4F6'] as [string, string], disabled: true };
            case 'pending_received':
                return { label: 'Accept Friend', icon: <UserPlus size={18} color="#fff" />, colors: ['#10B981', '#059669'] as [string, string], disabled: false };
            default:
                return { label: 'Add Friend', icon: <UserPlus size={18} color="#fff" />, colors: ['#7C3AED', '#6D28D9'] as [string, string], disabled: false };
        }
    };

    if (loading) {
        return (
            <View style={s.loadingScreen}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={s.loadingScreen}>
                <Text style={{ color: '#6B7280', fontSize: 16 }}>Profile not found</Text>
            </View>
        );
    }

    const friendBtn = getFriendButtonConfig();
    const isPlayingProfileSong = profile.song && currentSong?.id === profile.song.id && isPlaying;

    return (
        <View style={s.container}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={true}>
                {/* ════════ BANNER ════════ */}
                <ImageBackground
                    source={{
                        uri: profile.banner_image_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=7C3AED&color=fff&size=600`,
                    }}
                    style={s.banner}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(245,243,255,0.6)', '#F5F3FF']}
                        locations={[0, 0.65, 1]}
                        style={StyleSheet.absoluteFillObject}
                    />
                    
                </ImageBackground>

                {/* ════════ PROFILE CARD ════════ */}
                <Animated.View style={[s.profileSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Avatar */}
                    <Animated.View style={[s.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
                        <Image
                            source={{
                                uri: profile.profile_image_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=7C3AED&color=fff&size=200`,
                            }}
                            style={s.avatar}
                        />
                        {profile.friendship_status === 'friends' && (
                            <View style={s.friendBadge}>
                                <UserCheck size={12} color="#fff" />
                            </View>
                        )}
                    </Animated.View>

                    {/* Name */}
                    <Text style={s.username}>{profile.username || "Unknown"}</Text>
                    {profile.handle && (
                        <Text style={s.handle}>@{profile.handle}</Text>
                    )}

                    {/* Stats Row */}
                    <View style={s.statsRow}>
                        <View style={s.statItem}>
                            <Users size={16} color="#7C3AED" />
                            <Text style={s.statNumber}>{profile.friend_count ?? 0}</Text>
                            <Text style={s.statLabel}>Friends</Text>
                        </View>
                        <View style={s.statDivider} />
                        <View style={s.statItem}>
                            <ListMusic size={16} color="#7C3AED" />
                            <Text style={s.statNumber}>{profile.playlists?.length ?? 0}</Text>
                            <Text style={s.statLabel}>Playlists</Text>
                        </View>
                        <View style={s.statDivider} />
                        <View style={s.statItem}>
                            <Upload size={16} color="#7C3AED" />
                            <Text style={s.statNumber}>{profile.upload_count ?? 0}</Text>
                            <Text style={s.statLabel}>Uploads</Text>
                        </View>
                    </View>

                    {/* Bio */}
                    {profile.bio ? (
                        <Text style={s.bio}>{profile.bio}</Text>
                    ) : null}

                    {/* Link */}
                    {profile.link ? (
                        <TouchableOpacity
                            style={s.linkRow}
                            onPress={async () => {
                                let url = profile.link;
                                if (!url.startsWith("http")) url = "https://" + url;
                                const supported = await Linking.canOpenURL(url);
                                if (supported) await Linking.openURL(url);
                            }}
                        >
                            <Link2 size={14} color="#7C3AED" />
                            <Text style={s.linkText} numberOfLines={1}>{profile.link}</Text>
                        </TouchableOpacity>
                    ) : null}

                    {/* Friend Button */}
                    {profile.friendship_status !== 'self' && (
                        <TouchableOpacity
                            onPress={handleFriendAction}
                            disabled={friendBtn.disabled || addingFriend}
                            activeOpacity={0.8}
                            style={{ width: '100%', marginTop: 16 }}
                        >
                            <LinearGradient
                                colors={friendBtn.colors}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={[s.friendBtn, friendBtn.disabled && profile.friendship_status === 'pending_sent' && s.friendBtnOutline]}
                            >
                                {addingFriend ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        {friendBtn.icon}
                                        <Text style={[
                                            s.friendBtnText,
                                            profile.friendship_status === 'pending_sent' && { color: '#7C3AED' },
                                        ]}>
                                            {friendBtn.label}
                                        </Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                <View style={s.contentArea}>
                    {/* ════════ CURRENTLY PLAYING ════════ */}
                    {profile.song && (
                        <Animated.View style={{ opacity: cardFade1, transform: [{ translateY: cardSlide1 }] }}>
                            
                            <TouchableOpacity
                                onPress={() => handlePlaySong(profile.song, [profile.song])}
                                activeOpacity={0.85}
                                style={s.nowPlayingCard}
                            >
                                <LinearGradient
                                    colors={['#7C3AED', '#9333EA', '#A855F7']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={s.nowPlayingGradient}
                                >
                                    <Image
                                        source={{ uri: profile.song.cover_image_url || 'https://placehold.co/120' }}
                                        style={s.nowPlayingCover}
                                    />
                                    <View style={s.nowPlayingInfo}>
                                        <Text style={s.nowPlayingLabel}>
                                            {isPlayingProfileSong ? '▶ กำลังเล่น' : '♫ กำลังฟังอยู่'}
                                        </Text>
                                        <Text style={s.nowPlayingTitle} numberOfLines={1}>
                                            {profile.song.title}
                                        </Text>
                                        <Text style={s.nowPlayingArtist} numberOfLines={1}>
                                            {profile.song.artist}
                                        </Text>
                                    </View>
                                    <View style={s.nowPlayingBtn}>
                                        {isPlayingProfileSong ? (
                                            <Pause size={22} color="#7C3AED" fill="#7C3AED" />
                                        ) : (
                                            <Play size={22} color="#7C3AED" fill="#7C3AED" />
                                        )}
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* ════════ PLAYLISTS ════════ */}
                    {profile.playlists && profile.playlists.length > 0 && (
                        <Animated.View style={{ opacity: cardFade2, transform: [{ translateY: cardSlide2 }] }}>
                            <View style={s.sectionHeader}>
                                <Disc3 size={20} color="#7C3AED" />
                                <Text style={s.sectionTitle}>Public Playlists</Text>
                                <Text style={s.sectionCount}>{profile.playlists.length}</Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 24 }}
                                style={{ marginHorizontal: -24, paddingLeft: 24 }}
                            >
                                {profile.playlists.map((pl: any, idx: number) => (
                                    <TouchableOpacity
                                        key={pl.id}
                                        style={s.playlistCard}
                                        activeOpacity={0.85}
                                        onPress={() => router.push({ pathname: "/(drawer)/(main)/playlist/[id]", params: { id: pl.id } })}
                                    >
                                        {pl.cover_image_url ? (
                                            <Image
                                                source={{ uri: pl.cover_image_url }}
                                                style={s.playlistCover}
                                            />
                                        ) : (
                                            <View style={[s.playlistCover, { overflow: 'hidden' }]}> 
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
                                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
                                                        <Music color="#fff" size={26} />
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                        <Text style={s.playlistName} numberOfLines={2}>{pl.name}</Text>
                                        <Text style={s.playlistCount}>{pl.track_count} Songs</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* ════════ UPLOADED SONGS ════════ */}
                    {profile.show_uploads && (
                        <Animated.View style={{ opacity: cardFade3, transform: [{ translateY: cardSlide3 }] }}>
                            <View style={s.sectionHeader}>
                                <Music2 size={20} color="#7C3AED" />
                                <Text style={s.sectionTitle}>Uploaded Songs</Text>
                                <Text style={s.sectionCount}>{uploadedSongs.length}</Text>
                            </View>
                            {uploadedSongs.length === 0 ? (
                                <View style={s.emptyCard}>
                                    <Music2 size={32} color="#E9D5FF" />
                                    <Text style={s.emptyText}>No uploaded songs</Text>
                                </View>
                            ) : (
                                <View style={s.songsContainer}>
                                    {uploadedSongs.map((song, idx) => {
                                        const isActive = currentSong?.id === song.id;
                                        return (
                                            <TouchableOpacity
                                                key={song.id}
                                                onPress={() => handlePlaySong(song, uploadedSongs)}
                                                activeOpacity={0.8}
                                                style={[s.songRow, isActive && s.songRowActive, idx === uploadedSongs.length - 1 && { borderBottomWidth: 0 }]}
                                            >
                                                <View style={s.songCoverWrap}>
                                                    <Image
                                                        source={{ uri: song.cover_image_url || 'https://placehold.co/80' }}
                                                        style={s.songCover}
                                                    />
                                                    <View style={[s.songPlayOverlay, isActive && { backgroundColor: 'rgba(124,58,237,0.7)' }]}>
                                                        {isActive && isPlaying ? (
                                                            <Pause size={16} color="#fff" fill="#fff" />
                                                        ) : (
                                                            <Play size={16} color="#fff" fill="#fff" />
                                                        )}
                                                    </View>
                                                </View>
                                                <View style={s.songInfo}>
                                                    <Text style={[s.songTitle, isActive && { color: '#7C3AED' }]} numberOfLines={1}>
                                                        {song.title}
                                                    </Text>
                                                    <Text style={s.songArtist} numberOfLines={1}>{song.artist}</Text>
                                                </View>
                                                <Text style={s.songDuration}>{formatDuration(song.duration_seconds)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </Animated.View>
                    )}

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            <MiniPlayer />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F3FF' },
    loadingScreen: { flex: 1, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },

    // ── Banner ──
    banner: { width: SCREEN_W, height: BANNER_H },
    backBtn: { position: 'absolute', top: 48, left: 16, zIndex: 10 },
    backBtnBlur: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

    // ── Profile Section ──
    profileSection: {
        marginTop: -AVATAR_SIZE / 2 - 8,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    avatarContainer: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
        marginBottom: 12,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 4,
        borderColor: '#fff',
        backgroundColor: '#E9D5FF',
    },
    friendBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        borderWidth: 3,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    username: {
        fontSize: 26,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
    },
    handle: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 2,
    },

    // ── Stats ──
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        marginTop: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        width: '100%',
    },
    statItem: { alignItems: 'center', flex: 1, gap: 4 },
    statNumber: { fontSize: 18, fontWeight: '800', color: '#111827' },
    statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
    statDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6' },

    // ── Bio / Link ──
    bio: {
        marginTop: 16,
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F3E8FF',
        borderRadius: 20,
    },
    linkText: { fontSize: 13, color: '#7C3AED', fontWeight: '600', maxWidth: 220 },

    // ── Friend Button ──
    friendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    friendBtnOutline: {
        borderWidth: 2,
        borderColor: '#DDD6FE',
    },
    friendBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },

    // ── Content Area ──
    contentArea: { paddingHorizontal: 24, paddingTop: 24 },

    // ── Section Headers ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
    sectionCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7C3AED',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },

    // ── Now Playing Card ──
    nowPlayingCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
    nowPlayingGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    nowPlayingCover: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    nowPlayingInfo: { flex: 1, marginLeft: 14 },
    nowPlayingLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    nowPlayingTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    nowPlayingArtist: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 2 },
    nowPlayingBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },

    // ── Playlists ──
    playlistCard: {
        width: 140,
        marginRight: 14,
    },
    playlistCover: {
        width: 140,
        height: 140,
        borderRadius: 20,
        backgroundColor: '#E9D5FF',
        marginBottom: 8,
    },
    playlistName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    playlistCount: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 2,
    },

    // ── Songs ──
    songsContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 24,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    songRowActive: {
        backgroundColor: '#FAF5FF',
    },
    songCoverWrap: { position: 'relative' },
    songCover: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E9D5FF' },
    songPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    songInfo: { flex: 1, marginLeft: 14 },
    songTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
    songArtist: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
    songDuration: { fontSize: 12, color: '#D1D5DB', fontWeight: '600' },

    // ── Empty ──
    emptyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 24,
    },
    emptyText: { color: '#9CA3AF', fontWeight: '600', marginTop: 12, fontSize: 14 },
});