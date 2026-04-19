import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";

export default function Settings() {
    const router = useRouter();

    const menu = [
        { title: "Edit Profile", path: "/settings/edit-profile", icon: "chevron-forward" },
        { title: "Change Password", path: "/settings/change-password", icon: "chevron-forward" },
        { title: "Notification", path: "/settings/notification", icon: "chevron-forward" },
        { title: "Privacy Account", path: "/settings/privacy", icon: "chevron-forward" },
        { title: "Logout", action: "logout", icon: "log-out-outline" },
    ];

const handleLogout = async () => {
        Alert.alert(
            "ออกจากระบบ",
            "คุณต้องการออกจากระบบหรือไม่?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log("Starting logout process...");
                            const { data, error: getUserError } = await supabase.auth.getUser();
                            if (getUserError) {
                                console.error("Get user error:", getUserError);
                                throw getUserError;
                            }
                            if (data?.user) {
                                console.log("Updating is_online to false for user:", data.user.id);
                                const { error: updateError } = await supabase.from('users').update({ is_online: false }).eq('id', data.user.id);
                                if (updateError) {
                                    console.error("Update is_online error:", updateError);
                                    // ไม่ throw เพื่อให้ signOut ทำงานต่อ
                                }
                            }
                            console.log("Calling signOut...");
                            const { error: signOutError } = await supabase.auth.signOut();
                            if (signOutError) {
                                console.error("SignOut error:", signOutError);
                                throw signOutError;
                            }
                            console.log("SignOut successful");
                        } catch (error) {
                            console.error("Logout Error:", error);
                            Alert.alert("Error", "Logout failed. Please try again.");
                        } finally {
                            console.log("Redirecting to auth page...");
                            router.replace("/(auth)");
                        }
                    },
                },
            ]
        );
    };
    return (
    <View className="flex-1 bg-white">

        <View className="mt-14 px-5">

{/* HEADER */}
<View className="mb-8">
    <View className="flex-row items-center justify-between w-full">
        
        {/* TEXT */}
        <Text className="text-3xl font-extrabold text-purple-700">
            Settings
        </Text>

        {/* ICON */}
        <View className="w-9 h-9 rounded-full bg-purple-100 items-center justify-center">
            <Ionicons name="settings-outline" size={20} color="#7C3AED" />
        </View>

    </View>

    {/* 🔥 เส้นยาวเต็ม */}
    <View className="mt-4 h-[2px] w-full bg-purple-500 rounded-full" />
</View>

            {/* LIST */}
            <View className="bg-white rounded-2xl overflow-hidden">

                {menu.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => {
                            if (item.action === "logout") {
                                handleLogout();
                            }
                            else if (item.path) {
                                router.push(item.path as any);
                            }
                        }}
                        className="flex-row items-center justify-between py-4 px-3 active:bg-gray-100"
                    >
                        
                        <View className="flex-row items-center gap-3">
                            <Text className="text-[16px] text-black font-medium py-5">
                                {item.title}
                            </Text>
                        </View>

                        <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                            <Ionicons
                                name={item.icon as any}
                                size={18}
                                color="#111"
                            />
                        </View>

                        {index !== menu.length - 1 && (
                            <View className="absolute bottom-0 left-4 right-4 h-[0.5px] bg-gray-200" />
                        )}
                    </TouchableOpacity>
                ))}

            </View>

        </View>

    </View>
);
}