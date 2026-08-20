import type { Room } from "./room.types";

export class RoomService {
  private rooms = new Map<string, Room>();

  createRoom(roomId: string) {
    const existingRoom = this.rooms.get(roomId);

    if (existingRoom) {
      return existingRoom;
    }

    const room: Room = {
      id: roomId,
      participants: new Set(),
      screenSharerId: null,
    };

    this.rooms.set(roomId, room);

    return room;
  }

  joinRoom(roomId: string, userId: string) {
    const room = this.createRoom(roomId);

    room.participants.add(userId);

    return room;
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    room.participants.delete(userId);

    if (room.screenSharerId === userId) {
      room.screenSharerId = null;
    }

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  requestScreenShare(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return {
        allowed: false,
        reason: "ROOM_NOT_FOUND",
      };
    }

    if (!room.participants.has(userId)) {
      return {
        allowed: false,
        reason: "USER_NOT_IN_ROOM",
      };
    }

    if (room.screenSharerId && room.screenSharerId !== userId) {
      return {
        allowed: false,
        reason: "SCREEN_ALREADY_SHARED",
        screenSharerId: room.screenSharerId,
      };
    }

    room.screenSharerId = userId;

    return {
      allowed: true,
    };
  }

  stopScreenShare(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    if (room.screenSharerId !== userId) {
      return false;
    }

    room.screenSharerId = null;

    return true;
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }
}
