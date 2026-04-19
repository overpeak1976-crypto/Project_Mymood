import prisma from '../config/prisma';

const userSelect = {
  id: true,
  username: true,
  handle: true,
  profile_image_url: true,
  is_online: true,
};

export const friendRepository = {
  async getAcceptedFriendships(userId: string) {
    return prisma.friendships.findMany({
      where: {
        status: 'accepted',
        OR: [{ user_id: userId }, { friend_id: userId }],
      },
      select: {
        user_id: true,
        friend_id: true,
        users_friendships_user_idTousers: { select: userSelect },
        users_friendships_friend_idTousers: { select: userSelect },
      },
    });
  },

  async getPendingRequests(userId: string) {
    return prisma.friendships.findMany({
      where: { friend_id: userId, status: 'pending' },
      select: {
        user_id: true,
        friend_id: true,
        users_friendships_user_idTousers: {
          select: { id: true, username: true, handle: true, profile_image_url: true },
        },
      },
    });
  },

  async getSentRequests(userId: string) {
    return prisma.friendships.findMany({
      where: { user_id: userId, status: 'pending' },
      select: {
        user_id: true,
        friend_id: true,
        users_friendships_friend_idTousers: {
          select: { id: true, username: true, handle: true, profile_image_url: true },
        },
      },
    });
  },

  async deleteRelationship(userAId: string, userBId: string) {
    return prisma.friendships.deleteMany({
      where: {
        OR: [
          { user_id: userAId, friend_id: userBId },
          { user_id: userBId, friend_id: userAId },
        ],
      },
    });
  },
};
