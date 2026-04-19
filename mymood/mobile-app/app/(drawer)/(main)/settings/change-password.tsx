import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function ChangePassword() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (loading) return;

        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New password and confirm password do not match.");
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert("Error", "New password must be at least 8 characters long.");
            return;
        }

        if (oldPassword === newPassword) {
            Alert.alert("Error", "New password cannot be the same as the old password.");
            return;
        }

        try {
            setLoading(true);

            // 1. Sign in with the old password to verify
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                Alert.alert("Error", "Unable to retrieve user information. Please log in again.");

                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword,
            });

            if (signInError) {
                Alert.alert("Error", "Incorrect old password. Please try again.");
                return;
            }

            // 2. Update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                throw new Error(updateError.message);
            }

            Alert.alert("Success", "Your password has been updated successfully.");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");

        } catch (err: any) {
            Alert.alert("Error", err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#F5F3FF] pt-20 px-5">
            <View className="bg-white rounded-3xl p-6 shadow-lg border border-purple-100">

                {/* Old Password */}
                <Text className="text-gray-700 font-semibold mb-2">Old Password</Text>
                <View>
                    <TextInput
                        className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                        secureTextEntry={!showOld}
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        placeholder="Enter your old password"
                        autoComplete="current-password"
                    />
                    <TouchableOpacity
                        onPress={() => setShowOld(!showOld)}
                        className="absolute right-4 top-4"
                    >
                        <Ionicons name={showOld ? "eye-off-outline" : "eye-outline"} size={20} color="gray" />
                    </TouchableOpacity>
                </View>

                {/* New Password */}
                <Text className="text-gray-700 font-semibold mb-2">New Password</Text>
                <View>
                    <TextInput
                        className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                        secureTextEntry={!showNew}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter your new password (at least 8 characters)"
                        autoComplete="new-password"
                    />
                    <TouchableOpacity
                        onPress={() => setShowNew(!showNew)}
                        className="absolute right-4 top-4"
                    >
                        <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="gray" />
                    </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text className="text-gray-700 font-semibold mb-2">Confirm Password</Text>
                <View>
                    <TextInput
                        className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
                        secureTextEntry={!showConfirm}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                    />
                    <TouchableOpacity
                        onPress={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-4"
                    >
                        <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="gray" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className={`py-4 rounded-xl mt-2 ${loading ? "bg-purple-400" : "bg-purple-600"}`}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white text-center font-semibold text-lg">
                            Save Changes
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}