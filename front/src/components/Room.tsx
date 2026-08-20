import { useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { ScreenViewer } from "./ScreenViewer";
import { RoomControls } from "./RoomControls";
import { ParticipantList } from "./ParticipantList";
import { socket } from "../services/socket";
import { ServerStatus } from "./ServerStatus";

export function Room() {
  const [roomId, setRoomId] = useState("");
  const [joinedRoomId, setJoinedRoomId] = useState("");
  const [name, setName] = useState("");

  const {
    connected,
    connectionStatus,
    remoteStreams,
    localStream,
    screenShareDenied,
    participants,
    requestScreenShare,
    stopScreenShare,
  } = useWebRTC(joinedRoomId);

  function joinRoom() {
    const room = roomId.trim();
    const userName = name.trim();

    if (!room || !userName) {
      return;
    }

    console.log(
      "[ROOM] Emitindo join-room:",
      room,
      "socket:",
      socket.id,
      "name:",
      userName,
    );

    socket.emit("join-room", {
      roomId: room,
      name: userName,
    });

    setJoinedRoomId(room);
  }

  function handleStartScreenShare() {
    if (!joinedRoomId) {
      console.warn("Entre em uma sala antes de compartilhar a tela.");
      return;
    }

    console.log("[ROOM] Solicitando compartilhamento...");

    requestScreenShare();
  }

  function handleStopScreenShare() {
    if (!joinedRoomId) {
      return;
    }

    console.log("[ROOM] Parando compartilhamento...");

    stopScreenShare();
  }

  const remoteScreen = Array.from(remoteStreams.entries())[0];

  const remoteUserId = remoteScreen?.[0];
  const remoteStream = remoteScreen?.[1];

  const remoteUserName = remoteUserId
    ? participants.get(remoteUserId)
    : undefined;

  if (!joinedRoomId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl text-zinc-950 shadow-2xl">
              ◉
            </div>

            <h1 className="text-3xl font-bold tracking-tight">WatchLarys</h1>

            <p className="mt-2 text-sm text-zinc-500">
              Compartilhe sua tela de forma simples e rápida.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Nickname
                </label>

                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu Nickname"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:ring-2 focus:ring-white/5"
                />
              </div>

              <div>
                <label
                  htmlFor="room"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Código da Sala
                </label>

                <input
                  id="room"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      joinRoom();
                    }
                  }}
                  placeholder="Ex: 000-JKL"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:ring-2 focus:ring-white/5"
                />
              </div>

              <button
                onClick={joinRoom}
                disabled={!connected}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Entrar na sala
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-zinc-600">
            Nenhuma conta é necessária.
          </p>
          <p className="mt-5 flex justify-center">
            <ServerStatus status={connectionStatus} />
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/80 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-zinc-950">
            ◉
          </div>

          <div>
            <h1 className="text-sm font-semibold">WatchLarys</h1>

            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />

              <span className="text-xs text-zinc-500">
                {connected ? "Conectado" : "Desconectado"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400 sm:block">
            Sala{" "}
            <span className="font-medium text-zinc-200">{joinedRoomId}</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs text-zinc-400">👥</span>

            <span className="text-xs font-medium text-zinc-200">
              {participants.size + 1}
            </span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-4">
            {remoteStream ? (
              <ScreenViewer
                stream={remoteStream}
                participantName={remoteUserName}
              />
            ) : (
              <ScreenViewer stream={localStream} isLocal />
            )}
          </div>

          {screenShareDenied && (
            <div className="mx-4 mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Não foi possível compartilhar a tela: {screenShareDenied}
            </div>
          )}

          <div className="border-t border-white/10 bg-zinc-950/80 px-4 py-4 backdrop-blur-xl">
            <RoomControls
              isSharing={!!localStream}
              onStart={handleStartScreenShare}
              onStop={handleStopScreenShare}
            />
          </div>
        </section>

        <div className="hidden lg:block">
          <ParticipantList
            participants={participants}
            currentUserId={socket.id}
          />
        </div>
      </div>
    </main>
  );
}
