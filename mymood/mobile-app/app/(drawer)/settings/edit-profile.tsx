import { View, Text, TextInput, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";

export default function EditProfile() {
    
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [link, setLink] = useState("");
    const [song, setSong] = useState("");
    const [mood, setMood] = useState("");
    
    const moods = [
    "เศร้า 😭",
    "เหงา ☹️",
    "รัก 🥰",
    "สบายใจ 😌",
    "สนุกสนาน 😜",
    "โกรธ 😡",
    ];

    return (
        <ScrollView className="">
        <Text>Edit Profile</Text>
        </ScrollView>
    );
}