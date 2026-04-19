import React, { useState } from "react";
import { View, Text, Switch } from "react-native";

export default function Notification() {
    
    const [general, setGeneral] = useState(false);
    const [activity, setActivity] = useState(true);
    return(
        <View className="flex-1 bg-[#F5F3FF] pt-20 px-5">

            <View className="bg-white rounded-3xl p-5 border border-purple-200 shadow-lg">
                {/* 1 */}
                <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">
                            General Notifications
                        </Text>
                        <Text className="text-sm text-gray-500 leading-5">
                            Receive general notifications and all new music automatically
                        </Text>
                    </View>
                    <Switch
                        value={general}
                        onValueChange={setGeneral}
                        trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                        thumbColor={general ? "#7C3AED" : "#fff"}
                    />
                </View>

                <View className="h-[1px] bg-gray-200 my-5" />

                    {/* 2 */}
                    <View className="flex-row items-start">
                        <View className="flex-1 pr-3">
                            <Text className="text-lg font-bold text-gray-900 mb-1">
                                Activity Notifications
                            </Text>
                            <Text className="text-sm text-gray-500 leading-5">
                                Receive notifications when friends interact with your music
                            </Text>
                        </View>
                        <Switch
                            value={activity}
                            onValueChange={setActivity}
                            trackColor={{ false: "#E5E7EB", true: "#C084FC" }}
                            thumbColor={activity ? "#7C3AED" : "#fff"}
                        />
                    </View>
            </View>
        </View>
    );
}