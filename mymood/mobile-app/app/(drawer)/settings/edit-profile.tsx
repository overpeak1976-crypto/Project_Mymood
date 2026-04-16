import { View, Text, TextInput, Image, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useRef } from "react";


type SongParams = {
    songId?: string;
    songName?: string;
};

export default function EditProfile() {
    const router = useRouter();
    const { songId, songName } = useLocalSearchParams<SongParams>();
    const [profile, setProfile] = useState<any>(null);

    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [link, setLink] = useState("");
    const [song, setSong] = useState<string | null>(null);
    const [songIdState, setSongIdState] = useState<string | null>(null);

    const [username, setUsername] = useState("");
    const [avatar, setAvatar] = useState("");

    const linkRef = useRef<TextInput>(null);

    useFocusEffect(
        useCallback(() => {
            setTimeout(() => {
                Keyboard.dismiss();
                linkRef.current?.blur();
            }, 100);
        }, [])
    );

    // ✅ โหลดข้อมูล user
    useEffect(() => {
        fetchProfile();
    }, []);

    const [songData, setSongData] = useState<any>(null);

    const fetchProfile = async () => {
        const { data: userData } = await supabase.auth.getUser();

        // ✅ แก้ error null
        if (!userData?.user) {
            setLoading(false);
            return;
        }


        // ⭐ แก้: join songs เพื่อเอา title มาใช้
        const { data: profileData } = await supabase
            .from("users")
            .select(`
                *,
                song:songs!fk_current_playing_song (
                    id,
                    title,
                    artist,
                    cover_image_url
                )
            `)
            .eq("id", userData.user.id)
            .single();
        setProfile(profileData);

        if (profileData) {
            setName(profileData.username|| "");
            setBio(profileData.bio || "");
            setLink(profileData.link || "");
            setSongData(profileData.song || null);
            setSong(profileData.song?.title  || null);
            setSongIdState(profileData.song?.id|| null);
            setUsername(profileData.handle || "username");
            setAvatar(profileData.profile_image_url || "");
        }

        setLoading(false);
    };

    // ✅ รับเพลงจาก select-song (expo-router)
    useFocusEffect(
        useCallback(() => {
            if (songName) {
                setSong(songName);
                setSongIdState(songId || null);
            }
        }, [songId, songName])
    );

    // ✅ SAVE
    const handleSave = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
        setLoading(false);
        return;
    }

    const { error } = await supabase
        .from("users")
        .update({
            username: name,
            bio,
            link,
            current_playing_song_id: songIdState,
        })
        .eq("id", userData.user.id);

    if (error) {
        console.log(error);
        Alert.alert("Error", "บันทึกไม่สำเร็จ");
        setLoading(false);
        return;
    }

    await fetchProfile();

    setLoading(false); 
    Alert.alert("Save!" ,"บันทึกสำเร็จ");  
};

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator />
            </View>
        );
    }

// ⭐ NEW: เลือกรูปจากเครื่อง
const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
        Alert.alert("Permission required", "ต้องอนุญาตให้เข้าถึงรูปภาพ");
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
    });

    if (result.canceled) return;

    const image = result.assets[0];
    uploadImage(image.uri);
};

