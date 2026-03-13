import "../global.css"
import { Text, View, Image } from "react-native";


export default function Index() {
    return (
        <View className=" flex-1 bg-[#F5F3FF]">
            <View className="flex-1 justify-center items-center ">
                <Image 
                    source={require("../../assets/images/logo_Mymood.png")}
                    style={{ width: 250, height: 120 }}
                    className="mb-9"
                />
            </View>
            <View className="items-center mb-36">
                <View className="w-[250px] h-[60px] bg-purple-500 rounded-full items-center justify-center ">
                    <Text className="text-white text-2xl font-bold ">Get Started</Text>
                </View>
            </View>
        </View>
    );
}



