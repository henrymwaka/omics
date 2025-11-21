// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute.jsx";

// Layout
import GlobalLayout from "./components/layout/GlobalLayout";

// Pages
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Wizard from "./pages/Wizard.jsx";

// Detail views
import ProjectDetailPage from "./components/ProjectDetailPage.jsx";
import SampleDetailPage from "./components/SampleDetailPage.jsx";

import "./App.css";


function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <GlobalLayout
              title="Projects and samples"
              subtitle="Browse projects, view samples, upload and inspect files"
            >
              <Dashboard />
            </GlobalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/wizard"
        element={
          <ProtectedRoute>
            <GlobalLayout
              title="Guided sample entry"
              subtitle="Create a project and register samples with the wizard"
            >
              <Wizard />
            </GlobalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <GlobalLayout title="Project detail">
              <ProjectDetailPage />
            </GlobalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sample/:id"
        element={
          <ProtectedRoute>
            <GlobalLayout title="Sample detail">
              <SampleDetailPage />
            </GlobalLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}


function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
