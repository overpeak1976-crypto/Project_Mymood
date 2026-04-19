import React, { useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Share,
    StyleSheet,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Pencil, Share2, UserCircle2 } from "lucide-react-native";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";

interface ProfileMenuSheetProps {
    visible: boolean;
    onClose: () => void;
    /** ข้อมูลโปรไฟล์เพื่อใช้ใน share message */
    profile?: {
        username?: string;
        handle?: string;
        profile_image_url?: string;
    } | null;
}

export default function ProfileMenuSheet({
    visible,
    onClose,
    profile,
}: ProfileMenuSheetProps) {
    const router = useRouter();
    const sheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
        if (visible) sheetRef.current?.expand();
        else sheetRef.current?.close();
    }, [visible]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    );

    const handleEditProfile = () => {
        onClose();
        // เล็ก delay เพื่อให้ sheet ปิดก่อน navigate
        setTimeout(() => {
            router.push("/(drawer)/(tabs)/settings/edit-profile");
        }, 150);
    };

    const handleShareProfile = async () => {
        onClose();
        await Share.share({
            title: `MyMood — ${profile?.username ?? "โปรไฟล์"}`,
            message: `ดูโปรไฟล์ของ ${profile?.username ?? "ฉัน"} บน MyMood!\n@${profile?.handle ?? ""}`,
        });
    };

    const displayName = profile?.username ?? "โปรไฟล์ของฉัน";
    const handle = profile?.handle ? `@${profile.handle}` : "";

    return (
        <BottomSheet
            ref={sheetRef}
            enableDynamicSizing={false}
            snapPoints={["35%"]}
            enablePanDownToClose
            onClose={onClose}
            backdropComponent={renderBackdrop}
            backgroundComponent={({ style }) => (
                <View
                    style={[
                        style,
                        {
                            overflow: "hidden",
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                        },
                    ]}
                >
                    <BlurView intensity={200} tint="dark" style={{ flex: 1 }} />
                </View>
            )}
            backgroundStyle={{ borderRadius: 32 }}
            handleIndicatorStyle={{
                backgroundColor: "#D1D5DB",
                width: 40,
                height: 4,
                marginTop: 10,
            }}
            index={-1}
        >
            <BottomSheetView style={styles.sheet}>
                {/* ─── Profile Mini Header ─── */}
                <View style={styles.header}>
                    {profile?.profile_image_url ? (
                        <Image
                            source={{ uri: profile.profile_image_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <UserCircle2 size={28} color="#7C3AED" />
                        </View>
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.displayName} numberOfLines={1}>
                            {displayName}
                        </Text>
                        {handle ? (
                            <Text style={styles.handle} numberOfLines={1}>
                                {handle}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* ─── Divider ─── */}
                <View style={styles.divider} />

                {/* ─── Menu Items ─── */}
                <TouchableOpacity style={styles.menuRow} onPress={handleEditProfile} activeOpacity={0.7}>
                    <View style={[styles.iconBg, { backgroundColor: "#EDE9FE" }]}>
                        <Pencil size={20} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.menuLabel}>แก้ไขโปรไฟล์</Text>
                        <Text style={styles.menuSub}>เปลี่ยนรูป ชื่อ และข้อมูลส่วนตัว</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuRow} onPress={handleShareProfile} activeOpacity={0.7}>
                    <View style={[styles.iconBg, { backgroundColor: "#E0F2FE" }]}>
                        <Share2 size={20} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.menuLabel}>แชร์โปรไฟล์</Text>
                        <Text style={styles.menuSub}>แชร์โปรไฟล์ของคุณให้เพื่อน</Text>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 16 }} />
            </BottomSheetView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    sheet: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#EDE9FE",
    },
    avatarFallback: {
        justifyContent: "center",
        alignItems: "center",
    },
    displayName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ffffffee",
    },
    handle: {
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginBottom: 8,
    },
    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        gap: 16,
    },
    iconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#ffffffee",
    },
    menuSub: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
});
