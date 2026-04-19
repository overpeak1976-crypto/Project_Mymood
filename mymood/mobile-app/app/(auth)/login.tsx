import "../global.css";
import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { AntDesign } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Please fill in your email and password", 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showToast("Invalid email or password", 'error');
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('users').update({
          is_online: true,
          last_active: new Date()
        }).eq('id', userData.user.id);
      }
      showToast("Login successful!", 'success');
      router.replace("/(drawer)/(main)/(tabs)" as any);
    }
    setLoading(false);
  };

  const onGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (res.type === 'success') {
        const { params, errorCode } = QueryParams.getQueryParams(res.url);
        if (errorCode) throw new Error(errorCode);
        const { access_token, refresh_token } = params;

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token
          });
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const user = userData.user;
          const { data: existingUser } = await supabase
            .from('users')
            .select('handle')
            .eq('id', user.id)
            .maybeSingle();

          if (existingUser?.handle) {
            await supabase.from('users').update({
              is_online: true,
              last_active: new Date(),
            }).eq('id', user.id);
            router.replace("/(drawer)/(main)/(tabs)" as any);
          } else {
            router.replace("/(auth)/complete-profile" as any);
          }
        }
      }
    } catch (error: any) {
      showToast(`Google login failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F3FF] px-6 pt-20">
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Text className="text-purple-600 font-bold text-lg">Back</Text>
      </TouchableOpacity>

      <Text className="text-3xl font-extrabold text-purple-800 mb-2">Welcome Back!</Text>
      <Text className="text-gray-500 mb-10">Please sign in to continue to your account.</Text>

      <View className="mb-6">
        <TextInput
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-4 shadow-sm"
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-white p-4 rounded-2xl border border-purple-100 mb-6 shadow-sm"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-purple-300' : 'bg-purple-600'}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-[1px] bg-gray-300" />
        <Text className="mx-4 text-gray-400">or</Text>
        <View className="flex-1 h-[1px] bg-gray-300" />
      </View>

      {/* Google Login */}

      <TouchableOpacity
        onPress={onGoogleLogin}
        className="bg-white py-4 rounded-2xl flex-row justify-center items-center border border-gray-200"
      >
        <AntDesign name="google" size={22} color="#7C3AED" style={{ marginRight: 10 }} />
        <Text className="text-gray-700 font-bold text-base">Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}