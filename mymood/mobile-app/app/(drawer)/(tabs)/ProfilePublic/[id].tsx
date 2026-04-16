import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import React, { useState, useCallback } from "react";
import { supabase } from "../../../../lib/supabase";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAudio } from "../../../../context/AudioContext";
import MiniPlayer from "../../../../components/MiniPlayer";
import { Linking } from "react-native";

export default function PublicProfile() {
    const { id } = useLocalSearchParams();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFriend, setIsFriend] = useState(false);
    const [me, setMe] = useState<any>(null);

    const { playSong } = useAudio();

    useFocusEffect(
        useCallback(() => {
            if (id) fetchProfile();
        }, [id])
    );

    const fetchProfile = async () => {
        setLoading(true);

        // 🔥 user ตัวเอง
        const { data: userData } = await supabase.auth.getUser();
        const myUser = userData?.user;
        setMe(myUser);

        if (!id) return;

        // 🔥 โปรไฟล์คนอื่น
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
            .eq("id", id)
            .single();

        setProfile(data);

        // 🔥 เช็คว่าเป็นเพื่อนมั้ย
        if (myUser) {
            const { data: friend } = await supabase
                .from("friendships")
                .select("*")
                .or(
                    `and(user_id.eq.${myUser.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${myUser.id})`
                )
                .eq("status", "accepted")
                .maybeSingle();

            setIsFriend(!!friend);
        }

        setLoading(false);
    };

    // 🔥 ADD FRIEND
    const handleAddFriend = async () => {
        if (!me) return;

        await supabase.from("friendships").insert({
            user_id: me.id,
            friend_id: id,
            status: "pending",
        });

        alert("ส่งคำขอแล้ว");
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
                    <Image
                        source={{
                            uri: profile.profile_image_url || "https://placehold.co/100",
                        }}
                        className="w-28 h-28 rounded-full mb-3"
                    />

                    <Text className="text-xl font-bold">
                        {profile.username || "No Name"}
                    </Text>

                    {profile.handle && (
                        <Text className="text-gray-400 mb-3">
                            @{profile.handle}
                        </Text>
                    )}

                    {profile.bio && (
                        <Text className="text-center text-gray-700 mb-2">
                            {profile.bio}
                        </Text>
                    )}

                    {/* 🔗 LINK */}
                    {profile.link && (
                        <TouchableOpacity
                            onPress={async () => {
                                let url = profile.link;
                                if (!url.startsWith("http")) {
                                    url = "https://" + url;
                                }
                                const supported = await Linking.canOpenURL(url);
                                if (supported) {
                                    await Linking.openURL(url);
                                }
                            }}
                        >
                            <Text className="text-blue-500 mb-4 underline">
                                {profile.link}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 🔥 ADD FRIEND BUTTON */}
                <TouchableOpacity
                    onPress={handleAddFriend}
                    className="bg-white border border-gray-300 py-2 rounded-lg items-center mb-4"
                >
                    <Text className="font-semibold text-purple-700">
                        {isFriend ? "Friends" : "Add Friend"}
                    </Text>
                </TouchableOpacity>

                {/* 🎵 SONG */}
                {profile.song && (
                    <TouchableOpacity
                        onPress={() => playSong(profile.song, [profile.song])}
                        className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-center mb-6"
                    >
                        <Image
                            source={{
                                uri:
                                    profile.song.cover_image_url ||
                                    "https://placehold.co/100",
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

                {/* 🔥 PLAYLIST (placeholder) */}
                <Text className="text-2xl font-bold mb-4">Playlist</Text>

                {/* 🔥 UPLOAD (placeholder) */}
                <Text className="text-2xl font-bold mb-4">Upload</Text>

                <View className="h-24" />
            </ScrollView>

            <MiniPlayer />
        </View>
    );
}