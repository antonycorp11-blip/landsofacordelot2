import { useEffect, useState, type CSSProperties } from "react";
import { portraitFrame, type PortraitExpression } from "../../data/storyPortraits";
import "./expressionPortrait.css";

export function ExpressionPortrait({
  portraitKey,
  expression = "neutral",
  sequence,
  interval = 1900,
  className = "",
}: {
  portraitKey: string;
  expression?: PortraitExpression;
  sequence?: PortraitExpression[];
  interval?: number;
  className?: string;
}) {
  const [step, setStep] = useState(0);
  const list = sequence?.length ? sequence : [expression];
  const current = list[step % list.length];
  const frame = portraitFrame(portraitKey, current);

  useEffect(() => {
    setStep(0);
    if (list.length < 2) return;
    const timer = window.setInterval(() => setStep((n) => Math.min(n + 1, list.length - 1)), interval);
    return () => window.clearInterval(timer);
  }, [portraitKey, interval, list.join("|")]);

  if (!frame) return null;
  const x = frame.cols === 1 ? 0 : (frame.col / (frame.cols - 1)) * 100;
  const y = frame.rows === 1 ? 0 : (frame.row / (frame.rows - 1)) * 100;
  const style = {
    backgroundImage: `url(${frame.url})`,
    backgroundSize: `${frame.cols * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
  } as CSSProperties;

  return (
    <span className={`expression-portrait ${className}`} aria-hidden="true">
      <span key={`${portraitKey}-${current}`} className="expression-portrait-frame" style={style} />
    </span>
  );
}

