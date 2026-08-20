import { socket } from "./socket";

export class WebRTCService {
  private peerConnections = new Map<string, RTCPeerConnection>();

  private localStream: MediaStream | null = null;

  private onRemoteStream?: (userId: string, stream: MediaStream) => void;

  private onLocalStream?: (stream: MediaStream | null) => void;

  private onScreenShareStopped?: () => void;

  constructor(
    onRemoteStream?: (userId: string, stream: MediaStream) => void,

    onLocalStream?: (stream: MediaStream | null) => void,

    onScreenShareStopped?: () => void,
  ) {
    this.onRemoteStream = onRemoteStream;
    this.onLocalStream = onLocalStream;
    this.onScreenShareStopped = onScreenShareStopped;
  }

  createPeerConnection(target: string) {
    const existingPeer = this.peerConnections.get(target);

    if (existingPeer) {
      return existingPeer;
    }

    // console.log(`Criando PeerConnection para ${target}`);

    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      socket.emit("ice-candidate", {
        target,
        candidate: event.candidate,
      });
    };

    peer.onconnectionstatechange = () => {
      // console.log(`Estado WebRTC [${target}]:`, peer.connectionState);

      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "closed"
      ) {
        this.removePeerConnection(target);
      }
    };

    peer.ontrack = (event) => {
      // console.log(`Stream remoto recebido de ${target}!`);

      const [stream] = event.streams;

      if (!stream) {
        return;
      }

      this.onRemoteStream?.(target, stream);
    };

    /**
     * Quando uma nova track é adicionada à
     * PeerConnection, precisamos renegociar.
     *
     * Isso acontece quando começamos a
     * compartilhar a tela.
     */
    peer.onnegotiationneeded = async () => {
      try {
        // console.log(`[NEGOTIATION] Necessária com ${target}`);

        const offer = await peer.createOffer();

        await peer.setLocalDescription(offer);

        socket.emit("offer", {
          target,
          offer,
        });

        // console.log(`[NEGOTIATION] Offer enviada para ${target}`);
      } catch (error) {
        // console.error(`[NEGOTIATION] Erro com ${target}:`, error);
      }
    };

    this.peerConnections.set(target, peer);

    /**
     * Se já estamos compartilhando a tela quando
     * uma nova pessoa entra, adicionamos as tracks
     * imediatamente nessa PeerConnection.
     */
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peer.addTrack(track, this.localStream!);
      });
    }

    return peer;
  }

  async createOffer(target: string) {
    const peer = this.createPeerConnection(target);

    const offer = await peer.createOffer();

    await peer.setLocalDescription(offer);

    socket.emit("offer", {
      target,
      offer,
    });
  }

  async handleOffer(sender: string, offer: RTCSessionDescriptionInit) {
    const peer = this.createPeerConnection(sender);

    await peer.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);

    socket.emit("answer", {
      target: sender,
      answer,
    });
  }

  async handleAnswer(sender: string, answer: RTCSessionDescriptionInit) {
    const peer = this.peerConnections.get(sender);

    if (!peer) {
      console.warn(`PeerConnection não encontrada para ${sender}`);

      return;
    }

    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(sender: string, candidate: RTCIceCandidateInit) {
    const peer = this.peerConnections.get(sender);

    if (!peer) {
      console.warn(`PeerConnection não encontrada para ${sender}`);

      return;
    }

    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Erro ao adicionar ICE candidate:", error);
    }
  }

  async startScreenShare() {
    if (this.localStream) {
      console.warn("Já existe uma tela sendo compartilhada.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "window",
        },
        audio: true,
      });

      this.localStream = stream;

      /**
       * Mostra a tela localmente.
       *
       * Isso funciona mesmo se não houver
       * nenhuma outra pessoa na sala.
       */
      this.onLocalStream?.(stream);

      /**
       * Se existem outros participantes,
       * adiciona a tela em cada PeerConnection.
       */
      for (const [userId, peer] of this.peerConnections) {
        console.log(`[SCREEN] Adicionando tela para ${userId}`);

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });
      }

      /**
       * Detecta quando o usuário encerra o compartilhamento
       * pelo próprio navegador.
       */
      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          // console.log("Compartilhamento encerrado pelo usuário.");

          this.stopScreenShare();

          this.onScreenShareStopped?.();
        };
      }

      // console.log(
      //   `[SCREEN] Compartilhamento de tela iniciado. Participantes: ${this.peerConnections.size}`,
      // );
    } catch (error) {
      /**
       * O usuário pode simplesmente ter fechado/cancelado
       * o seletor de compartilhamento.
       */
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        // console.log("Compartilhamento de tela cancelado pelo usuário.");

        return;
      }

      // console.error("Erro ao iniciar compartilhamento:", error);
    }
  }

  stopScreenShare() {
    if (!this.localStream) {
      return;
    }

    this.localStream.getTracks().forEach((track) => {
      track.stop();
    });

    this.localStream = null;

    this.onLocalStream?.(null);

    // console.log("Compartilhamento de tela encerrado.");
  }

  removePeerConnection(userId: string) {
    const peer = this.peerConnections.get(userId);

    if (!peer) {
      return;
    }

    // console.log(`Removendo conexão com ${userId}`);

    peer.close();

    this.peerConnections.delete(userId);
  }

  removeRemoteUser(userId: string) {
    // console.log(`Usuário remoto removido: ${userId}`);

    this.removePeerConnection(userId);
  }

  destroy() {
    this.stopScreenShare();

    for (const [userId, peer] of this.peerConnections) {
      console.log(`Fechando conexão com ${userId}`);

      peer.close();
    }

    this.peerConnections.clear();
  }
}