// ⭐ NEW: อัปโหลดรูปไป Supabase Storage
const uploadImage = async (uri: string) => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    // ⭐ FIX: กัน loading ค้างถ้าไม่มี user
    if (!userData?.user) {
        setLoading(false);
        return;
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `${userData.user.id}-${Date.now()}.jpg`;

    // ⭐ NEW: upload ไป bucket "avatars"
    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
            contentType: "image/jpeg",
        });

    if (uploadError) {
        console.log(uploadError);
        Alert.alert("Upload failed");
        setLoading(false);
        return;
    }

    // ⭐ NEW: ดึง public URL
    const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

    const publicUrl = data?.publicUrl;

    // ⭐ FIX: กัน publicUrl undefined
    if (!publicUrl) {
        Alert.alert("Error getting image URL");
        setLoading(false);
        return;
    }

    // ⭐ NEW: update URL ลง DB
    const { error: updateError } = await supabase
        .from("users")
        .update({
            profile_image_url: publicUrl,
        })
        .eq("id", userData.user.id);

    // ⭐ FIX: เช็ค error ตอน update
    if (updateError) {
        console.log(updateError);
        Alert.alert("Update failed");
    }

    setAvatar(publicUrl); // ⭐ NEW: อัปเดตรูปใน UI
    setLoading(false);

    // ⭐ NEW: แจ้งเตือนสำเร็จ (เพิ่ม UX)
    Alert.alert("สำเร็จ", "อัปโหลดรูปเรียบร้อยแล้ว");
};

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={80}
        >

            <ScrollView
                className="flex-1 bg-[#F5F3FF] px-5 pt-12"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 120 }}
            >


                <View className="items-center mb-3">

                    <View className="relative w-28 h-28 rounded-full overflow-hidden">

                        <TouchableOpacity onPress={pickImage}>

                            {/* รูปโปรไฟล์ */}
                            <Image
                                source={{
                                    uri: avatar || "https://placehold.co/100",
                                }}
                                className="w-full h-full"
                            />

                            {/* overlay */}
                            <View className="absolute inset-0 bg-black/40 justify-center items-center">
                                <Ionicons name="camera" size={32} color="white" />
                            </View>

                        </TouchableOpacity>

                    </View>

                </View>


                <View className="items-center mb-9">
                    <Text className="text-lg font-semibold">{profile.username || "No Name"}</Text>
                    <Text className="text-sm text-gray-500">@{profile.handle}</Text>
                </View>


                <View className="bg-white rounded-3xl p-6 shadow-lg border border-purple-100">
                    {/* ชื่อ */}
                    <Text className="mb-2">
                        ชื่อที่แสดง
                    </Text>
                    <View>
                        <TextInput
                            ref={linkRef}
                            className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                            placeholder="ใส่ชื่อของคุณ"
                            value={name}
                            onChangeText={setName}
                        />
                        {name !== "" && (
                            <TouchableOpacity
                                onPress={() => setName("")}
                                className="absolute right-4 top-4"
                            >
                                <Ionicons name="close" size={20} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* คำอธิบายตัวเอง */}
                    <Text className="mb-2">
                        คำอธิบายตัวเอง
                    </Text>
                    <View>
                        <TextInput
                            className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                            placeholder="เล่าเกี่ยวกับตัวคุณ"
                            value={bio}
                            onChangeText={setBio}
                        />
                        {bio !== "" && (
                            <TouchableOpacity
                                onPress={() => setBio("")}
                                className="absolute right-4 top-4"
                            >
                                <Ionicons name="close" size={20} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ลิงก์ */}
                    <Text className="mb-2">
                        ลิงก์
                    </Text>
                    <View>
                        <TextInput
                            className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                            placeholder="https://www.instagram.com/"
                            value={link}
                            onChangeText={setLink}
                        />
                        {link !== "" && (
                            <TouchableOpacity
                                onPress={() => setLink("")}
                                className="absolute right-4 top-4"
                            >
                                <Ionicons name="close" size={20} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* เพลง */}
                    <Text className="mb-2">
                        เพลง
                    </Text>

                    <View>
                        <TouchableOpacity
                            onPress={() => {
                                if (!song) {
                                    router.push("/(drawer)/settings/select-song");
                                }
                            }}
                            className="flex-row justify-between items-center border-2 border-purple-100 rounded-2xl px-4 py-3 bg-white mb-6 shadow-sm"
                        >
                            <Text className={song ? "text-black" : "text-gray-400"}>
                                {song || "เลือกเพลง"}
                            </Text>

                            {song ? (
                                // ❌ ปุ่มลบเพลง
                                <TouchableOpacity
                                    onPress={() => {
                                        setSong(null); // ⭐ ลบเพลง
                                        setSongIdState(null); // ⭐ ลบ id

                                        router.setParams({
                                            songId: undefined,
                                            songName: undefined,
                                        }); // ⭐ เพิ่ม: กันบัคเลือกเพลงเดิมไม่ได้
                                    }}
                                >
                                    <Ionicons name="close-outline" size={22} />
                                </TouchableOpacity>
                            ) : (
                                // ➡️ ปุ่มไปเลือกเพลง
                                <Ionicons name="chevron-forward" size={20} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        className="bg-purple-600 py-4 rounded-xl mt-6"
                        onPress={handleSave}
                    >
                        <View>
                            <Text className="text-white text-center font-semibold text-lg tracking-wide">
                                Save
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}