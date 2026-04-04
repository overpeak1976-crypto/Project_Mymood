import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";

export default function ChangePassword() {
    
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);


    const oldRef = useRef<TextInput>(null); 

    // ✅ เพิ่ม function นี้ (logic ปุ่ม Save)
    const handleSave = async () => {

        // ✅ เช็คว่ากรอกครบไหม
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
            return;
        }

        // ✅ เช็คว่ารหัสใหม่ตรงกันไหม
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "รหัสผ่านไม่ตรงกัน");
            return;
        }

        // ✅ เช็คความยาวรหัส
        if (newPassword.length < 6) {
            Alert.alert("Error", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        // ✅ ยิงไป Supabase เปลี่ยนรหัสจริง
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert("Success", "อัปเดตรหัสผ่านแล้ว");

            // ✅ reset ค่า
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    return (
        <View className="flex-1 bg-[#F5F3FF] px-5 pt-12">

            <Text className="text-3xl font-extrabold text-center text-purple-700 mb-12">
                Change Password
            </Text>

            <View className="bg-white rounded-3xl p-6 shadow-lg border border-purple-100">

                {/* รหัสผ่านเก่า */}
                <Text className="text-gray-700 font-semibold mb-2">
                    Old Password
                </Text>
                    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-4 border border-gray-200">
                        <TextInput
                            ref={oldRef}
                            className="flex-1 text-base"
                            secureTextEntry={!showOld}
                            value={oldPassword}
                            onChangeText={setOldPassword}
                            placeholder="Enter old password"
                        />
                    <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                        <Ionicons
                            name={showOld ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="gray"
                        />
                    </TouchableOpacity>
                    </View>

                    {/* รหัสผ่านใหม่ */}
                <Text className="text-gray-700 font-semibold mb-2">
                    New password
                </Text>
                    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-4 border border-gray-200">
                        <TextInput
                            className="flex-1 text-base"
                            secureTextEntry={!showNew}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                        />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                        <Ionicons
                            name={showNew ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="gray"
                        />
                    </TouchableOpacity>
                    </View>
                

                {/* ยืนยันรหัสผ่านใหม่ */}
                <Text className="text-gray-700 font-semibold mb-2">
                    Confirm new password
                </Text>
                    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-4 border border-gray-200">
                        <TextInput
                            className="flex-1 text-base"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm password"
                        />
                    </View>
                    <TouchableOpacity 
                        className="bg-purple-600 py-4 rounded-xl mt-6"
                        onPress={handleSave}
                    >
                        <View>
                            <Text className="text-white text-center font-semibold text-lg tracking-wide">
                                Save Password
                            </Text>
                        </View>
                    </TouchableOpacity>
            </View>
        </View>
    );
}