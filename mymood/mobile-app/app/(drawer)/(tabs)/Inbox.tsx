import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../../lib/supabase'; // ปรับ Path ให้ตรง
import { Megaphone, UserPlus, Music, Trash2, MailOpen } from 'lucide-react-native'; // นำเข้าไอคอนสื่อความหมาย
import { useFocusEffect } from 'expo-router'; // เพื่อรีเฟรชข้อมูลเมื่อกลับมาที่หน้าหนี้

export default function InboxScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🌟 1. ดึง URL ของ Backend จาก environment variable
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  // 🌟 2. ฟังก์ชันดึงข้อมูลแจ้งเตือนจาก Backend
  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ดึงข้อมูลแจ้งเตือนไม่สำเร็จ');
      }

      setNotifications(data);
    } catch (error: any) {
      console.error('Fetch Notifications Error:', error);
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [BACKEND_URL]);

  // 🌟 3. เรียกดึงข้อมูลเมื่อเข้าหน้านี้ (และเมื่อกลับมาที่หน้าหนี้)
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  // 🌟 4. ฟังก์ชันกดอ่านแจ้งเตือน
  const handlePressNotification = async (notificationId: string, isRead: boolean) => {
    // ถ้าอ่านแล้ว ไม่ต้องยิง API ไปบอก Server
    if (isRead) return;

    // หาแจ้งเตือนที่กดแล้วเปลี่ยนสถานะใน UI ทันที (เพื่อให้ดูเร็ว)
    setNotifications((prev) =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );

    // ยิง API ไปบอก Server ว่าคนนี้อ่านแล้ว
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      // ไม่ต้องทำ Alert เพราะ UI เปลี่ยนสถานะไปแล้ว
    } catch (error) {
      console.error('Error marking as read:', error);
      // ถ้า Error อาจจะย้อน UI กลับมา แต่ส่วนใหญ่ปล่อยไปได้ เพราะหน้าเว็บจะเห็นถูก
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // 🌟 5. ฟังก์ชันเลือกไอคอนและสีตามประเภท
  const getIconByType = (type: string) => {
    switch (type) {
      case 'admin_notice':
        return { icon: <Megaphone color="#EF4444" size={24} />, bgColor: 'bg-red-100' };
      case 'friend_request':
        return { icon: <UserPlus color="#3B82F6" size={24} />, bgColor: 'bg-blue-100' };
      case 'song_share':
        return { icon: <Music color="#9333EA" size={24} />, bgColor: 'bg-purple-100' };
      default:
        return { icon: <Megaphone color="#6B7280" size={24} />, bgColor: 'bg-gray-100' };
    }
  };

  // 🌟 6. คอมโพเนนต์แสดงผลทีละรายการ
  const renderNotificationItem = ({ item }: { item: any }) => {
    const { icon, bgColor } = getIconByType(item.type);

    return (
      <TouchableOpacity
        onPress={() => handlePressNotification(item.id, item.is_read)}
        className={`flex-row items-center px-5 py-4 ${item.is_read ? 'bg-white' : 'bg-purple-50'}`}
        style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} // Tailwind บางทีเพี้ยนตรง border
      >
        {/* ไอคอนแสดงประเภท */}
        <View className={`${bgColor} w-12 h-12 rounded-full items-center justify-center mr-4 shadow-inner`}>
          {icon}
        </View>

        {/* เนื้อหาแจ้งเตือน */}
        <View className="flex-1 mr-2">
          <Text className={`font-bold text-gray-900 mb-1 ${item.is_read ? '' : 'font-extrabold'}`}>
            {item.title}
          </Text>
          <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
            {item.message}
          </Text>
          <Text className="text-gray-400 text-xs mt-2 font-medium">
            {/* แปลงวันที่ให้ดูง่าย (เช่น Today, 10:30 AM) */}
            {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ', ' + new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* จุดแดงแจ้งเตือนใหม่ */}
        {!item.is_read && (
          <View className="w-3 h-3 bg-purple-600 rounded-full" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* ส่วนหัวหน้าจอ */}
      <View className="bg-white px-6 pt-12 pb-5 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <Text className="text-3xl font-extrabold text-purple-700">Inbox</Text>

        {/* ปุ่มทำเครื่องหมายอ่านทั้งหมด (ถ้าจะทำเพิ่ม) */}
        <TouchableOpacity className="p-2">
          <MailOpen color="#9333EA" size={22} />
        </TouchableOpacity>
      </View>

      {/* รายการแจ้งเตือน */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333EA" />
          <Text className="text-gray-500 mt-3 font-medium">กำลังโหลด Inbox...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#9333EA"]} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20 px-10">
              <Megaphone color="#E9D5FF" size={64} className="mb-5" />
              <Text className="text-xl font-bold text-purple-600 mb-2">ยังไม่มีแจ้งเตือนใหม่</Text>
              <Text className="text-gray-400 text-center leading-5">คุณจะเห็นแจ้งเตือนต่างๆ เช่น ประกาศจากแอดมิน หรือการขอเพิ่มเพื่อนที่นี่ครับ</Text>
            </View>
          }
        />
      )}

      {/* ส่วนท้ายหน้าจอเผื่อต้องใส่ */}
      <View className="h-10 bg-white" />
    </View>
  );
}