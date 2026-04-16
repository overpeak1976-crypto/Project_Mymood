import { View, Text, Switch } from "react-native";
import React, { useState } from "react";

export default function Privacy() {
    const [isPrivate, setIsPrivate] = useState(false);
    const [isActivity, setIsActivity] = useState(true);
    const [isMusic, setIsMusic] = useState(false);
    return (
        <View className="flex-1 bg-[#F5F3FF] pt-20 px-5">
            
            <View className="bg-white rounded-3xl p-5 border border-purple-200 shadow-lg">
                {/* 1 */}
                <View className="flex-row items-start">
                    <View  className="flex-1 pr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">
                            บัญชีส่วนตัว
                        </Text>
                        <Text className="text-sm text-gray-500 leading-5">
                            เมื่อบัญชีของคุณเป็นบัญชีส่วนตัวเฉพาะผู้ที่เป็นเพื่อนเท่านั้นที่มองเห็น(...)คุณได้
                        </Text>
                    </View>
                    <Switch
                        value={isPrivate}
                        onValueChange={setIsPrivate}
                        trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                        thumbColor={isPrivate ? "#7C3AED" : "#fff"}
                    />
                </View>

                <View className="h-[1px] bg-gray-200 my-5" />

                {/* 2 */}
                <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">
                            สถานะกิจกรรม
                        </Text>
                        <Text className="text-sm text-gray-500 leading-5">
                            เมื่อเปิดการตั้งค่านี้คุณและเพื่อนของคุณจะเห็นสถานะกิจกรรมของกันและกัน
                        </Text>
                    </View>
                    <Switch
                        value={isActivity}
                        onValueChange={setIsActivity}
                        trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                        thumbColor={isActivity ? "#7C3AED" : "#fff"}
                    />
                </View>

                <View className="h-[1px] bg-gray-200 my-5" />

                {/* 3 */}
                <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">
                            เพลงที่อัพโหลด
                        </Text>
                        <Text className="text-sm text-gray-500 leading-5">
                            เมื่อเปิดการตั้งค่านี้คุณและเพื่อนของคุณจะเห็นสถานะเพลงที่คุณอัพโหลดหน้าโปรไฟล์
                        </Text>
                    </View>
                    <Switch
                        value={isMusic}
                        onValueChange={setIsMusic}
                        trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                        thumbColor={isMusic? "#7C3AED" : "#fff"}
                    />
                </View>
            </View>
        </View>
    );
}