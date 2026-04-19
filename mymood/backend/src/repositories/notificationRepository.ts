import prisma from '../config/prisma';

export const notificationRepository = {
  async getNotifications(userId: string) {
    return prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        users_notifications_sender_idTousers: {
          select: { handle: true, username: true, profile_image_url: true },
        },
      },
    });
  },

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notifications.updateMany({
      where: { id: notificationId, user_id: userId },
      data: { is_read: true },
    });
  },
};
