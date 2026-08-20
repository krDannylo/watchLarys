interface ScreenShareProps {
  stream: MediaStream | null;
}

export function ScreenShare({ stream }: ScreenShareProps) {
  return (
    <section>
      <h2>Tela compartilhada</h2>

      <video
        autoPlay
        playsInline
        ref={(video) => {
          if (video) {
            video.srcObject = stream;
          }
        }}
        style={{
          width: "800px",
          maxWidth: "100%",
          background: "#000",
        }}
      />
    </section>
  );
}
