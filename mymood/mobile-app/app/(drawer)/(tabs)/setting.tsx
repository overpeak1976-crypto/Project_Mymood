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
        { title: "Privacy settings", path: "/settings/privacy", icon: "chevron-forward" },
        { title: "Logout", action: "logout", icon: "log-out-outline" },
    ];

    const handleLogout = async () => {
        Alert.alert(
            "ออกจากระบบ",
            "คุณต้องการออกจากระบบหรือไม่",
            [
                { text: "No", style: "cancel" }, 
                { 
                    text: "Yes", style: "destructive",
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace("/(auth)");
                    }
                }
            ]
        )
    }

    return (
        <View className="flex-1 bg-[#F5F3FF]">

            <View className="mt-9 px-4 gap-7">
                
                <Text className="text-3xl font-extrabold text-center text-purple-700 mb-10">
                    Settings
                </Text>

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
                        className="bg-purple-100 p-5 rounded-xl flex-row justify-between items-center"
                    >
                        <Text className="text-[17px] font-semibold text-black">
                            {item.title}
                        </Text>

                        <Ionicons
                            name={item.icon as any}
                            size={20}
                            color="#333"
                        />
                    </TouchableOpacity>
                ))}
            </View>

        </View>
    );
}