import { Tabs, useRouter } from "expo-router";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function TabLayout() {

    const router = useRouter();
    
    const [picture, setPicture] = useState<string | null>(null);
    const [initial, setInitial] = useState<string>("?");

    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData, error } = await supabase.from('users').select('profile_image_url, username, email').eq('id', user.id).single();
                if (!error && userData) {

                    if (userData.profile_image_url) {
                        setPicture(userData.profile_image_url);
                    } else if (user.user_metadata?.picture) {
                        setPicture(user.user_metadata.picture); // สำรองถ้าใน DB ไม่มี
                    }
                    const nameToUse = userData.username || user.user_metadata?.full_name || userData.email || user.email || "?";
                    setInitial(nameToUse.charAt(0).toUpperCase());
                } else {

                    if (user.user_metadata?.picture) setPicture(user.user_metadata.picture);
                    const fallbackName = user.user_metadata?.full_name || user.email || "?";
                    setInitial(fallbackName.charAt(0).toUpperCase());
                }
            }
        };
        fetchUserProfile();
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const { data: userData } = await supabase.from('users').select('profile_image_url, username').eq('id', session.user.id).single();
                if (userData?.profile_image_url) {
                    setPicture(userData.profile_image_url);
                } else {
                    setPicture(session.user.user_metadata?.picture || null);
                }
                const name = userData?.username || session.user.user_metadata?.full_name || session.user.email || "?";
                setInitial(name.charAt(0).toUpperCase());
            } else {
                setPicture(null);
                setInitial("?");
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    return (
        <Tabs
            screenOptions={({ navigation }) => ({
                headerStyle: { backgroundColor: "#EBE6FF", height: 100 },
                tabBarStyle: { display: "none" },
                //กดกลับ
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
                //โลโก้
                headerTitle: () => (
                    <Image source={require("../../../assets/images/logo_Mymood.png")} 
                        style={{ width: 120, height: 40 }} 
                        resizeMode="contain" />
                    ),
                    headerTitleAlign: "center",

                // ค้นหา + โปรไฟล์ 
                headerRight: () => (
                    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 15, gap: 15 }}>
                        <TouchableOpacity onPress={() => navigation.navigate("AIsearch")}>
                        <Ionicons name="search" size={24} color="#7C3AED" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate("profile")}>
                            {picture ? (
                                <Image
                                    source={{ uri: picture }}
                                    style={{ width: 35, height: 35, borderRadius: 50, borderWidth: 1.5, borderColor: "#7C3AED" }} />
                            ) : (
                                <View
                                    style={{ width: 35, height: 35, borderRadius: 50, backgroundColor: "#333", justifyContent: "center", alignItems: "center" }}>
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