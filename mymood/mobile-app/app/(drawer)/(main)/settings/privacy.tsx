import { View, Text, Switch, ActivityIndicator } from "react-native";
import React, { useState, useEffect } from "react";
import { httpClient } from "../../../../lib/httpClient";
import { useToast } from "../../../../context/ToastContext";

export default function Privacy() {
    const { showToast } = useToast();
    const [isActivity, setIsActivity] = useState(true);
    const [isMusic, setIsMusic] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrivacy();
    }, []);

    const fetchPrivacy = async () => {
        try {
            const data = await httpClient.get<{ show_activity_status: boolean; show_uploads: boolean }>('/api/users/privacy');
            if (data) {
                setIsActivity(data.show_activity_status ?? true);
                setIsMusic(data.show_uploads ?? false);
            }
        } catch (error) {
            console.error('Error fetching privacy:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePrivacy = async (field: 'show_activity_status' | 'show_uploads', value: boolean) => {
        try {
            await httpClient.put('/api/users/privacy', { [field]: value });
            showToast('บันทึกการตั้งค่าแล้ว', 'success');
        } catch (error) {
            console.error('Error updating privacy:', error);
            showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
            // Revert on failure
            if (field === 'show_activity_status') setIsActivity(!value);
            else setIsMusic(!value);
        }
    };

    const handleActivityToggle = (value: boolean) => {
        setIsActivity(value);
        updatePrivacy('show_activity_status', value);
    };

    const handleMusicToggle = (value: boolean) => {
        setIsMusic(value);
        updatePrivacy('show_uploads', value);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#F5F3FF] justify-center items-center">
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F5F3FF] pt-20 px-5">
            
            <View className="bg-white rounded-3xl p-5 border border-purple-200 shadow-lg">
                {/* 1 - Activity Status */}
                <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">
                            สถานะกิจกรรม
                        </Text>
                        <Text className="text-sm text-gray-500 leading-5">
                            เมื่อเปิดการตั้งค่านี้ เพื่อนของคุณจะเห็นว่าคุณกำลังฟังเพลงอะไรอยู่ในหน้าแรก ถ้าปิดจะไม่แสดง
                        </Text>
                    </View>
                    <Switch
                        value={isActivity}
                        onValueChange={handleActivityToggle}
                        trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                        thumbColor={isActivity ? "#7C3AED" : "#fff"}
                    />
                </View>

                <View className="h-[1px] bg-gray-200 my-5" />

                {/* 2 - Uploaded Songs */}
                <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">
                            เพลงที่อัพโหลด
                        </Text>
                        <Text className="text-sm text-gray-500 leading-5">
                            เมื่อเปิดการตั้งค่านี้ เพื่อนจะเห็นเพลงที่คุณอัพโหลดเมื่อดูโปรไฟล์ของคุณ ถ้าปิดจะซ่อนแท็บเพลงที่อัพโหลด
                        </Text>
                    </View>
                    <Switch
                        value={isMusic}
                        onValueChange={handleMusicToggle}
                        trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                        thumbColor={isMusic ? "#7C3AED" : "#fff"}
                    />
                </View>
            </View>
        </View>
    );
}