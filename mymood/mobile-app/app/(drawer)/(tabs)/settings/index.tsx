import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../../lib/supabase";
import { useAudio } from "../../../../context/AudioContext";

type SettingsItem = {
    icon: string;
    title: string;
    description: string;
    route?: string;
    action?: () => void;
    color: string;
};

export default function SettingsIndex() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const { stopAndReset } = useAudio();

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profileData } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", authUser.id)
                    .single();
                setUser(profileData);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "ออกจากระบบ",
            "คุณต้องการออกจากระบบหรือไม่?",
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ออกจากระบบ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await stopAndReset();
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.user?.id) {
                                await supabase
                                    .from("users")
                                    .update({ is_online: false, current_song_id: null })
                                    .eq("id", session.user.id);
                            }
                            await supabase.auth.signOut();
                            router.replace("/(auth)" as any);
                        } catch (error) {
                            console.error("Logout error:", error);
                            Alert.alert("Error", "Failed to logout");
                        }
                    },
                },
            ]
        );
    };

    const accountSettings: SettingsItem[] = [
        {
            icon: "person-outline",
            title: "แก้ไขโปรไฟล์",
            description: "จัดการข้อมูลโปรไฟล์ของคุณ",
            route: "/(drawer)/(tabs)/settings/edit-profile",
            color: "#7C3AED",
        },
        {
            icon: "lock-closed-outline",
            title: "เปลี่ยนรหัสผ่าน",
            description: "อัปเดตรหัสผ่านของคุณ",
            route: "/(drawer)/(tabs)/settings/change-password",
            color: "#EC4899",
        },
    ];

    const privacySettings: SettingsItem[] = [
        {
            icon: "notifications-outline",
            title: "การแจ้งเตือน",
            description: "จัดการการแจ้งเตือน",
            route: "/(drawer)/(tabs)/settings/notification",
            color: "#F59E0B",
        },
        {
            icon: "shield-outline",
            title: "ความเป็นส่วนตัว",
            description: "ควบคุมการตั้งค่าความเป็นส่วนตัว",
            route: "/(drawer)/(tabs)/settings/privacy",
            color: "#10B981",
        },
    ];

    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#F8F7FF" }} showsVerticalScrollIndicator={false}>
            {/* Profile Card */}
            <View style={{ padding: 20, paddingTop: 20 }}>
                <View
                    style={{
                        backgroundColor: "white",
                        borderRadius: 24,
                        padding: 20,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 3,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <Image
                        source={{
                            uri: user?.profile_image_url || "https://via.placeholder.com/80",
                        }}
                        style={{
                            width: 70,
                            height: 70,
                            borderRadius: 35,
                            backgroundColor: "#E9D5FF",
                        }}
                    />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color: "#1F2937",
                                marginBottom: 4,
                            }}
                        >
                            {user?.username || "User"}
                        </Text>
                        {user?.handle ? (
                            <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
                                @{user.handle}
                            </Text>
                        ) : null}
                        <View
                            style={{
                                backgroundColor: "#ffffff",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                                alignSelf: "flex-start",
                            }}
                        >
                            <Text style={{ fontSize: 11, color: "#4c4c4c", fontWeight: "600" }}>
                                {user?.is_online ? " ออนไลน์" : " ออฟไลน์"}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Account Settings Section */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 }}>
                    บัญชีผู้ใช้
                </Text>
                {accountSettings.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => item.route && router.push(item.route as any)}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: "white",
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                backgroundColor: `${item.color}15`,
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 12,
                            }}
                        >
                            <Ionicons name={item.icon as any} size={24} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 2 }}>
                                {item.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{item.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Privacy & Security Section */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 }}>
                    ความเป็นส่วนตัวและความปลอดภัย
                </Text>
                {privacySettings.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => item.route && router.push(item.route as any)}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: "white",
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                backgroundColor: `${item.color}15`,
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 12,
                            }}
                        >
                            <Ionicons name={item.icon as any} size={24} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 2 }}>
                                {item.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{item.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>
                ))}
            </View>

            {/* About Section */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 }}>
                    เกี่ยวกับ
                </Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={{
                        backgroundColor: "white",
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <View
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: "#8B5CF615",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                        }}
                    >
                        <Ionicons name="information-outline" size={24} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 2 }}>
                            เวอร์ชัน
                        </Text>
                        <Text style={{ fontSize: 12, color: "#9CA3AF" }}>MyMood v1.0.0</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "600" }}>1.0.0</Text>
                </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
                <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.8}
                    style={{
                        backgroundColor: "#FEE2E2",
                        borderRadius: 16,
                        padding: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#EF4444",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        elevation: 3,
                    }}
                >
                    <Ionicons name="log-out-outline" size={22} color="#DC2626" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#DC2626" }}>
                        ออกจากระบบ
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
