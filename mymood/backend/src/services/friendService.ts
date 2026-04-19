import { friendRepository } from '../repositories/friendRepository';

export const friendService = {
  async getMyFriends(myId: string) {
    const friendships = await friendRepository.getAcceptedFriendships(myId);
    return friendships.map((f: any) => {
      const isSender = f.user_id === myId;
      return isSender
        ? f.users_friendships_friend_idTousers
        : f.users_friendships_user_idTousers;
    });
  },

  async getPendingRequests(myId: string) {
    const data = await friendRepository.getPendingRequests(myId);
    return data.map((f: any) => ({
      senderId: f.user_id,
      sender: f.users_friendships_user_idTousers,
    }));
  },

  async getSentRequests(myId: string) {
    const data = await friendRepository.getSentRequests(myId);
    return data.map((f: any) => ({
      receiverId: f.friend_id,
      receiver: f.users_friendships_friend_idTousers,
    }));
  },

  async rejectOrCancelRequest(myId: string, targetId: string) {
    return friendRepository.deleteRelationship(myId, targetId);
  },
};
