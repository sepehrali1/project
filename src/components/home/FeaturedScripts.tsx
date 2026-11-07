import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import ScriptCard from "../ScriptCard";
import { fetchScripts } from "../../lib/scriptsApi";
import type { ScriptItem } from "../../types/script";
import { useAuth } from "../../contexts/AuthContext";

export default function FeaturedScripts() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScripts({ sort: "trending", pageSize: 6 })
      .then((res) => setScripts(res?.items ?? []))
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section" id="scripts">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">اسکریپت‌های منتخب</h2>
            <p className="section-subtitle">
              {scripts.length > 0
                ? "محبوب‌ترین اسکریپت‌های اخیر"
                : "به‌زودی اینجا اسکریپت‌ها نمایش داده می‌شوند"}
            </p>
          </div>
          {scripts.length > 0 && (
            <Link to="/scripts" className="link-more">
              مشاهده همه
              <ArrowLeft size={16} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
          </div>
        ) : scripts.length === 0 ? (
          <div className="empty-state">
            <p>هنوز اسکریپتی منتشر نشده</p>
            {user ? (
              <Link to="/scripts/new" className="btn btn-primary">
                <Plus size={18} />
                اولین اسکریپت را منتشر کن
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary">
                عضو شو و اولین اسکریپت را بساز
              </Link>
            )}
          </div>
        ) : (
          <div className="scripts-grid">
            {scripts.map((s) => (
              <ScriptCard key={s.id} script={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}