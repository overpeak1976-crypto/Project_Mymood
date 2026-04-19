import { Drawer } from "expo-router/drawer";
import CustomDrawer from "@/components/CustomDrawer";
import { Platform } from "react-native";

export default function DrawerLayout() {
    return (
        <Drawer
            drawerContent={(props) => <CustomDrawer {...props} />}
            screenOptions={{
                headerShown: false,
                drawerStyle: {
                    width: 300,
                },
                drawerType: 'front',
                swipeEdgeWidth: 50,
                swipeEnabled: true,
                ...(Platform.OS === 'ios' ? { drawerStatusBarAnimation: 'slide' } : {}),
            }}
        >
            <Drawer.Screen
                name="(main)"
                options={{
                    drawerLabel: "Home",
                    headerShown: false,
                }}
            />
        </Drawer>
    );
}