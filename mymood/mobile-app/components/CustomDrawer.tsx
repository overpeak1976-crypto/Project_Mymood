import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";

export default function CustomDrawer(props: any) {
    const router = useRouter();

    const menu = [
        { label: "Home", route: "/(tabs)", icon: "home-outline" },
        { label: "AI search", route: "/(tabs)/AIsearch", icon: "search-outline" },
        { label: "Upload", route: "/(tabs)/upload", icon: "cloud-upload-outline" },
        { label: "Library", route: "/(tabs)/library", icon: "library-outline" },
        { label: "Friends", route: "/(tabs)/friends", icon: "people-outline" },
        { label: "Inbox", route: "/(tabs)/Inbox", icon: "mail-outline" },
        { label: "Setting", route: "/(tabs)/setting", icon: "settings-outline" },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: "#F5F3FF" }}>

            {/* Header */}
            <View
                style={{
                    paddingTop: 50,
                    paddingBottom: 20,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderColor: "#E9D5FF",
                    flexDirection: "row",
                    alignItems: "center",
                    height: 100,
                }}
            >
                <TouchableOpacity
                    onPress={() => props.navigation.closeDrawer()} // 🌟 สั่งปิด Drawer ให้สไลด์เก็บแบบสวยงาม
                    style={{
                        width: 40,
                        height: 40,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 10,
                    }}
                >
                    <Ionicons name="chevron-back" size={22} color="#4C1D95" />
                </TouchableOpacity>

                <Image
                    source={require("../assets/images/logo_Mymood.png")}
                    style={{
                        width: 120,
                        height: 40,
                        resizeMode: "contain",
                    }}
                />
            </View>

            {/* Menu */}
            <DrawerContentScrollView {...props}>
                {menu.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => router.push(item.route as any)}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 15,
                            paddingHorizontal: 20,
                            borderBottomWidth: 1,
                            borderColor: "#E9D5FF",
                        }}
                    >
                        <Ionicons
                            name={item.icon as any}
                            size={20}
                            color="#6C2BD9"
                            style={{ marginRight: 12 }}
                        />
                        <Text
                            style={{
                                fontSize: 16,
                                color: "#4C1D95",
                                fontWeight: "500",
                            }}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </DrawerContentScrollView>

        </View>
    );
}