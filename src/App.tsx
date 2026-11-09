import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Scripts from "./pages/Scripts";
import ScriptDetail from "./pages/ScriptDetail";
import NewScript from "./pages/NewScript";
import MyScripts from "./pages/MyScripts";
import Admin from "./pages/Admin";
import Owner from "./pages/Owner";
import Leaderboard from "./pages/Leaderboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import LegalPage from "./pages/LegalPage";
import Messages from "./pages/Messages";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/scripts/new" element={<ProtectedRoute><NewScript /></ProtectedRoute>} />
          <Route path="/scripts/:id/edit" element={<ProtectedRoute><NewScript /></ProtectedRoute>} />
          <Route path="/scripts/:id" element={<ScriptDetail />} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:userId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route
            path="/my-scripts"
            element={
              <ProtectedRoute>
                <MyScripts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute minRole="moderator">
                <Admin />
              </RoleRoute>
            }
          />
          <Route
            path="/owner"
            element={
              <RoleRoute minRole="owner">
                <Owner />
              </RoleRoute>
            }
          />
          <Route
            path="*"
            element={<PlaceholderPage title="صفحه یافت نشد" notFound />}
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}