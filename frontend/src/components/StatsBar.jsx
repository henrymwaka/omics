// frontend/src/components/Toast.jsx
import "../App.css";

function Toast({ toast, onClose }) {
  if (!toast || !toast.message) return null;

  return (
    <div className={`toast toast-${toast.type || "info"}`}>
      <span>{toast.message}</span>
      <button type="button" className="toast-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

export default Toast;
