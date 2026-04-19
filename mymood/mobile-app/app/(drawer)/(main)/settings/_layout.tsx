import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export default function SettingsLayout() {
    const router = useRouter();

    return (
        <Stack   
    
            screenOptions={{
                

                headerStyle : { backgroundColor: "#EBE6FF" }, 
                headerTintColor: "#7C3AED",
                headerTitleStyle: {
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#7C3AED",
                    
                },
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
                gestureResponseDistance: { top: 50 },
                 
                
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="ml-1 p-2 rounded-lg"
                        style={{
                            width: 44,
                            height: 44,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#7C3AED" />
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    
                    title: "Settings",
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="edit-profile"
                options={{
                    title: "Edit Profile",
                }}
            />
            <Stack.Screen
                name="change-password"
                options={{
                    title: "Change Password",
                }}
            />
            <Stack.Screen
                name="notification"
                options={{
                    title: "Notification",
                }}
            />
            <Stack.Screen
                name="privacy"
                options={{
                    title: "Privacy",
                }}
            />
            <Stack.Screen
                name="select-song"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
