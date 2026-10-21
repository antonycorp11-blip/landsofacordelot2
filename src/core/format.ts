const SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** Números grandes de jogo incremental: 1,2K · 34,5M · depois notação aa, ab… */
export function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return "∞";
  const neg = n < 0;
  n = Math.abs(n);
  let out: string;
  if (n < 1000) out = n < 10 && n % 1 !== 0 ? n.toFixed(1).replace(".", ",") : Math.floor(n).toString();
  else {
    const tier = Math.floor(Math.log10(n) / 3);
    const v = n / Math.pow(1000, tier);
    let suf: string;
    if (tier < SUFFIX.length) suf = SUFFIX[tier];
    else {
      const k = tier - SUFFIX.length;
      suf = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + (k % 26));
    }
    out = v.toFixed(v < 100 ? digits : 0).replace(".", ",") + suf;
  }
  return neg ? "-" + out : out;
}

export function fmtTime(sec: number): string {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${s}s`;
  return `${s}s`;
}
