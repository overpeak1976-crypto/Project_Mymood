import { View, Text, TextInput, Image, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { httpClient } from "@/services/httpClient";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";

// Shared store for song selection between screens
export const selectedSongStore: { songId: string | null; songName: string | null } = {
    songId: null,
    songName: null,
};

type SongParams = {
    songId?: string;
    songName?: string;
};

export default function EditProfile() {
    const router = useRouter();
    const { showToast } = useToast();
    const { refreshUserData } = useUser(); // Refresh user data after profile update

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [username, setUsername] = useState("");
    const [handle, setHandle] = useState("");
    const [bio, setBio] = useState("");
    const [link, setLink] = useState("");
    const [profileImageUrl, setProfileImageUrl] = useState("");
    const [bannerImageUrl, setBannerImageUrl] = useState("");

    // Local image URIs for preview before upload
    const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);
    const [localBannerImage, setLocalBannerImage] = useState<string | null>(null);

    // Song state
    const [song, setSong] = useState<string | null>(null);
    const [songIdState, setSongIdState] = useState<string | null>(null);
    const [songData, setSongData] = useState<any>(null);

    const linkRef = useRef<TextInput>(null);

    useFocusEffect(
        useCallback(() => {
            setTimeout(() => {
                Keyboard.dismiss();
                linkRef.current?.blur();
            }, 100);
        }, [])
    );

    // Fetch current user profile on mount
    useEffect(() => {
        fetchProfile();
    }, []);

    // Handle song selection from select-song screen
    useFocusEffect(
        useCallback(() => {
            if (selectedSongStore.songId && selectedSongStore.songName) {
                setSong(selectedSongStore.songName);
                setSongIdState(selectedSongStore.songId);
                selectedSongStore.songId = null;
                selectedSongStore.songName = null;
            }
        }, [])
    );

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const profileData = await httpClient.get<any>('/api/users/profile');

            if (profileData) {
                setProfile(profileData);
                setUsername(profileData.username || "");
                setHandle(profileData.handle || "");
                setBio(profileData.bio || "");
                setLink(profileData.link || "");
                setProfileImageUrl(profileData.profile_image_url || "");
                setBannerImageUrl(profileData.banner_image_url || "");
                setSongData(profileData.song || null);
                setSong(profileData.song?.title || null);
                setSongIdState(profileData.song?.id || null);
            }
        } catch (error) {
            console.error("[EditProfile] Error fetching profile:", error);
            showToast("Error loading profile", "error");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Pick an image from the device
     * @param imageType - "profile" or "banner"
     */
    const pickImage = async (imageType: "profile" | "banner") => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                showToast("Permission required to access photos", "error");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: imageType === "profile" ? [1, 1] : [16, 9],
                quality: 0.8,
            });

            if (result.canceled) return;

            const imageUri = result.assets[0].uri;

            if (imageType === "profile") {
                setLocalProfileImage(imageUri);
            } else {
                setLocalBannerImage(imageUri);
            }
        } catch (error) {
            console.error("[EditProfile] Error picking image:", error);
            showToast("Error selecting image", "error");
        }
    };

    /**
     * Upload an image to Supabase Storage
     */
    const uploadImage = async (uri: string, bucket: "picture"): Promise<string | null> => {
        try {
            const { data: userData } = await supabase.auth.getUser();

            if (!userData?.user) {
                showToast("Not authenticated", "error");
                return null;
            }

            const fileName = `${userData.user.id}-${Date.now()}.jpg`;

            // โ… เนเธเน FormData เนเธ—เธ fetch().blob()
            const formData = new FormData();
            formData.append("file", {
                uri,
                type: "image/jpeg",
                name: fileName,
            } as any);

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, formData, {
                    contentType: "multipart/form-data",
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
            return data?.publicUrl || null;

        } catch (error) {
            console.error(`[EditProfile] Error uploading to ${bucket}:`, error);
            showToast(`Failed to upload image`, "error");
            return null;
        }
    };

    /**
     * Save all profile changes
     */
    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Prepare update object
            const updateData: any = {
                username,
                handle,
                bio,
                link,
                profile_song_id: songIdState,
            };

            // Upload new profile image if selected (via Supabase Storage)
            if (localProfileImage) {
                showToast("Uploading profile image...", "info");
                const profileUrl = await uploadImage(localProfileImage, "picture");
                if (profileUrl) {
                    updateData.profile_image_url = profileUrl;
                    setProfileImageUrl(profileUrl);
                    setLocalProfileImage(null);
                } else {
                    throw new Error("Failed to upload profile image");
                }
            }

            // Upload new banner image if selected (via Supabase Storage)
            if (localBannerImage) {
                showToast("Uploading banner image...", "info");
                const bannerUrl = await uploadImage(localBannerImage, "picture");
                if (bannerUrl) {
                    updateData.banner_image_url = bannerUrl;
                    setBannerImageUrl(bannerUrl);
                    setLocalBannerImage(null);
                } else {
                    throw new Error("Failed to upload banner image");
                }
            }

            // Update profile via backend API
            await httpClient.put('/api/users/profile', updateData);

            await refreshUserData();
            showToast("Profile updated successfully!", "success");
            await fetchProfile();
            router.back();

        } catch (error) {
            console.error("[EditProfile] Error saving profile:", error);
            showToast("Error saving profile", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white" style={{ paddingTop: 20 }}>
                <View style={{ alignItems: "center", marginBottom: 24 }}>
                    <SkeletonLoader width={100} height={100} borderRadius={50} />
                </View>
                <View style={{ paddingHorizontal: 20 }}>
                    <SkeletonLoader width="30%" height={14} className="mb-2" />
                    <SkeletonLoader width="100%" height={44} borderRadius={12} className="mb-4" />
                    <SkeletonLoader width="30%" height={14} className="mb-2" />
                    <SkeletonLoader width="100%" height={44} borderRadius={12} className="mb-4" />
                    <SkeletonLoader width="20%" height={14} className="mb-2" />
                    <SkeletonLoader width="100%" height={80} borderRadius={12} className="mb-4" />
                    <SkeletonLoader width="25%" height={14} className="mb-2" />
                    <SkeletonLoader width="100%" height={44} borderRadius={12} className="mb-4" />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <View style={{ flex: 1, position: "relative", backgroundColor: "#FFFFFF" }}>



                <ScrollView
                    className="flex-1 bg-white"
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* BANNER IMAGE SECTION */}
                    <TouchableOpacity onPress={() => pickImage("banner")}>
                        <Image
                            source={{
                                uri: localBannerImage || bannerImageUrl || "https://placehold.co/600x200/e2e8f0/a1a1aa?text=Tap+to+change+banner",
                            }}
                            className="w-full h-40"
                            resizeMode="cover"
                        />
                        <View className="absolute inset-0 bg-black/20 justify-center items-center">
                            <Ionicons name="camera" size={32} color="white" />
                        </View>
                    </TouchableOpacity>

                    <View className="px-5">
                        {/* PROFILE IMAGE SECTION */}
                        <View className="flex-row items-end -mt-14 mb-6">
                            <TouchableOpacity
                                onPress={() => pickImage("profile")}
                                className="relative"
                            >
                                <Image
                                    source={{
                                        uri: localProfileImage || profileImageUrl || "https://placehold.co/150",
                                    }}
                                    className="w-28 h-28 rounded-full border-4 border-white bg-white"
                                />
                                <View className="absolute inset-0 bg-black/30 rounded-full justify-center items-center">
                                    <Ionicons name="camera" size={28} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* FORM SECTION */}
                        <View className="bg-gray-50 rounded-3xl p-6 mb-6">
                            {/* Username */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Username</Text>
                            <View className="relative mb-6">
                                <TextInput
                                    className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm"
                                    placeholder="Enter your display name"
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholderTextColor="#9CA3AF"
                                />
                                {username !== "" && (
                                    <TouchableOpacity
                                        onPress={() => setUsername("")}
                                        className="absolute right-4 top-4"
                                    >
                                        <Ionicons name="close" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Handle */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Handle / Username</Text>
                            <View className="relative mb-6">
                                <TextInput
                                    className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm"
                                    placeholder="your_handle"
                                    value={handle}
                                    onChangeText={setHandle}
                                    placeholderTextColor="#9CA3AF"
                                />
                                {handle !== "" && (
                                    <TouchableOpacity
                                        onPress={() => setHandle("")}
                                        className="absolute right-4 top-4"
                                    >
                                        <Ionicons name="close" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Bio */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Bio</Text>
                            <View className="relative mb-6">
                                <TextInput
                                    className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm min-h-[80px]"
                                    placeholder="Tell us about yourself"
                                    value={bio}
                                    onChangeText={setBio}
                                    multiline
                                    numberOfLines={4}
                                    placeholderTextColor="#9CA3AF"
                                />
                                {bio !== "" && (
                                    <TouchableOpacity
                                        onPress={() => setBio("")}
                                        className="absolute right-4 top-4"
                                    >
                                        <Ionicons name="close" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Link */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Website / Link</Text>
                            <View className="relative mb-6">
                                <TextInput
                                    ref={linkRef}
                                    className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm"
                                    placeholder="https://example.com"
                                    value={link}
                                    onChangeText={setLink}
                                    placeholderTextColor="#9CA3AF"
                                />
                                {link !== "" && (
                                    <TouchableOpacity
                                        onPress={() => setLink("")}
                                        className="absolute right-4 top-4"
                                    >
                                        <Ionicons name="close" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Featured Song */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Featured Song</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!song) {
                                        router.push("/(drawer)/(main)/settings/select-song");
                                    }
                                }}
                                className="flex-row justify-between items-center border-2 border-purple-100 rounded-2xl px-4 py-3 bg-white mb-6 shadow-sm"
                            >
                                <Text className={song ? "text-black font-medium" : "text-gray-400"}>
                                    {song || "Select a song"}
                                </Text>

                                {song ? (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSong(null);
                                            setSongIdState(null);
                                        }}
                                    >
                                        <Ionicons name="close-outline" size={22} color="#7C3AED" />
                                    </TouchableOpacity>
                                ) : (
                                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                                )}
                            </TouchableOpacity>

                            {/* Save Button */}
                            <TouchableOpacity
                                className={`py-4 rounded-2xl mt-6 ${isSaving ? "bg-purple-400" : "bg-purple-600"}`}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                <View className="flex-row justify-center items-center">
                                    {isSaving ? (
                                        <>
                                            <ActivityIndicator color="white" size="small" />
                                            <Text className="text-white text-center font-semibold text-lg ml-2">
                                                Saving...
                                            </Text>
                                        </>
                                    ) : (
                                        <Text className="text-white text-center font-semibold text-lg tracking-wide">
                                            Save Changes
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}