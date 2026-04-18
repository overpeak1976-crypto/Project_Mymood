import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";

export default function ChangePassword() {

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);

    // ⏱ timeout helper กันค้าง
    const timeout = (ms: number) =>
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), ms)
        );

    const handleSave = async () => {
        if (loading) return;

        // ✅ validate
        if (!newPassword || !confirmPassword) {
            Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("แจ้งเตือน", "รหัสผ่านไม่ตรงกัน");
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert("แจ้งเตือน", "รหัสผ่านต้องอย่างน้อย 8 ตัว");
            return;
        }

        try {
            setLoading(true);

            // ✅ เอา session
            const { data: sessionData } = await supabase.auth.getSession();

            if (!sessionData.session) {
                throw new Error("Session หมดอายุ กรุณา login ใหม่");
            }

            const accessToken = sessionData.session.access_token;

            // ✅ ยิง REST API ตรง (นิ่งกว่า SDK)
            const request = fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/user`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`,
                        "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
                    },
                    body: JSON.stringify({
                        password: newPassword,
                    }),
                }
            );

            // 🔥 race กัน timeout
            const response: any = await Promise.race([
                request,
                timeout(8000), // 8 วิ
            ]);

            // 👉 ถ้า timeout แต่จริง ๆ เปลี่ยนแล้ว
            if (!response || response instanceof Error) {
                Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านสำเร็จ (อาจช้าเล็กน้อย)");
            } else {
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error_description || "เปลี่ยนรหัสผ่านไม่สำเร็จ"
                    );
                }

                Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านสำเร็จ");
            }

            // ✅ reset
            setNewPassword("");
            setConfirmPassword("");

        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#F5F3FF] pt-20 px-5">

            <View className="bg-white rounded-3xl p-6 shadow-lg border border-purple-100">

                {/* New Password */}
                <Text className="text-gray-700 font-semibold mb-2">
                    New Password
                </Text>
                <View>
                    <TextInput
                        className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                        secureTextEntry={!showNew}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                    />
                    <TouchableOpacity 
                        onPress={() => setShowNew(!showNew)}
                        className="absolute right-4 top-4"
                    >
                        <Ionicons
                            name={showNew ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="gray"
                        />
                    </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text className="text-gray-700 font-semibold mb-2">
                    Confirm Password
                </Text>
                <View>
                    <TextInput
                        className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm password"
                    />
                </View>

                {/* Button */}
                <TouchableOpacity 
                    className={`py-4 rounded-xl mt-6 ${
                        loading ? "bg-purple-300" : "bg-purple-600"
                    }`}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text className="text-white text-center font-semibold text-lg">
                        {loading ? "Saving..." : "Save Password"}
                    </Text>
                </TouchableOpacity>

            </View>
        </View>
    );
}