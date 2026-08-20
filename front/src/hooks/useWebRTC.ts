import { useEffect, useRef, useState } from "react";

import { socket } from "../services/socket";
import { WebRTCService } from "../services/webrtc";

import type {
  AnswerMessage,
  IceCandidateMessage,
  OfferMessage,
} from "../types/signaling";

export interface Participant {
  userId: string;
  name: string;
}

export function useWebRTC(roomId: string) {
  const [connected, setConnected] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [screenShareDenied, setScreenShareDenied] = useState<string | null>(
    null,
  );

  const [participants, setParticipants] = useState<Map<string, string>>(
    new Map(),
  );

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const webRTC = useRef<WebRTCService | null>(null);

  useEffect(() => {
    webRTC.current = new WebRTCService(
      /**
       * Stream remoto
       */
      (userId, stream) => {
        setRemoteStreams((currentStreams) => {
          const updatedStreams = new Map(currentStreams);

          updatedStreams.set(userId, stream);

          return updatedStreams;
        });
      },

      /**
       * Stream local
       */
      (stream) => {
        setLocalStream(stream);
      },

      /**
       * Compartilhamento encerrado pelo navegador
       */
      () => {
        if (!roomId) {
          return;
        }

        console.log("Compartilhamento encerrado externamente.");

        socket.emit("stop-screen-share", roomId);
      },
    );

    function handleConnect() {
      console.log("Conectado ao servidor:", socket.id);

      setConnected(true);
      setConnectionStatus("connected");
    }

    function handleDisconnect() {
      console.log("Desconectado do servidor.");

      setConnected(false);
      setConnectionStatus("disconnected");
    }

    /**
     * Recebe a lista completa de participantes
     * quando entra na sala.
     */
    function handleRoomParticipants(users: Participant[]) {
      const participantsMap = new Map<string, string>();

      for (const user of users) {
        participantsMap.set(user.userId, user.name);
      }

      setParticipants(participantsMap);
    }

    /**
     * Novo usuário entrou.
     */
    async function handleUserJoined({
      userId,
      name,
    }: {
      userId: string;
      name: string;
    }) {
      console.log(
        `[USER-JOINED] ${socket.id} recebeu entrada de ${name} (${userId})`,
      );

      setParticipants((current) => {
        const updated = new Map(current);

        updated.set(userId, name);

        return updated;
      });

      /**
       * Cria a conexão WebRTC com o novo usuário.
       */
      await webRTC.current?.createOffer(userId);
    }

    /**
     * Usuário saiu.
     */
    function handleUserLeft(userId: string) {
      console.log(`[USER-LEFT] ${socket.id} perdeu conexão com ${userId}`);

      setParticipants((current) => {
        const updated = new Map(current);

        updated.delete(userId);

        return updated;
      });

      /**
       * Remove a conexão WebRTC.
       */
      webRTC.current?.removePeerConnection(userId);

      /**
       * Remove eventual stream remoto.
       */
      setRemoteStreams((currentStreams) => {
        const updatedStreams = new Map(currentStreams);

        updatedStreams.delete(userId);

        return updatedStreams;
      });
    }

    /**
     * Compartilhamento negado.
     */
    function handleScreenShareDenied({ reason }: { reason: string }) {
      console.log("Compartilhamento negado:", reason);

      setScreenShareDenied(reason);
    }

    /**
     * Compartilhamento autorizado.
     */
    async function handleScreenShareApproved() {
      console.log("Compartilhamento de tela autorizado!");

      setScreenShareDenied(null);

      try {
        await webRTC.current?.startScreenShare();
      } catch (error) {
        console.error("Erro ao iniciar compartilhamento:", error);
      }
    }

    /**
     * Outro usuário encerrou o compartilhamento.
     */
    function handleScreenShareStopped({ userId }: { userId: string }) {
      console.log(
        `[SCREEN-STOPPED] Compartilhamento de ${userId} foi encerrado`,
      );

      /**
       * Se fui eu quem estava compartilhando,
       * significa que outro usuário tomou
       * o compartilhamento.
       */
      if (userId === socket.id) {
        webRTC.current?.stopScreenShare();

        return;
      }

      /**
       * Remove a stream remota do usuário
       * que parou de compartilhar.
       */
      setRemoteStreams((currentStreams) => {
        const updatedStreams = new Map(currentStreams);

        updatedStreams.delete(userId);

        return updatedStreams;
      });
    }

    /**
     * Offer WebRTC.
     */
    async function handleOffer(message: OfferMessage) {
      console.log("Offer recebida de:", message.sender);

      await webRTC.current?.handleOffer(message.sender, message.offer);
    }

    /**
     * Answer WebRTC.
     */
    async function handleAnswer(message: AnswerMessage) {
      console.log("Answer recebida de:", message.sender);

      await webRTC.current?.handleAnswer(message.sender, message.answer);
    }

    /**
     * ICE Candidate WebRTC.
     */
    async function handleIceCandidate(message: IceCandidateMessage) {
      console.log("ICE candidate recebido de:", message.sender);

      await webRTC.current?.handleIceCandidate(
        message.sender,
        message.candidate,
      );
    }

    socket.on("connect", handleConnect);

    socket.on("disconnect", handleDisconnect);

    socket.on("room-participants", handleRoomParticipants);

    socket.on("user-joined", handleUserJoined);

    socket.on("user-left", handleUserLeft);

    socket.on("screen-share-denied", handleScreenShareDenied);

    socket.on("screen-share-approved", handleScreenShareApproved);

    socket.on("screen-share-stopped", handleScreenShareStopped);

    socket.on("offer", handleOffer);

    socket.on("answer", handleAnswer);

    socket.on("ice-candidate", handleIceCandidate);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);

      socket.off("disconnect", handleDisconnect);

      socket.off("room-participants", handleRoomParticipants);

      socket.off("user-joined", handleUserJoined);

      socket.off("user-left", handleUserLeft);

      socket.off("screen-share-denied", handleScreenShareDenied);

      socket.off("screen-share-approved", handleScreenShareApproved);

      socket.off("screen-share-stopped", handleScreenShareStopped);

      socket.off("offer", handleOffer);

      socket.off("answer", handleAnswer);

      socket.off("ice-candidate", handleIceCandidate);

      webRTC.current?.destroy();

      webRTC.current = null;
    };
  }, [roomId]);

  /**
   * Solicita compartilhamento de tela.
   */
  function requestScreenShare() {
    if (!roomId) {
      console.warn("É necessário entrar em uma sala.");

      return;
    }

    console.log("Solicitando compartilhamento...");

    setScreenShareDenied(null);

    socket.emit("request-screen-share", roomId);
  }

  /**
   * Para o compartilhamento.
   */
  function stopScreenShare() {
    if (!roomId) {
      return;
    }

    webRTC.current?.stopScreenShare();

    socket.emit("stop-screen-share", roomId);
  }

  return {
    connected,
    connectionStatus,
    remoteStreams,
    localStream,
    screenShareDenied,
    participants,
    requestScreenShare,
    stopScreenShare,
  };
}
