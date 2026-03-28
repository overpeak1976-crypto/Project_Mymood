import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { AudioProvider } from '../context/AudioContext';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const rootSegment = segments[0]; // ดึงชื่อโฟลเดอร์หลักมาเช็ค (เช่น '(auth)', '(tabs)', 'player')

      if (!session) {
        // 1. ถ้ายังไม่ล็อกอิน แล้วไม่ได้อยู่หน้า auth -> บังคับเตะไปหน้า auth
        if (rootSegment !== "(auth)") {
          router.replace("/(auth)" as any);
        }
      } else {
        // 2. (เผื่อไว้) เช็คว่าตั้งชื่อ Profile หรือยัง
        const { data: profile } = await supabase
          .from("users")
          .select("handle")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile?.handle) {
          if (segments[1] !== "complete-profile") {
            router.replace("/(auth)/complete-profile" as any);
          }
        } else {
          // 3. ถ้าล็อกอินแล้ว แต่ยังอยู่หน้า auth -> บังคับเตะไปหน้า tabs
          if (rootSegment === "(auth)") {
            router.replace("/(drawer)" as any);
          }
        }
      }
      setIsReady(true);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        checkAuth();
      }
    });

    // --- ส่วนอัปเดตสถานะ Online ---
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return; 
      const isOnline = nextAppState === "active";
      await supabase.from("users").update({
        is_online: isOnline,
        last_active: new Date()
      }).eq("id", session.user.id);
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      authListener.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [segments[0]]); // 🌟 ทริค: สั่งให้รันใหม่เฉพาะตอนเปลี่ยนโฟลเดอร์หลักเท่านั้น จะได้ไม่บัคลูปรัวๆ
  // รอให้เช็คระบบเสร็จก่อน ค่อยโหลดหน้าจอ
  if (!isReady) return null; 

  return (
    <AudioProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </AudioProvider>
  );
}