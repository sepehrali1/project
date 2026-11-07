import { UserPlus, Search, Copy } from "lucide-react";

interface StepItem {
  icon: typeof UserPlus;
  title: string;
  text: string;
}

const STEPS: StepItem[] = [
  {
    icon: UserPlus,
    title: "ثبت‌نام کنید",
    text: "در کمتر از یک دقیقه یک حساب رایگان بسازید و به جامعه SSBLOX بپیوندید.",
  },
  {
    icon: Search,
    title: "اسکریپت پیدا کنید",
    text: "با جستجو یا گشتن در دسته‌بندی‌ها، اسکریپت مناسب بازی خود را پیدا کنید.",
  },
  {
    icon: Copy,
    title: "استفاده کنید",
    text: "کد را کپی کنید، در اکسکیوتور خود پیست کنید و از تجربه‌ی بازی جدید لذت ببرید.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section how">
      <div className="container">
        <div className="section-head how-head">
          <div>
            <h2 className="section-title">چطور کار می‌کند؟</h2>
            <p className="section-subtitle">
              فقط سه قدم تا استفاده از اسکریپت‌های SSBLOX.
            </p>
          </div>
        </div>

        <div className="steps">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="step">
                <div className="step-number">{idx + 1}</div>
                <div className="step-icon">
                  <Icon size={26} />
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-text">{step.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}