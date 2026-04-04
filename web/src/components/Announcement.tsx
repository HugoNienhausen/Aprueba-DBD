import { useState } from "react";

const ANNOUNCEMENT_ID = "announcement-2026-04-05";
const SHOW_DATE = "2026-04-05";

export default function Announcement() {
  const [visible, setVisible] = useState(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
        <button type="button" className="btn btn--primary announcement__btn" onClick={dismiss}>
          Tancar
        </button>
      </div>
    </div>
  );
}
