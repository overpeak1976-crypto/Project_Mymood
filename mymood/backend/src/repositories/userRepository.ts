import prisma from '../config/prisma';

export const userRepository = {
  async searchByHandle(handle: string) {
    return prisma.users.findMany({
      where: { handle: { contains: handle, mode: 'insensitive' } },
      select: { id: true, username: true, handle: true, profile_image_url: true },
      take: 10,
    });
  },

  async addFriendship(userId: string, friendId: string) {
    return prisma.friendships.create({
      data: { user_id: userId, friend_id: friendId, status: 'pending' },
    });
  },

  // Accept: update incoming request, then delete any duplicate outgoing request
  async acceptFriendship(senderId: string, myId: string) {
    const updated = await prisma.friendships.update({
      where: { user_id_friend_id: { user_id: senderId, friend_id: myId } },
      data: { status: 'accepted' },
    });
    // Clean up any reverse pending entry if it exists
    await prisma.friendships.deleteMany({
      where: { user_id: myId, friend_id: senderId, status: 'pending' },
    });
    return updated;
  },

  async getPlayHistory(userId: string) {
    return prisma.play_history.findMany({
      where: { user_id: userId },
      select: { songs: { select: { genre: true } } },
    });
  },
};
