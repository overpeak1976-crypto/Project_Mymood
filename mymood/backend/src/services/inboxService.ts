import { inboxRepository } from '../repositories/inboxRepository';

export const inboxService = {
  async shareSong(
    senderId: string,
    receiverId: string,
    songId: string,
    message: string | null,
  ) {
    return inboxRepository.shareSong(senderId, receiverId, songId, message);
  },

  async getMyInbox(userId: string) {
    const rawData = await inboxRepository.getInbox(userId);
    // Remap Prisma relation names to the original response shape expected by the mobile app
    return rawData.map((item: any) => ({
      id: item.id,
      message: item.message,
      status: item.status,
      created_at: item.created_at,
      sender: item.users_shared_inbox_sender_idTousers,
      song: item.songs,
    }));
  },
};
