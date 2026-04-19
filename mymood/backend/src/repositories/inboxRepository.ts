import prisma from '../config/prisma';

export const inboxRepository = {
  async shareSong(senderId: string, receiverId: string, songId: string, message: string | null) {
    return prisma.shared_inbox.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        song_id: songId,
        message: message ?? null,
      },
    });
  },

  async getInbox(userId: string) {
    return prisma.shared_inbox.findMany({
      where: { receiver_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        message: true,
        status: true,
        created_at: true,
        users_shared_inbox_sender_idTousers: {
          select: { id: true, username: true, handle: true, profile_image_url: true },
        },
        songs: {
          select: { id: true, title: true, artist: true, cover_image_url: true, audio_file_url: true },
        },
      },
    });
  },
};
