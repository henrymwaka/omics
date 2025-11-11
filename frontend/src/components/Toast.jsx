// src/components/Toast.jsx
import { useEffect, useState } from "react";
import "../App.css";

function Toast({ message, type = "info", duration = 3000, onClose }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setFade(true), duration - 400);
    const closer = setTimeout(() => onClose && onClose(), duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(closer);
    };
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}${fade ? " fade-out" : ""}`}>
      {message}
    </div>
  );
}

export default Toast;
