import { Request, Response } from 'express';
import { supabase } from '../config/supabase'; // ปรับ Path ให้ตรงของคุณ
import { AuthRequest } from '../middlewares/authMiddleware'; // ปรับ Path ให้ตรงของคุณ

// 🌟 1. ฟังก์ชันดึงแจ้งเตือนทั้งหมดของผู้ใช้ (เฉพาะของคนที่ล็อกอิน)
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    // ดึง user_id จาก token ของคนที่ล็อกอินอยู่
    const userId = req.user.id; 

    console.log(`📡 มีคนเรียกดู Inbox: ${userId}`);

    // ดึงข้อมูลแจ้งเตือนจากตาราง notifications
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:sender_id(handle, username, profile_image_url) // ดึงข้อมูลคนส่งมาด้วยถ้ามี
      `)
      .eq('user_id', userId) // ดึงเฉพาะของตัวเองเท่านั้น
      .order('created_at', { ascending: false }); // เอาแจ้งเตือนใหม่ขึ้นก่อน

    if (error) {
      console.error("Supabase Error (getMyNotifications):", error);
      throw error;
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error("🚨 ERROR [getMyNotifications]:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 🌟 2. ฟังก์ชันทำเครื่องหมายแจ้งเตือนว่า "อ่านแล้ว"
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // ID ของแจ้งเตือนที่กดอ่าน
    const userId = req.user.id; // เพื่อความปลอดภัย เช็คว่าเจ้าของแจ้งเตือนเป็นคนกด

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId); // ดักไว้ เผื่อยิง ID มั่วมาอ่านของคนอื่น

    if (error) throw error;

    res.status(200).json({ message: "Marked as read successfully" });
  } catch (error: any) {
    console.error("🚨 ERROR [markAsRead]:", error.message);
    res.status(500).json({ error: error.message });
  }
};