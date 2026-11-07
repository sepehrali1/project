import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

const CODE_SAMPLE = [
  "-- SSBLOX • Auto Farm",
  'local Players = game:GetService("Players")',
  "local player = Players.LocalPlayer",
  "",
  "local function startFarm()",
  "    while task.wait(0.5) do",
  "        for _, enemy in pairs(workspace.Enemies:GetChildren()) do",
  "            if enemy.Health > 0 then",
  "                player.Character.Humanoid:MoveTo(enemy.Position)",
  "            end",
  "        end",
  "    end",
  "end",
  "",
  "startFarm()",
  'print("✓ SSBLOX loaded")',
].join("\n");

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-blob hero-blob-red" />
        <div className="hero-blob hero-blob-purple" />
        <div className="hero-grid" />
      </div>

      <div className="container hero-inner">
        <div className="hero-content">
          <span className="hero-badge">
            <Sparkles size={14} />
            پلتفرم شماره یک اسکریپت‌های Roblox فارسی
          </span>

          <h1 className="hero-title">
            دنیای <span className="gradient-text">اسکریپت‌های</span>
            <br />
            Roblox
          </h1>

          <p className="hero-subtitle">
            هزاران اسکریپت Luau رایگان، امن و آزمایش‌شده. پیدا کن، بررسی کن و
            استفاده کن — بدون نیاز به دانش برنامه‌نویسی.
          </p>

          <div className="hero-actions">
            <Link to="/scripts" className="btn btn-primary btn-lg">
              مرور اسکریپت‌ها
              <ArrowLeft size={18} />
            </Link>
            <Link to="/register" className="btn btn-outline btn-lg">
              عضویت رایگان
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="code-card">
            <div className="code-card-header">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
              <span className="code-card-title">auto-farm.luau</span>
            </div>
            <pre className="code-card-body">{CODE_SAMPLE}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}