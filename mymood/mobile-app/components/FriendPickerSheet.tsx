import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { Send, Search, X } from "lucide-react-native";
import { httpClient } from "@/services/httpClient";
import { useToast } from "../context/ToastContext";

interface Friend {
  id: string;
  username: string;
  profile_image_url?: string;
}

interface FriendPickerSheetProps {
  visible: boolean;
  songId: string | null;
  songTitle: string | null;
  onClose: () => void;
}

export default function FriendPickerSheet({
  visible,
  songId,
  songTitle,
  onClose,
}: FriendPickerSheetProps) {
  const { showToast } = useToast();
  const sheetRef = useRef<BottomSheet>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
      fetchFriends();
    } else {
      sheetRef.current?.close();
      setSearch("");
      setMessage("");
    }
  }, [visible]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await httpClient.get<{ friends: Friend[] }>("/api/friends/list");
      setFriends(Array.isArray(data) ? data : data?.friends || []);
    } catch (err: any) {
      showToast("Failed to load friends list", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (friend: Friend) => {
    if (!songId || sending) return;
    setSending(friend.id);
    try {
      await httpClient.post("/api/inbox/share", {
        receiverId: friend.id,
        songId,
        message: message.trim() || null,
      });
      showToast(`ส่ง "${songTitle}" ให้ ${friend.username} แล้ว!`, "success");
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to send song", "error");
    } finally {
      setSending(null);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter((f) => f.username?.toLowerCase().includes(q));
  }, [friends, search]);

  return (
    <BottomSheet
      ref={sheetRef}
      enableDynamicSizing={false}
      snapPoints={["75%"]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundComponent={({ style }) => (
        <View style={[style, { overflow: "hidden", borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
          <BlurView intensity={200} tint="dark" style={{ flex: 1 }} />
        </View>
      )}
      handleIndicatorStyle={{ backgroundColor: "#D1D5DB", width: 40, height: 4, marginTop: 10 }}
      index={-1}
    >
      <BottomSheetScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={s.title}>Send Song to Friend</Text>
        {songTitle && <Text style={s.subtitle} numberOfLines={1}>Song: {songTitle}</Text>}

        {/* Message input */}
        <View style={s.msgRow}>
          <TextInput
            style={s.msgInput}
            placeholder="Write a message... (optional)"
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            maxLength={200}
          />
          {message.length > 0 && (
            <TouchableOpacity onPress={() => setMessage("")} style={s.clearBtn}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Friends List */}
        {loading ? (
          <ActivityIndicator color="#7C3AED" style={{ paddingVertical: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={s.empty}>
            {friends.length === 0 ? "No friends yet" : "No friends found"}
          </Text>
        ) : (
          filtered.map((friend) => {
            const isSending = sending === friend.id;
            return (
              <TouchableOpacity
                key={friend.id}
                style={s.friendRow}
                onPress={() => handleSend(friend)}
                disabled={!!sending}
                activeOpacity={0.7}
              >
                <Image
                  source={{
                    uri: friend.profile_image_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username || "U")}&background=7C3AED&color=fff&size=100`,
                  }}
                  style={s.avatar}
                />
                <Text style={s.friendName} numberOfLines={1}>{friend.username}</Text>
                {isSending ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : (
                  <View style={s.sendBtn}>
                    <Send size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 18, fontWeight: "800", color: "#ffffffee", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#A78BFA", fontWeight: "600", marginBottom: 16 },
  msgRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  msgInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },
  clearBtn: { padding: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12, marginLeft: 8 },
  empty: { color: "#9CA3AF", textAlign: "center", paddingVertical: 32, fontSize: 14 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EDE9FE" },
  friendName: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: "600", color: "#ffffffd7" },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
});
