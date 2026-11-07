import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, X } from "lucide-react";
import ScriptCard from "../components/ScriptCard";
import { fetchScripts } from "../lib/scriptsApi";
import type { ScriptItem } from "../types/script";
import { categories } from "../data/categories";
import { useAuth } from "../contexts/AuthContext";
import { describeError } from "../lib/api";
import { toPersianDigits } from "../utils/format";

export default function Scripts() {
  const { user } = useAuth();
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "trending" || sortParam === "views" ? sortParam : "new";

  function updateParam(key: "category" | "sort", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, sort]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchScripts({
      search: debouncedSearch,
      category,
      sort,
      page,
      pageSize: 12,
    })
      .then((res) => {
        if (!mounted) return;
        setItems(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(describeError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedSearch, category, sort, page]);

  return (
    <div className="scripts-page">
      <div className="container">
        <div className="scripts-header">
          <div>
            <h1 className="section-title">اسکریپت‌ها</h1>
            <p className="section-subtitle">
              {total > 0
                ? toPersianDigits(total) + " اسکریپت پیدا شد"
                : "جستجو یا مرور کنید"}
            </p>
          </div>
          {user && (
            <Link to="/scripts/new" className="btn btn-primary">
              <Plus size={18} />
              اسکریپت جدید
            </Link>
          )}
        </div>

        <div className="scripts-filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="جستجوی اسکریپت..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                aria-label="پاک کردن"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="filter-select"
            value={category}
            onChange={(e) => updateParam("category", e.target.value)}
          >
            <option value="">همه‌ی دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
          >
            <option value="new">جدیدترین</option>
            <option value="trending">محبوب‌ترین</option>
            <option value="views">پربازدیدترین</option>
          </select>
        </div>

        {error && <div className="form-error">{error}</div>}

        {loading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>در حال بارگذاری...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>اسکریپتی یافت نشد</p>
            {user && (
              <Link to="/scripts/new" className="btn btn-primary">
                اولین اسکریپت را منتشر کن
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="scripts-grid">
              {items.map((s) => (
                <ScriptCard key={s.id} script={s} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  قبلی
                </button>
                <span className="pagination-info">
                  صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  بعدی
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}