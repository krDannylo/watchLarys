interface ScreenShareControlsProps {
  isSharing: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ScreenShareControls({
  isSharing,
  onStart,
  onStop,
}: ScreenShareControlsProps) {
  async function handleClick() {
    try {
      if (isSharing) {
        onStop();
        return;
      }

      await onStart();
    } catch (error) {
      console.error("Erro ao compartilhar tela:", error);
    }
  }

  return (
    <button onClick={handleClick}>
      {isSharing ? "🛑 Parar compartilhamento" : "🖥️ Compartilhar tela"}
    </button>
  );
}
