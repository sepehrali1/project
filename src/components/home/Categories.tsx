import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sprout, Zap, Eye, Swords, MapPin, Layout, Wrench, Boxes,
} from "lucide-react";
import { categories } from "../../data/categories";
import { toPersianDigits } from "../../utils/format";
import { fetchStats } from "../../lib/scriptsApi";
import type { Category } from "../../types";

const ICON_MAP: Record<Category["icon"], typeof Sprout> = {
  sprout: Sprout,
  zap: Zap,
  eye: Eye,
  swords: Swords,
  "map-pin": MapPin,
  layout: Layout,
  wrench: Wrench,
  boxes: Boxes,
};

export default function Categories() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStats()
      .then((s) => setCounts(s.by_category))
      .catch(() => setCounts({}));
  }, []);

  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">دسته‌بندی‌ها</h2>
            <p className="section-subtitle">
              اسکریپت مورد نیازت رو سریع‌تر پیدا کن.
            </p>
          </div>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon];
            const count = counts[cat.id] ?? 0;
            return (
              <Link
                key={cat.id}
                to={"/scripts?category=" + cat.id}
                className="category-card"
              >
                <div
                  className="category-icon"
                  style={{ background: cat.gradient }}
                >
                  <Icon size={22} />
                </div>
                <div className="category-info">
                  <h3>{cat.name}</h3>
                  <p>{cat.description}</p>
                </div>
                <span className="category-count">{toPersianDigits(count)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}