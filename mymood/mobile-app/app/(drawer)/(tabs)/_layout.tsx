import { Tabs } from "expo-router";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import React from "react";
import { useUser } from "../../../context/UserContext"; // ✅ เพิ่ม

export default function TabLayout() {
    const { profile } = useUser(); // ✅ ดึงจาก context

    // ลบ useState และ useEffect ทั้งหมดออก ไม่ต้องการแล้ว

    return (
        <Tabs
            screenOptions={({ navigation }) => ({
                headerStyle: { backgroundColor: "#EBE6FF", height: 100 },
                tabBarStyle: { display: "none" },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginLeft: 15 }}>
                        <Ionicons name="menu" size={26} color="#7C3AED" />
                    </TouchableOpacity>
                ),
                headerTitle: () => (
                    <TouchableOpacity onPress={() => navigation.navigate("index")}>
                        <Image source={require("../../../assets/images/logo_Mymood.png")} style={{ width: 120, height: 40 }} resizeMode="contain" />
                    </TouchableOpacity>
                ),
                headerTitleAlign: "center",
                headerRight: () => (
                    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 15, gap: 15 }}>
                        <TouchableOpacity onPress={() => navigation.navigate("AIsearch")}>
                            <Ionicons name="search" size={24} color="#7C3AED" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate("profile")}>
                            {profile?.profile_image_url ? (
                                <Image
                                    key={profile.profile_image_url} // ✅ re-render เมื่อรูปเปลี่ยน
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
            <Tabs.Screen name="index" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="profile" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="AIsearch" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="upload" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="friends" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="Inbox" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="settings" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="library" options={{ animation: "fade", title: "" }} />
            <Tabs.Screen name="playlist/[id]" options={{ animation: "shift", title: "", headerShown: false }} />
            <Tabs.Screen name="liked-songs" options={{ animation: "shift", title: "", headerShown: false }} />
            <Tabs.Screen name="ProfilePublic/[id]" options={{ animation: "shift", title: "", headerShown: false }} />
        </Tabs>
    );
}