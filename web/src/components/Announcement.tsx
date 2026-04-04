import { useState } from "react";

const ANNOUNCEMENT_ID = "announcement-2026-04-05";
const SHOW_DATE = "2026-04-05";

export default function Announcement() {
  const [visible, setVisible] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== SHOW_DATE) return false;
    return localStorage.getItem(ANNOUNCEMENT_ID) !== "1";
  });

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_ID, "1");
    setVisible(false);
  };

  return (
    <div className="announcement-overlay" onClick={dismiss}>
      <div className="announcement" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="announcement__close" onClick={dismiss} aria-label="Tancar">✕</button>
        <h2 className="announcement__title">Novetats d'ApruebaDBD!</h2>
        <img src="/announcement.png" alt="50 usuaris diaris" className="announcement__img" />
        <p className="announcement__text">
          Ja som una mitjana de <strong>50 usuaris practicant cada dia</strong> els tests de DBD!
        </p>
        <p className="announcement__text">Avui hem afegit:</p>
        <ul className="announcement__list">
          <li>⚡ <strong>Mode Flash</strong> — preguntes ràpides sense explicacions</li>
          <li>🆕 <strong>Preguntes no intentades</strong> — descobreix les que encara no has fet</li>
        </ul>
        <button type="button" className="btn btn--primary announcement__btn" onClick={dismiss}>
          Entesos, a estudiar!
        </button>
      </div>
    </div>
  );
}
