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
import { supabase } from "@/lib/supabase";
import { useAudio } from "@/context/AudioContext";

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
    const { refreshUserData } = require("@/context/UserContext").useUser ? require("@/context/UserContext") : { refreshUserData: undefined };

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
            "Confirm Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await stopAndReset();
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.user?.id) {
                                await supabase
                                    .from("users")
                                    .update({ is_online: false, last_active: new Date() })
                                    .eq("id", session.user.id);
                            }
                            await supabase.auth.signOut();
                            if (refreshUserData) await refreshUserData();
                            router.replace("/(auth)/login" as any);
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
            title: "Edit Profile",
            description: "Update your personal information and profile settings",
            route: "/(drawer)/(main)/settings/edit-profile",
            color: "#7C3AED",
        },
        {
            icon: "lock-closed-outline",
            title: "Change Password",
            description: "Update your account password to keep your account secure",
            route: "/(drawer)/(main)/settings/change-password",
            color: "#EC4899",
        },
    ];

    const privacySettings: SettingsItem[] = [
        {
            icon: "notifications-outline",
            title: "Notification Settings",
            description: "Manage your notification preferences",
            route: "/(drawer)/(main)/settings/notification",
            color: "#F59E0B",
        },
        {
            icon: "shield-outline",
            title: "Privacy Settings",
            description: "Manage your privacy preferences",
            route: "/(drawer)/(main)/settings/privacy",
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
                                backgroundColor: user?.is_online ? "#10B981" : "#EF4444",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                                alignSelf: "flex-start",
                            }}
                        >
                            <Text style={{ fontSize: 11, color: "#f5f5f5", fontWeight: "600" }}>
                                {user?.is_online ? "Online" : "Offline"}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Account Settings Section */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 }}>
                    Account Settings
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
                    Privacy & Security
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
                    About
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
                            About
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
                        Logout
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
