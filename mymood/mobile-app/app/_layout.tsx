import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = async (session: any | null) => {
      setSessionChecked(true);

      if (session) {
        const { data: profile } = await supabase
          .from("users")
          .select("handle")
          .eq("id", session.user.id)
          .maybeSingle();

        const hasProfile = profile && profile.handle;

        if (hasProfile) {
          if (segments[0] !== "(tabs)") {
            router.replace("/(tabs)" as any);
          }
        } else {
          if (segments[1] !== "complete-profile") {
             router.replace("/(auth)/complete-profile" as any);
          }
        }

      } else {
        if (segments[0] !== "(auth)") {
          router.replace("/(auth)" as any);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
       checkSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
           checkSession(session);
        } else if (event === "SIGNED_OUT") {
          router.replace("/(auth)" as any);
        }
      }
    );

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return; 
      const userId = session.user.id;
      const isOnline = nextAppState === "active";
      await supabase.from("users").update({
        is_online: isOnline,
        last_active: new Date(),
        updated_at: new Date()
      }).eq("id", userId);
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      authListener.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [segments]);

  if (!sessionChecked) return null; 

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}
