// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
//import "./styles/theme_modern.css";
// To try others later:
// import "./styles/theme_classic.css";
// import "./styles/theme_minimal.css";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
