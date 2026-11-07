import { Link } from "react-router-dom";
import { Construction, ArrowRight } from "lucide-react";

interface Props {
  title: string;
  step?: string;
  notFound?: boolean;
}

export default function PlaceholderPage({ title, step, notFound }: Props) {
  const stepText = step ? step : "مراحل بعدی";
  const message = notFound
    ? "صفحه‌ای که به دنبال آن هستید وجود ندارد."
    : "این صفحه در " + stepText + " توسعه ساخته می‌شود.";

  return (
    <div className="placeholder">
      <div className="container placeholder-inner">
        <div className="placeholder-icon">
          <Construction size={32} />
        </div>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link to="/" className="btn btn-primary btn-lg">
          بازگشت به خانه
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}