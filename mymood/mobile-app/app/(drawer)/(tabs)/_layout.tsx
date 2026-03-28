import { Tabs } from "expo-router";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function TabLayout() {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [initial, setInitial] = useState<string>("?");

    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                if (user.user_metadata?.avatar_url) {
                    setAvatarUrl(user.user_metadata.avatar_url);
                } if (user.user_metadata?.full_name) {
                    setInitial(user.user_metadata.full_name.charAt(0).toUpperCase());
                } else if (user.email) {
                    setInitial(user.email.charAt(0).toUpperCase());
                }
            }
        };
        fetchUserProfile();
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setAvatarUrl(session.user.user_metadata?.avatar_url || null);
                const name = session.user.user_metadata?.full_name || session.user.email || "?"; 
                setInitial(name.charAt(0).toUpperCase());
            }
        });
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);
    return (
        <Tabs
            screenOptions={({ navigation }) => ({
            headerStyle: { backgroundColor: "#EDE7F6",height: 100},
            tabBarStyle: { display: "none" },
            // ☰ เปิด Drawer
            headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}style={{ marginLeft: 15 }}>
                <Ionicons name="menu" size={26} color="#7C3AED" />
            </TouchableOpacity>),
            //  โลโก้ตรงกลาง
            headerTitle: () => (
            <Image source={require("../../../assets/images/logo_Mymood.png")}style={{ width: 120, height: 40 }} resizeMode="contain"/>),
            headerTitleAlign: "center",

            // ค้นหา + โปรไฟล์
            headerRight: () => (
            <View style={{flexDirection: "row",alignItems: "center",marginRight: 15,gap: 15}}>
                <TouchableOpacity onPress={() => navigation.navigate("AIsearch")}>
                <Ionicons name="search" size={24} color="#7C3AED" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("profile")}>
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: 35,height: 35,borderRadius: 50, borderWidth: 1.5, borderColor: "#7C3AED"}}/>
                ) : (
                    <View
                        style={{ width: 35,height: 35,borderRadius: 50,backgroundColor: "#333",justifyContent: "center",alignItems: "center"}}>
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>{initial}</Text>
                    </View>
                )}
            </TouchableOpacity>
            </View>
            ),
        })}
        >
        <Tabs.Screen name="index" options={{ title: "" }} />
        <Tabs.Screen name="profile" options={{ title: "" }} />
        <Tabs.Screen name="AIsearch" options={{ title: "" }} />
        <Tabs.Screen name="upload" options={{ title: "" }} />
        <Tabs.Screen name="friends" options={{ title: "" }} />
        <Tabs.Screen name="Inbox" options={{ title: "" }} />
        <Tabs.Screen name="setting" options={{ title: "" }} />
        </Tabs>
    );
}