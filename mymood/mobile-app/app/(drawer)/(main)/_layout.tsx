import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/context/UserContext";
import React from "react";

export default function MainLayout() {
    const router = useRouter();
    const { profile } = useUser();

    const sharedHeaderOptions = {
        headerShown: true,
        headerStyle: { backgroundColor: "#EBE6FF" ,height: 110},
        headerTintColor: "#7C3AED",
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4 }}>
                <Ionicons name="chevron-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
        ),
        headerTitle: () => (
            <Image
                source={require("../../../assets/images/logo_Mymood.png")}
                style={{ width: 120, height: 40 }}
                resizeMode="contain"
            />
        ),
        headerTitleAlign: "center" as const,
        headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", marginRight: 4, gap: 15 }}>
                <TouchableOpacity onPress={() => router.push("/(drawer)/(main)/search" as any)}>
                    <Ionicons name="search" size={22} color="#7C3AED" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/(drawer)/(main)/profile" as any)}>
                    {profile?.profile_image_url ? (
                        <Image
                            key={profile.profile_image_url}
                            source={{ uri: profile.profile_image_url }}
                            style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: "#7C3AED" }}
                        />
                    ) : (
                        <Ionicons name="person-circle-outline" size={30} color="#7C3AED" />
                    )}
                </TouchableOpacity>
            </View>
        ),
    };

    return (
        <Stack screenOptions={{ headerShown: false, animation: "default" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile" options={sharedHeaderOptions} />
            <Stack.Screen name="search" options={sharedHeaderOptions} />
            <Stack.Screen name="friends" options={sharedHeaderOptions} />
            <Stack.Screen name="liked-songs" options={sharedHeaderOptions} />
            <Stack.Screen name="playlist/[id]" options={sharedHeaderOptions} />
            <Stack.Screen name="user/[id]" options={sharedHeaderOptions} />
            <Stack.Screen name="settings" />
        </Stack>
    );
}