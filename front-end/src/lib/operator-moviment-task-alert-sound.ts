/** Ringtone tocado quando chega tarefa nova na fila do transporte. */
export const OPERATOR_MOVIMENT_NEW_TASK_SOUND_URL =
  '/sound-effect/universfield-ringtone-070-496271.mp3';

const MAX_PLAYS = 1;

let audio: HTMLAudioElement | null = null;
let playsRemaining = 0;
let stopped = true;
let unlocked = false;

function clearAudio() {
  if (!audio) {
    return;
  }
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.src = '';
  audio = null;
}

function playNext() {
  if (stopped || playsRemaining <= 0) {
    clearAudio();
    return;
  }

  playsRemaining -= 1;
  clearAudio();

  const next = new Audio(OPERATOR_MOVIMENT_NEW_TASK_SOUND_URL);
  audio = next;
  next.volume = 1;
  next.onended = () => {
    if (!stopped && playsRemaining > 0) {
      playNext();
    } else {
      clearAudio();
    }
  };
  next.onerror = () => {
    clearAudio();
  };

  void next.play().catch(() => {
    // Autoplay pode ser bloqueado até haver gesto do usuário.
    clearAudio();
  });
}

/** Libera reprodução automática após o primeiro gesto (política do browser). */
export function unlockOperatorMovimentTaskAlertSound(): void {
  if (unlocked || typeof window === 'undefined') {
    return;
  }
  unlocked = true;
  const probe = new Audio(OPERATOR_MOVIMENT_NEW_TASK_SOUND_URL);
  probe.volume = 0;
  void probe
    .play()
    .then(() => {
      probe.pause();
      probe.src = '';
    })
    .catch(() => {
      unlocked = false;
    });
}

/** Toca o ringtone uma vez (reinicia se outra tarefa nova chegar enquanto toca). */
export function startOperatorMovimentTaskAlertSound(): void {
  stopped = false;
  playsRemaining = MAX_PLAYS;
  playNext();
}

/** Interrompe o alerta (ex.: tarefa aceita ou fila esvaziou). */
export function stopOperatorMovimentTaskAlertSound(): void {
  stopped = true;
  playsRemaining = 0;
  clearAudio();
}

export function isOperatorMovimentTaskAlertSoundPlaying(): boolean {
  return !stopped && (playsRemaining > 0 || audio != null);
}
