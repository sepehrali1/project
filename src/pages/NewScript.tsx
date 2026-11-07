import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Save, AlertCircle } from "lucide-react";
import {
  createScript,
  fetchScript,
  removeThumbnailByUrl,
  updateScript,
  uploadThumbnail,
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_TYPES,
} from "../lib/scriptsApi";
import { describeError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { categories } from "../data/categories";

export default function NewScript() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const editing = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "misc");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchScript(id)
      .then(({ script }) => {
        if (!active) return;
        if (!script.is_mine) {
          setError("فقط نویسنده می‌تواند اسکریپت را ویرایش کند.");
          return;
        }
        setTitle(script.title);
        setDescription(script.description);
        setCode(script.code);
        setCategory(script.category);
        setImageUrl(script.image_url ?? "");
        setOriginalImage(script.image_url);
      })
      .catch((err) => active && setError(describeError(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (picked && !THUMBNAIL_TYPES[picked.type]) {
      setError("فقط تصویر PNG، JPG یا WEBP مجاز است.");
      e.target.value = "";
      return;
    }
    if (picked && picked.size > THUMBNAIL_MAX_BYTES) {
      setError("حجم تصویر باید کمتر از ۲ مگابایت باشد.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);

    let uploadedUrl: string | null = null;
    try {
      let finalImage: string | null = imageUrl.trim() || null;
      if (file) {
        uploadedUrl = await uploadThumbnail(file, user.id);
        finalImage = uploadedUrl;
      }
      const payload = { title, description, code, category, image_url: finalImage };

      const res = id ? await updateScript(id, payload) : await createScript(payload);

      // the previous uploaded thumbnail is no longer used
      if (id && originalImage && originalImage !== finalImage) {
        removeThumbnailByUrl(originalImage).catch(() => undefined);
      }
      navigate("/scripts/" + res.script.id);
    } catch (err) {
      if (uploadedUrl) removeThumbnailByUrl(uploadedUrl).catch(() => undefined);
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="container">
        <div className="form-card">
          <h1>{editing ? "ویرایش اسکریپت" : "انتشار اسکریپت جدید"}</h1>
          <p className="form-subtitle">
            {editing
              ? "پس از ویرایش، اسکریپت دوباره توسط ناظر بررسی می‌شود (مگر ناظر/مالک باشید)."
              : "اسکریپت شما پس از تأیید ناظر منتشر می‌شود."}
          </p>

          {error && (
            <div className="form-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-grid">
            <label className="form-field">
              <span>عنوان</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً Auto Farm Blox Fruits"
                required
                minLength={3}
                maxLength={120}
              />
            </label>

            <label className="form-field">
              <span>دسته‌بندی</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field full">
              <span>آپلود تصویر (PNG / JPG / WEBP، حداکثر ۲ مگابایت)</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
            </label>

            <label className="form-field full">
              <span>یا لینک تصویر (اختیاری)</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                dir="ltr"
                maxLength={500}
              />
            </label>

            <label className="form-field full">
              <span>توضیحات</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="این اسکریپت چه کاری انجام می‌دهد؟"
                rows={4}
                required
                minLength={10}
                maxLength={500}
              />
            </label>

            <label className="form-field full">
              <span>کد Luau</span>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="-- کد Luau خود را اینجا بنویسید"
                rows={12}
                required
                minLength={10}
                maxLength={100000}
                dir="ltr"
                className="code-textarea"
              />
            </label>

            <div className="form-actions full">
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {editing ? <Save size={18} /> : <Plus size={18} />}
                {submitting ? "در حال ارسال..." : editing ? "ذخیره تغییرات" : "ثبت اسکریپت"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
