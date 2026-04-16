import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export default function TabLayout() {
    const router = useRouter();

    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: "#EBE6FF", height: 100 },
                tabBarStyle: { display: "none" },
                headerTitleAlign: "center",

                headerTitleStyle: {
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#4C1D95",
                },

                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.push("/setting")}
                        style={{
                            width: 40,
                            height: 40,
                            justifyContent: "center",
                            alignItems: "center",
                            marginLeft: 10,
                        }}
                    >
                        <Ionicons name="chevron-back" size={22} color="#4C1D95" />
                    </TouchableOpacity>
                ),

                // ❌ เอาปุ่มอื่นออก
                headerRight: () => null,
            }}
        >

            <Tabs.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
            <Tabs.Screen name="change-password" options={{ title: "Change Password" }} />
            <Tabs.Screen name="notification" options={{ title: "Notification" }} />
            <Tabs.Screen name="privacy" options={{ title: "Privacy Account" }} />
            <Tabs.Screen name="select-song" options={{ headerShown: false }}/>

        </Tabs>
    );
}