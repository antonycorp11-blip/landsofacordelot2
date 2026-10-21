/** Ícones vetoriais gerados por código (SVG inline), sem arquivos de imagem. */
export function weatherIcon(rain: number, cloud: number, night: boolean): string {
  const sun = night
    ? `<path d="M15 5a8 8 0 1 0 6 13 7 7 0 0 1-6-13z" fill="#f2e6b0"/>`
    : `<circle cx="12" cy="11" r="5" fill="#ffd24a"/><g stroke="#ffd24a" stroke-width="2" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315]
        .map((a) => {
          const r = (a * Math.PI) / 180;
          return `<line x1="${12 + Math.cos(r) * 7.5}" y1="${11 + Math.sin(r) * 7.5}" x2="${12 + Math.cos(r) * 9.5}" y2="${11 + Math.sin(r) * 9.5}"/>`;
        })
        .join("")}</g>`;
  const cl = cloud > 0.4 ? `<path d="M9 21h12a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 9 21z" fill="${rain > 0.05 ? "#9aa6b2" : "#e9eef2"}"/>` : "";
  const drops = rain > 0.05 ? `<g stroke="#7cc0ff" stroke-width="1.6" stroke-linecap="round"><line x1="12" y1="23" x2="11" y2="26"/><line x1="16" y1="23" x2="15" y2="26"/><line x1="20" y1="23" x2="19" y2="26"/></g>` : "";
  return `<svg viewBox="0 0 28 28" width="24" height="24">${sun}${cl}${drops}</svg>`;
}

export const ICON = {
  coin: `<svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="8" fill="#e8c53a" stroke="#a5831c" stroke-width="1.5"/><text x="10" y="14" font-size="10" text-anchor="middle" fill="#6b5410" font-weight="700">$</text></svg>`,
  menu: `<svg viewBox="0 0 20 20" width="18" height="18"><g fill="#fff"><rect x="3" y="4" width="14" height="2" rx="1"/><rect x="3" y="9" width="14" height="2" rx="1"/><rect x="3" y="14" width="14" height="2" rx="1"/></g></svg>`,
  fuel: `<svg viewBox="0 0 20 20" width="14" height="14"><rect x="4" y="3" width="8" height="14" rx="1.5" fill="#f28c3a"/><rect x="6" y="5" width="4" height="4" fill="#fff8"/><path d="M12 7h2l2 2v6a1.5 1.5 0 0 1-3 0v-3h-1" fill="none" stroke="#f28c3a" stroke-width="1.5"/></svg>`,
  wrench: `<svg viewBox="0 0 20 20" width="14" height="14"><path d="M14 3a4 4 0 0 0-4.6 5.3L3 14.7 5.3 17l6.4-6.4A4 4 0 0 0 17 6l-2.4 2.4-2.1-.5-.5-2.1z" fill="#9fb4c6"/></svg>`,
  grain: `<svg viewBox="0 0 20 20" width="14" height="14"><g fill="#e2bf6a"><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="7" cy="9" rx="2" ry="3" transform="rotate(-25 7 9)"/><ellipse cx="13" cy="9" rx="2" ry="3" transform="rotate(25 13 9)"/><rect x="9.3" y="8" width="1.4" height="10"/></g></svg>`,
  speed: `<svg viewBox="0 0 20 20" width="14" height="14"><path d="M3 14a7 7 0 1 1 14 0" fill="none" stroke="#bfe6ff" stroke-width="2"/><line x1="10" y1="14" x2="14" y2="8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
};
