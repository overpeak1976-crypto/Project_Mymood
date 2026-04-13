import { userRepository } from '../repositories/userRepository';

export const userService = {
  async searchByHandle(handle: string) {
    return userRepository.searchByHandle(handle);
  },

  async addFriend(myId: string, targetUserId: string) {
    if (myId === targetUserId) {
      throw new Error('แอดตัวเองเป็นเพื่อนไม่ได้นะครับ');
    }
    try {
      return await userRepository.addFriendship(myId, targetUserId);
    } catch (err: any) {
      // Prisma unique constraint violation code
      if (err?.code === 'P2002') {
        throw new Error('ส่งคำขอไปแล้ว หรือเป็นเพื่อนกันอยู่แล้ว');
      }
      throw err;
    }
  },

  async acceptFriend(myId: string, senderId: string) {
    return userRepository.acceptFriendship(senderId, myId);
  },

  async getMyTopGenres(myId: string) {
    const history = await userRepository.getPlayHistory(myId);

    const genreCounts: { [key: string]: number } = {};
    history.forEach((item: any) => {
      const g = item.songs?.genre || 'Unknown';
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });

    const sortedGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return sortedGenres;
  },
};
