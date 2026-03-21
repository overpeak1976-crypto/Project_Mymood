import { Tabs } from "expo-router";
import {  View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={({ navigation }) => ({
            headerStyle: { backgroundColor: "#EDE7F6",height: 100},
            tabBarStyle: { display: "none" },

            // ☰ เปิด Drawer
            headerLeft: () => (
            <TouchableOpacity
                onPress={() =>
                navigation.dispatch(DrawerActions.openDrawer())
                }
                style={{ marginLeft: 15 }}
            >
                <Ionicons name="menu" size={26} color="#7C3AED" />
            </TouchableOpacity>
            ),

            //  โลโก้ตรงกลาง
            headerTitle: () => (
            <Image
                source={require("../../../assets/images/logo_Mymood.png")}
                style={{ width: 120, height: 40 }}
                resizeMode="contain"
            />
            ),
            headerTitleAlign: "center",

            // ค้นหา + โปรไฟล์
            headerRight: () => (
            <View
                style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 15,
                gap: 15,
                }}
            >
                {/*  ไปหน้า AIsearch */}
                <TouchableOpacity
                onPress={() => navigation.navigate("/(tabs)/AIsearch")}
                >
                <Ionicons name="search" size={24} color="#7C3AED" />
                </TouchableOpacity>

                {/* 👤 ไปหน้า profile */}
                <TouchableOpacity
                onPress={() => navigation.navigate("/(tabs)/profile")}
                >
                <View
                    style={{
                    width: 35,
                    height: 35,
                    borderRadius: 50,
                    backgroundColor: "#333",
                    justifyContent: "center",
                    alignItems: "center",
                    }}
                >
                    <Text style={{ color: "#fff" }}>A</Text>
                </View>
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