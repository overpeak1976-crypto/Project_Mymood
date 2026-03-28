import { Drawer } from "expo-router/drawer";
import CustomDrawer from "../../components/CustomDrawer";

export default function DrawerLayout() {
    return (
        <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
            headerShown: false, 
            drawerStyle: {
                width: 300
            }}}>
        </Drawer>
    );
}