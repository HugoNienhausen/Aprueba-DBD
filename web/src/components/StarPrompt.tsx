import { useState } from "react";

const GITHUB_REPO = "https://github.com/HugoNienhausen/Aprueba-DBD";
const STAR_CLICKED = "star-clicked";
const STAR_DISMISS_COUNT = "star-dismiss-count";
const STAR_LAST_SHOWN = "star-last-shown";
const TESTS_COMPLETED = "star-tests-completed";
const MIN_HOURS_BETWEEN = 2;

/** Increment completed test counter. Call from ResultScreen. */
export function recordTestCompleted(): void {
  const count = Number(localStorage.getItem(TESTS_COMPLETED) ?? "0") + 1;
  localStorage.setItem(TESTS_COMPLETED, String(count));
}

/** Decide if the star prompt should show. */
export function shouldShowStar(percentage: number): boolean {
  if (localStorage.getItem(STAR_CLICKED) === "1") return false;

  const testsCompleted = Number(localStorage.getItem(TESTS_COMPLETED) ?? "0");
  const dismissCount = Number(localStorage.getItem(STAR_DISMISS_COUNT) ?? "0");
  const lastShown = Number(localStorage.getItem(STAR_LAST_SHOWN) ?? "0");
  const hoursSinceLast = (Date.now() - lastShown) / 3600000;

  // First time: show after 3rd test with decent score
  if (dismissCount === 0 && testsCompleted >= 3 && percentage >= 50) return true;

  // After dismissals: respect cooldown, show every ~5 tests
  if (dismissCount > 0 && hoursSinceLast >= MIN_HOURS_BETWEEN) {
    if (testsCompleted % 5 === 0 && percentage >= 60) return true;
    if (percentage >= 80) return true;
  }

  return false;
}

const MESSAGES = [
  "T'ha anat bé! Dona suport al projecte perquè segueixi actiu pel segon parcial.",
  "Bona feina! Si t'està ajudant, dona-li una estrella a GitHub.",
  "Segueix així! Una estrella a GitHub ens ajuda molt.",
  "Gran sessió! Ajuda'ns a arribar a més companys amb una estrella.",
];

interface StarPromptProps {
  percentage: number;
}

export default function StarPrompt({ percentage }: StarPromptProps) {
  const [visible, setVisible] = useState(true);
  const [thanked, setThanked] = useState(false);

  if (!visible) return null;

  const msg = percentage >= 80
    ? MESSAGES[0]
    : MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const handleClick = () => {
    localStorage.setItem(STAR_CLICKED, "1");
    setThanked(true);
    setTimeout(() => setVisible(false), 3000);
  };

  const handleDismiss = () => {
    const count = Number(localStorage.getItem(STAR_DISMISS_COUNT) ?? "0") + 1;
    localStorage.setItem(STAR_DISMISS_COUNT, String(count));
    localStorage.setItem(STAR_LAST_SHOWN, String(Date.now()));
    setVisible(false);
  };

  if (thanked) {
    return (
      <div className="star-prompt star-prompt--thanks">
        <p>Gràcies pel teu suport! 🎉</p>
      </div>
    );
  }

  return (
    <div className="star-prompt">
      <button type="button" className="star-prompt__close" onClick={handleDismiss} aria-label="Tancar">✕</button>
      <p className="star-prompt__text">{msg}</p>
      <a
        href={GITHUB_REPO}
        target="_blank"
        rel="noopener noreferrer"
        className="star-prompt__btn"
        onClick={handleClick}
      >
        <svg className="star-prompt__gh" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.63-.735-3.63-.735-.39-.99-.96-1.255-.96-1.255-.78-.53.06-.52.06-.52.765.055 1.17.795 1.17.795.765 1.305 2.025.93 2.52.71.075-.555.3-.93.54-1.14-1.875-.21-3.855-.945-3.855-4.215 0-.93.33-1.695.87-2.295-.09-.21-.375-1.065.09-2.22 0 0 .705-.225 2.31.855.675-.195 1.395-.285 2.115-.285.72 0 1.44.09 2.115.285 1.605-1.08 2.31-.855 2.31-.855.465 1.155.18 2.01.09 2.22.54.6.87 1.365.87 2.295 0 3.27-1.95 4.005-3.81 4.215.3.255.57.765.57 1.53 0 1.11-.015 2.01-.015 2.28 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        ⭐ Dona-li una estrella a GitHub
      </a>
    </div>
  );
}
