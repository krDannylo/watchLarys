import type { Server, Socket } from "socket.io";

import { RoomService } from "../rooms/room.service";

export function registerSignalingHandlers(
  io: Server,
  socket: Socket,
  roomService: RoomService,
) {
  socket.on("join-room", (roomId: string) => {
    const normalizedRoomId = roomId.trim();

    if (!normalizedRoomId) {
      return;
    }

    const currentRoom = socket.data.roomId as string | undefined;

    if (currentRoom === normalizedRoomId) {
      console.log(`[JOIN] ${socket.id} já está na sala ${normalizedRoomId}`);

      return;
    }

    // Se estiver em outra sala, remove da sala anterior.
    if (currentRoom) {
      socket.leave(currentRoom);

      roomService.leaveRoom(currentRoom, socket.id);

      socket.to(currentRoom).emit("user-left", socket.id);

      console.log(`[LEAVE] ${socket.id} saiu da sala ${currentRoom}`);
    }

    socket.join(normalizedRoomId);

    socket.data.roomId = normalizedRoomId;

    roomService.joinRoom(normalizedRoomId, socket.id);

    console.log(`[JOIN] ${socket.id} entrou na sala ${normalizedRoomId}`);

    socket.to(normalizedRoomId).emit("user-joined", socket.id);
  });

  socket.on("request-screen-share", (roomId: string) => {
    const result = roomService.requestScreenShare(roomId, socket.id);

    console.log(
      `[SCREEN SHARE] ${socket.id} iniciou solicitação na sala ${roomId}`,
    );

    if (!result.allowed) {
      socket.emit("screen-share-denied", {
        reason: result.reason,
        screenSharerId: result.screenSharerId,
      });

      return;
    }

    socket.emit("screen-share-approved");

    socket.to(roomId).emit("screen-share-started", {
      userId: socket.id,
    });
  });

  socket.on("stop-screen-share", (roomId: string) => {
    const stopped = roomService.stopScreenShare(roomId, socket.id);

    if (!stopped) {
      return;
    }

    console.log(
      `[SCREEN SHARE] ${socket.id} encerrou o compartilhamento na sala ${roomId}`,
    );

    socket.to(roomId).emit("screen-share-stopped", {
      userId: socket.id,
    });
  });

  socket.on("offer", ({ target, offer }) => {
    io.to(target).emit("offer", {
      sender: socket.id,
      offer,
    });
  });

  socket.on("answer", ({ target, answer }) => {
    io.to(target).emit("answer", {
      sender: socket.id,
      answer,
    });
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    io.to(target).emit("ice-candidate", {
      sender: socket.id,
      candidate,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);

    const roomId = socket.data.roomId as string | undefined;

    if (roomId) {
      const room = roomService.getRoom(roomId);

      const wasScreenSharer = room?.screenSharerId === socket.id;

      roomService.leaveRoom(roomId, socket.id);

      socket.to(roomId).emit("user-left", {
        userId: socket.id,
        wasScreenSharer,
      });

      console.log(`[LEAVE] ${socket.id} saiu da sala ${roomId}`);

      if (wasScreenSharer) {
        socket.to(roomId).emit("screen-share-stopped", {
          userId: socket.id,
        });

        console.log(
          `[SCREEN SHARE] ${socket.id} era o compartilhador e encerrou ao sair`,
        );
      }
    }
  });
}
