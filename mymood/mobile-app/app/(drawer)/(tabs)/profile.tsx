import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import React, { useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAudio } from "../../../context/AudioContext";
import MiniPlayer from "../../../components/MiniPlayer";
import { Linking } from "react-native"; // 🔥 ADD

export default function Profile() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const { playSong } = useAudio();

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        setLoading(true);

        const { data: userData } = await supabase.auth.getUser();

        if (!userData?.user) {
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from("users")
            .select(`
                *,
                song:songs!fk_current_playing_song (
                    id,
                    title,
                    artist,
                    cover_image_url,
                    audio_file_url 
                )
            `)
            .eq("id", userData.user.id)
            .single();

        setProfile(data);
        setLoading(false);
    };

    if (loading || !profile) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F5F3FF]">

            <ScrollView className="flex-1 bg-[#F5F3FF] px-5 pt-12">

                {/* 🔥 PROFILE CENTER */}
                <View className="items-center">

                    {/* รูปโปรไฟล์ */}
                    <Image
                        source={{
                            uri: profile.profile_image_url || "https://placehold.co/100",
                        }}
                        className="w-28 h-28 rounded-full mb-3"
                    />

                    {/* username */}
                    <Text className="text-xl font-bold">
                        {profile.username || "No Name"}
                    </Text>

                    {/* handle */}
                    {profile.handle && (
                        <Text className="text-gray-400 mb-3">
                            @{profile.handle}
                        </Text>
                    )}

                    {/* bio */}
                    {profile.bio && (
                        <Text className="text-center text-gray-700 mb-2">
                            {profile.bio}
                        </Text>
                    )}

                    {profile.link && (
                        <TouchableOpacity
                            onPress={async () => {
                                let url = profile.link;

                                // 🔥 FIX: ถ้า user ไม่ใส่ https ให้เติมให้
                                if (!url.startsWith("http")) {
                                    url = "https://" + url;
                                }

                                const supported = await Linking.canOpenURL(url);

                                if (supported) {
                                    await Linking.openURL(url);
                                } else {
                                    console.log("Can't open URL:", url);
                                }
                            }}
                        >
                            <Text className="text-blue-500 mb-4 underline">
                                {profile.link}
                            </Text>
                        </TouchableOpacity>
                    )}

                </View>

                {/* 🔥 EDIT BUTTON */}
                <TouchableOpacity
                    onPress={() => router.push("/(drawer)/settings/edit-profile")}
                    className=" bg-white border border-gray-300 py-2 rounded-lg items-center mb-4 "
                >
                    <Text className="font-semibold text-purple-700">
                        Edit Profile
                    </Text>
                </TouchableOpacity>

                {/* 🔥 เพลง (IG + Spotify vibe) */}
                {profile.song && (
                    <TouchableOpacity
                        onPress={() => {
                            playSong(profile.song, [profile.song]);
                        }}
                        className=" bg-white border border-gray-200 rounded-xl p-3 flex-row items-center mb-6">

                        <Image
                            source={{
                                uri: profile.song.cover_image_url || "https://placehold.co/100",
                            }}
                            className="w-14 h-14 rounded-lg mr-3"
                        />

                        <View className="flex-1">
                            <Text className="font-semibold">
                                {profile.song.title}
                            </Text>
                            <Text className="text-gray-400 text-sm">
                                {profile.song.artist}
                            </Text>
                        </View>

                        <Text className="text-gray-400">♪</Text>
                    </TouchableOpacity>
                )}
                <Text className="text-2xl font-bold mb-4">Playlist</Text>

                <Text className="text-2xl font-bold mb-4">Upload</Text>
                
                <View className="h-24" />
            </ScrollView>
            <MiniPlayer />
        </View>
    );
}