import { notificationRepository } from '../repositories/notificationRepository';

export const notificationService = {
  async getMyNotifications(userId: string) {
    const data = await notificationRepository.getNotifications(userId);
    // Remap Prisma relation name to the "sender" key expected by the original response
    return data.map((n: any) => ({
      ...n,
      sender: n.users_notifications_sender_idTousers,
      users_notifications_sender_idTousers: undefined,
    }));
  },

  async markAsRead(notificationId: string, userId: string) {
    return notificationRepository.markAsRead(notificationId, userId);
  },
};
