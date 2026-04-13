import { useCallback, useEffect, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { AudioProvider } from '../context/AudioContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const isHandlingAuth = useRef(false);
  const segmentsRef = useRef(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const checkAuth = useCallback(async () => {
    if (isHandlingAuth.current) return;
    isHandlingAuth.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const rootSegment = segmentsRef.current[0];
      const seg1 = segmentsRef.current[1];

      if (!session) {
        if (rootSegment !== "(auth)") {
          router.replace("/(auth)" as any);
        }
      } else {
        const { data: profile } = await supabase
          .from("users")
          .select("handle")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile?.handle) {
          if (seg1 !== "complete-profile") {
            router.replace("/(auth)/complete-profile" as any);
          }
        } else {
          if (rootSegment === "(auth)") {
            router.replace("/(drawer)" as any);
          }
        }
      }
    } finally {
      setIsReady(true);
      setTimeout(() => { isHandlingAuth.current = false; }, 500);
    }
  }, [router]);
  useEffect(() => {
    checkAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        checkAuth();
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [checkAuth]);
  useEffect(() => {
    checkAuth();

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const isOnline = nextAppState === 'active';
      await supabase.from('users').update({
        is_online: isOnline,
        last_active: new Date()
      }).eq('id', session.user.id);
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { appStateSubscription.remove(); };
  }, [segments[0]]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </AudioProvider>
    </GestureHandlerRootView>
  );
}