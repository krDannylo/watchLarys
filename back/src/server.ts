import { createServer } from "node:http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 3000;
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const socketRooms = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on(
    "join-room",
    ({ roomId, name }: { roomId: string; name: string }) => {
      const normalizedRoomId = roomId.trim();
      const normalizedName = name.trim();

      if (!normalizedRoomId || !normalizedName) {
        return;
      }

      socket.data.name = normalizedName;

      const currentRoom = socketRooms.get(socket.id);

      if (currentRoom === normalizedRoomId) {
        console.log(
          `[JOIN] ${socket.data.name} (${socket.id}) já está na sala ${normalizedRoomId}`,
        );

        return;
      }

      if (currentRoom) {
        socket.to(currentRoom).emit("user-left", socket.id);

        socket.leave(currentRoom);

        console.log(
          `[LEAVE] ${socket.data.name} (${socket.id}) saiu da sala ${currentRoom}`,
        );
      }

      socket.join(normalizedRoomId);

      socketRooms.set(socket.id, normalizedRoomId);

      const participants = Array.from(
        io.sockets.adapter.rooms.get(normalizedRoomId) ?? [],
      )
        .filter((userId) => userId !== socket.id)
        .map((userId) => {
          const participantSocket = io.sockets.sockets.get(userId);

          return {
            userId,
            name: participantSocket?.data.name ?? "Participante",
          };
        });

      socket.emit("room-participants", participants);

      console.log(
        `[JOIN] ${socket.data.name} (${socket.id}) entrou na sala ${normalizedRoomId}`,
      );

      socket.to(normalizedRoomId).emit("user-joined", {
        userId: socket.id,
        name: socket.data.name,
      });
    },
  );

  socket.on("screen-share-denied", ({ reason }) => {
    console.log(
      `[SCREEN SHARE] ${socket.id} negou compartilhamento: ${reason}`,
    );
  });

  socket.on("request-screen-share", (roomId: string) => {
    const normalizedRoomId = roomId.trim();

    if (!normalizedRoomId) {
      return;
    }

    const roomSockets = io.sockets.adapter.rooms.get(normalizedRoomId);

    if (!roomSockets) {
      return;
    }

    const sharingSocketId = Array.from(roomSockets).find((socketId) => {
      const clientSocket = io.sockets.sockets.get(socketId);

      return clientSocket?.data.isSharingScreen;
    });

    /**
     * Ninguém está compartilhando.
     */
    if (!sharingSocketId) {
      socket.data.isSharingScreen = true;

      console.log(
        `[SCREEN SHARE] ${socket.data.name} (${socket.id}) iniciou compartilhamento na sala ${normalizedRoomId}`,
      );

      socket.emit("screen-share-approved");

      return;
    }

    /**
     * O próprio usuário já é o compartilhador.
     */
    if (sharingSocketId === socket.id) {
      console.log(
        `[SCREEN SHARE] ${socket.data.name} (${socket.id}) já está compartilhando na sala ${normalizedRoomId}`,
      );

      return;
    }

    const sharingSocket = io.sockets.sockets.get(sharingSocketId);

    if (!sharingSocket) {
      return;
    }

    console.log(
      `[SCREEN SHARE] ${socket.data.name} (${socket.id}) tomou o compartilhamento de ${sharingSocket.data.name} (${sharingSocketId})`,
    );

    /**
     * Avisa o usuário anterior que ele perdeu
     * o compartilhamento.
     */
    io.to(normalizedRoomId).emit("screen-share-stopped", {
      userId: sharingSocketId,
    });

    /**
     * Libera o compartilhamento anterior.
     */
    sharingSocket.data.isSharingScreen = false;

    /**
     * Define o novo compartilhador.
     */
    socket.data.isSharingScreen = true;

    /**
     * Autoriza o novo compartilhador.
     */
    socket.emit("screen-share-approved");
  });

  socket.on("stop-screen-share", (roomId: string) => {
    const normalizedRoomId = roomId.trim();

    if (!normalizedRoomId) {
      return;
    }

    socket.data.isSharingScreen = false;

    console.log(
      `[SCREEN SHARE] ${socket.data.name} (${socket.id}) encerrou o compartilhamento na sala ${normalizedRoomId}`,
    );

    socket.to(normalizedRoomId).emit("screen-share-stopped", {
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

    const roomId = socketRooms.get(socket.id);

    if (roomId) {
      /**
       * Se estava compartilhando tela,
       * avisa os outros participantes.
       */
      if (socket.data.isSharingScreen) {
        socket.data.isSharingScreen = false;

        socket.to(roomId).emit("screen-share-stopped", {
          userId: socket.id,
        });

        console.log(
          `[SCREEN SHARE] ${socket.data.name} (${socket.id}) encerrou o compartilhamento ao desconectar`,
        );
      }

      /**
       * Avisa os outros participantes
       * que esse usuário saiu.
       */
      socket.to(roomId).emit("user-left", socket.id);

      console.log(
        `[LEAVE] ${socket.data.name} (${socket.id}) saiu da sala ${roomId}`,
      );
    }

    socketRooms.delete(socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling server rodando na porta ${PORT}`);
});
