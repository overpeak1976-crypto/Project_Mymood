import { View, Text, Image, TouchableOpacity, ScrollView, Linking, StyleSheet } from "react-native";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import React, { useState, useCallback } from "react";
import { httpClient } from "@/services/httpClient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAudio } from "@/context/AudioContext";
import MiniPlayer from "@/components/MiniPlayer";
import ProfileMenuSheet from "@/components/ProfileMenuSheet";
import { MoreVertical, Play, Music } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Playlist {
  id: string;
  name: string;
  cover_image_url?: string;
  track_count?: number;
}

interface UploadedSong {
  id: string;
  title: string;
  artist: string;
  cover_image_url?: string;
  audio_file_url?: string;
}

export default function Profile() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [uploadedSongs, setUploadedSongs] = useState<UploadedSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    const { playSong } = useAudio();

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        setLoading(true);
        try {
            // Fetch independently so one failure doesn't block all data
            const [profileResult, playlistsResult, uploadsResult] = await Promise.allSettled([
                httpClient.get<any>('/api/users/profile'),
                httpClient.get<{ playlists: Playlist[] }>('/api/playlists'),
                httpClient.get<UploadedSong[]>('/api/songs/my-uploads'),
            ]);

            if (profileResult.status === 'fulfilled' && profileResult.value) {
                setProfile(profileResult.value);
            } else if (profileResult.status === 'rejected') {
                console.error("[Profile] /api/users/profile failed:", profileResult.reason);
            }

            if (playlistsResult.status === 'fulfilled' && playlistsResult.value?.playlists) {
                setPlaylists(playlistsResult.value.playlists);
            } else if (playlistsResult.status === 'rejected') {
                console.error("[Profile] /api/playlists failed:", playlistsResult.reason);
            }

            if (uploadsResult.status === 'fulfilled' && Array.isArray(uploadsResult.value)) {
                setUploadedSongs(uploadsResult.value);
            } else if (uploadsResult.status === 'rejected') {
                console.error("[Profile] /api/songs/my-uploads failed:", uploadsResult.reason);
            }
        } catch (error) {
            console.error("[Profile] Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !profile) {
        return (
            <View className="flex-1 bg-white">
                <SkeletonLoader width="100%" height={160} borderRadius={0} />
                <View className="px-5">
                    <View className="flex-row items-end -mt-10 mb-4">
                        <SkeletonLoader width={112} height={112} borderRadius={56} />
                        <View className="ml-4 pb-2 flex-1">
                            <SkeletonLoader width="70%" height={28} className="mb-2" />
                            <SkeletonLoader width="40%" height={14} />
                        </View>
                    </View>
                    <SkeletonLoader width="90%" height={14} className="mb-2" />
                    <SkeletonLoader width="60%" height={14} className="mb-6" />
                    <View className="flex-row justify-around mb-6">
                        <SkeletonLoader width={60} height={40} borderRadius={12} />
                        <SkeletonLoader width={60} height={40} borderRadius={12} />
                        <SkeletonLoader width={60} height={40} borderRadius={12} />
                    </View>
                    <SkeletonLoader width="100%" height={80} borderRadius={16} className="mb-4" />
                    <SkeletonLoader width="50%" height={20} className="mb-3" />
                    <View className="flex-row" style={{ gap: 12 }}>
                        <SkeletonLoader width={140} height={140} borderRadius={16} />
                        <SkeletonLoader width={140} height={140} borderRadius={16} />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                
                {/* BANNER IMAGE */}
                <Image
                    source={{ uri: profile.banner_image_url || "https://placehold.co/600x200/e2e8f0/a1a1aa?text=Banner+Image" }}
                    className="w-full h-40"
                    resizeMode="cover"
                />

                <View className="px-5">
                    {/* PROFILE HEADER */}
                    <View className="flex-row items-end justify-between -mt-10 mb-4">
                        <View className="flex-row items-end flex-1">
                            {/* Profile image with white border */}
                            <Image
                                source={{
                                    uri: profile.profile_image_url || "https://placehold.co/150",
                                }}
                                className="w-28 h-28 rounded-full border-4 border-white bg-white"
                            />
                            
                            <View className="ml-4 pb-2 flex-1">
                                <Text className="text-3xl font-extrabold text-[#111827]" numberOfLines={1}>
                                    {profile.username || "No Name"}
                                </Text>
                                {profile.handle && (
                                    <Text className="text-gray-500 text-sm mt-0.5">
                                        @{profile.handle}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Three-dot button — Open ProfileMenuSheet */}
                        <TouchableOpacity
                            className="pb-4 pl-2"
                            onPress={() => setMenuVisible(true)}
                        >
                            <MoreVertical size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    {/* BIO & LINK */}
                    {profile.bio && (
                        <Text className="text-gray-700 text-base mb-2 leading-5">
                            {profile.bio}
                        </Text>
                    )}

                    {profile.link && (
                        <TouchableOpacity
                            className="mb-6"
                            onPress={async () => {
                                let url = profile.link;
                                if (!url.startsWith("http")) url = "https://" + url;
                                const supported = await Linking.canOpenURL(url);
                                if (supported) await Linking.openURL(url);
                            }}
                        >
                            <Text className="text-blue-500 font-medium">{profile.link}</Text>
                        </TouchableOpacity>
                    )}

                    {/* CURRENT PLAYING SONG */}
                    {profile.song && (
                        <TouchableOpacity
                            onPress={() => {
                                playSong(profile.song, [profile.song]);
                            }}
                            className="flex-row items-center mb-8 mt-2"
                        >
                            <Image
                                source={{
                                    uri: profile.song.cover_image_url || "https://placehold.co/100",
                                }}
                                className="w-14 h-14 rounded-xl border border-gray-200"
                            />
                            <View className="ml-4 flex-1 justify-center">
                                <Text className="font-bold text-sm text-[#111827]" numberOfLines={1}>
                                    {profile.song.title}
                                </Text>
                                <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                                    {profile.song.artist}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* PLAYLIST SECTION */}
                    <Text className="text-2xl font-extrabold text-[#111827] mb-4">Playlist</Text>
                    
                    {playlists.length === 0 ? (
                        <View className="mb-8">
                            <Text className="text-gray-400 text-center py-6">No playlists yet</Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
                            {playlists.map((playlist, idx) => (
                                <TouchableOpacity
                                    key={playlist.id}
                                    className="mr-4 w-28 items-center"
                                    onPress={() => router.push({ pathname: "/(drawer)/(main)/playlist/[id]", params: { id: playlist.id } })}
                                >
                                    {playlist.cover_image_url ? (
                                        <Image 
                                            source={{ uri: playlist.cover_image_url }} 
                                            className="w-28 h-28 rounded-2xl mb-2 bg-gray-200" 
                                        />
                                    ) : (
                                        <View className="w-28 h-28 rounded-2xl mb-2 overflow-hidden">
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
                                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
                                                    <Music color="#fff" size={24} />
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    <Text className="font-semibold text-xs text-[#111827] text-center" numberOfLines={2}>
                                        {playlist.name}
                                    </Text>
                                    {playlist.track_count !== undefined && (
                                        <Text className="text-gray-400 text-xs mt-1">
                                            {playlist.track_count} tracks
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* UPLOAD SECTION */}
                    <Text className="text-2xl font-extrabold text-[#111827] mb-4">Upload</Text>
                    
                    {uploadedSongs.length === 0 ? (
                        <View className="mb-8">
                            <Text className="text-gray-400 text-center py-6">No uploaded songs yet</Text>
                        </View>
                    ) : (
                        <View className="mb-8">
                            {uploadedSongs.map((song) => (
                                <TouchableOpacity 
                                    key={song.id}
                                    onPress={() => playSong(song as any, uploadedSongs as any)}
                                    className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-2xl"
                                >
                                    {/* Play Button Overlay */}
                                    <View className="relative">
                                        <Image
                                            source={{ uri: song.cover_image_url || "https://placehold.co/60/7c3aed/ffffff?text=Song" }}
                                            className="w-12 h-12 rounded-lg bg-gray-200"
                                        />
                                        <View className="absolute inset-0 bg-black/30 rounded-lg justify-center items-center">
                                            <Play size={16} color="white" fill="white" />
                                        </View>
                                    </View>

                                    {/* Song Info */}
                                    <View className="ml-3 flex-1">
                                        <Text className="font-semibold text-sm text-[#111827]" numberOfLines={1}>
                                            {song.title}
                                        </Text>
                                        <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                                            {song.artist}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    
                    {/* Bottom padding to avoid MiniPlayer overlap */}
                    <View className="h-32" />
                </View>
            </ScrollView>
            
            <MiniPlayer />

            {/* Profile Context Menu Sheet */}
            <ProfileMenuSheet
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                profile={profile}
            />
        </View>
    );
}