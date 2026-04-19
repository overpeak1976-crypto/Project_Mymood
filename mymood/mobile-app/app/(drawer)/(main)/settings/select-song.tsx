import { View, Text, TouchableOpacity, FlatList, TextInput, Image, } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectSong() {
    const router = useRouter();

    const [songs, setSongs] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchSongs();
    }, []);

    const fetchSongs = async () => {
        const { data, error } = await supabase
            .from("songs")
            .select("*")
            .order("title", { ascending: true });

        if (data) setSongs(data);
    };

    const filteredSongs = songs.filter((song) =>
        `${song.title} ${song.artist}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

return (
    <SafeAreaView className="flex-1 bg-white">
        <View className="p-5">

            {/* BACK */}
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
                <Text className="text-purple-600 font-bold">← Back</Text>
            </TouchableOpacity>

            {/* SEARCH */}
            <TextInput
                placeholder="ค้นหาเพลง..."
                value={search}
                onChangeText={setSearch}
                className="border rounded-xl px-4 py-3 mb-4"
            />

            {/* LIST */}
            <FlatList
                data={filteredSongs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: "/(drawer)/settings/edit-profile",
                                params: {
                                    songId: item.id,
                                    songName: `${item.artist} - ${item.title}`,
                                },
                            })
                        }
                        className="flex-row items-center py-3 border-b"
                    >
                        <Image
                            source={{ uri: item.cover_image_url }}
                            className="w-12 h-12 rounded-lg mr-3"
                        />
                        <View>
                            <Text className="font-semibold">{item.title}</Text>
                            <Text className="text-gray-500">{item.artist}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    </SafeAreaView>
);
}