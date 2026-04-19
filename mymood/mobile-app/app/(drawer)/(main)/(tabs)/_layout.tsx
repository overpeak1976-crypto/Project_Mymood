import { Tabs, useRouter } from "expo-router";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import React from "react";
import { useUser } from "@/context/UserContext";

export default function TabLayout() {
    const router = useRouter();
    const { profile } = useUser();

    return (
        <Tabs
            screenOptions={({ navigation }) => ({
                headerStyle: { backgroundColor: "#EBE6FF", height: 110 },
                tabBarStyle: { display: "none" },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginLeft: 15 }}>
                        <Ionicons name="menu" size={26} color="#7C3AED" />
                    </TouchableOpacity>
                ),
                headerTitle: () => (
                    <TouchableOpacity onPress={() => router.replace("/(drawer)/(main)/(tabs)" as any)}>
                        <Image source={require("../../../../assets/images/logo_Mymood.png")} style={{ width: 120, height: 40 }} resizeMode="contain" />
                    </TouchableOpacity>
                ),
                headerTitleAlign: "center",
                headerRight: () => (
                    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 15, gap: 15 }}>
                        <TouchableOpacity onPress={() => router.push("/(drawer)/(main)/search" as any)}>
                            <Ionicons name="search" size={24} color="#7C3AED" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push("/(drawer)/(main)/profile" as any)}>
                            {profile?.profile_image_url ? (
                                <Image
                                    key={profile.profile_image_url}
                                    source={{ uri: profile.profile_image_url }}
                                    style={{ width: 35, height: 35, borderRadius: 50, borderWidth: 1.5, borderColor: "#7C3AED" }}
                                />
                            ) : (
                                <View style={{ width: 35, height: 35, borderRadius: 50, backgroundColor: "#333", justifyContent: "center", alignItems: "center" }}>
                                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                                        {profile?.username?.charAt(0).toUpperCase() || "?"}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                ),
            })}
        >
            <Tabs.Screen name="index" options={{ title: "" }} />
            <Tabs.Screen name="library" options={{ title: "" }} />
            <Tabs.Screen name="upload" options={{ title: "" }} />
            <Tabs.Screen name="inbox" options={{ title: "" }} />
        </Tabs>
    );
}