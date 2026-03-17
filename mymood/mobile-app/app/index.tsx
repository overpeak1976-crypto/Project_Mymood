import { ActivityIndicator, View } from "react-native";

export default function RootIndex() {
  return (
    <View className="flex-1 justify-center items-center bg-[#F5F3FF]">
      <ActivityIndicator size="large" color="#6B21A8" />
    </View>
  );
}