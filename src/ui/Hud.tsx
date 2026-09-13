import { ResourceIcon } from "./ResourceIcon";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../world/time";
import { JOURNAL_GLYPH, stamp, type JournalEntry } from "./journal";
import type { LightingMode } from "../render/dayNight";
import "./hud.css";

const SPEEDS = [1, 2, 4];

/** Ordem em que o botão de luz gira. `cycle` é o jogo; o resto é prévia. */
export const LIGHTING_ORDER: LightingMode[] = ["cycle", "day", "dusk", "night"];
const LIGHTING_LABEL: Record<LightingMode, string> = {
  cycle: "Ciclo",
  day: "Dia",
  dusk: "Crepúsculo",
  night: "Noite",
};

/**
 * Ícones desenhados à mão, em vez de caracteres Unicode.
 *
 * Glifos decorativos dependem da fonte do aparelho: no serifado do mapa saem
 * tortos, e no iOS nem sempre existem. Estes são sempre iguais em toda parte e
 * acompanham a cor do texto.
 */
function Icon({ name }: { name: "pause" | "play" | "follow" | "fit" | "journal" | "sun" | "moon" | "debug" | "coin" | "banner" }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="glyph" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      {name === "pause" && <g fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="0.6" /><rect x="9" y="3" width="3" height="10" rx="0.6" /></g>}
      {name === "play" && <path d="M5 3.2 12.4 8 5 12.8Z" fill="currentColor" />}
      {name === "follow" && <g {...p}><circle cx="8" cy="8" r="3.1" /><path d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2" /></g>}
      {name === "fit" && <g {...p}><path d="M2.4 5.8V2.4h3.4M10.2 2.4h3.4v3.4M13.6 10.2v3.4h-3.4M5.8 13.6H2.4v-3.4" /></g>}
      {name === "journal" && <g {...p}><path d="M3.2 2.8h6.4a2 2 0 0 1 2 2v8.4H5.2a2 2 0 0 1-2-2Z" /><path d="M5.4 5.6h4M5.4 8h4" /></g>}
      {name === "sun" && <g {...p}><circle cx="8" cy="8" r="3" /><path d="M8 1.4v1.6M8 13v1.6M1.4 8H3M13 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" /></g>}
      {name === "debug" && <g {...p}><path d="M6.2 2.6 8 4.4 6.4 6 4.6 4.2a3.4 3.4 0 0 0 4.6 4.6l3.4 3.4a1.3 1.3 0 0 1-1.8 1.8L7.4 10.6a3.4 3.4 0 0 1-4.6-4.6Z" /></g>}
      {name === "banner" && <g {...p}><path d="M4 2.6h8v7.2l-4 3.6-4-3.6Z" /><path d="M8 2.6v10.8" /></g>}
      {name === "coin" && <g><circle cx="8" cy="8" r="5.6" fill="currentColor" opacity=".28" /><circle cx="8" cy="8" r="5.6" {...p} /><circle cx="8" cy="8" r="2.7" {...p} /></g>}
      {name === "moon" && <path d="M12.6 9.9A5.2 5.2 0 0 1 6.1 3.4a5.2 5.2 0 1 0 6.5 6.5Z" fill="currentColor" />}
    </svg>
  );
}

type Props = {
  placeName: string;
  worldHours: number;
  traveling: boolean;
  destinationName: string | null;
  travelHours: number;
  /** 0 a 1 no trecho atual. */
  progress: number;
  paused: boolean;
  onTogglePause: () => void;
  speed: number;
  onSpeed: (s: number) => void;
  follow: boolean;
  onToggleFollow: () => void;
  onFit: () => void;
  lightingName: string;
  lightingNight: number;
  lightingMode: LightingMode;
  onCycleLighting: () => void;
  debug: boolean;
  onToggleDebug: () => void;
  journal: JournalEntry[];
  /** Bolsa do jogador. */
  coins: number;
  influence: number;
  /** Null until provisions become a tracked gameplay resource. */
  food?: number | null;
  /** Nível do personagem — abre a ficha. */
  level: number;
  onOpenSheet: () => void;
  /** Vista política — o mapa pintado por Casa, para planejar conquista. */
  political: boolean;
  onTogglePolitical: () => void;
  /** Região tocada no mapa, quando houver. Leitura pura dos dados do mundo. */
  selected: { name: string; biome: string; pois: number; settlements: number } | null;
};

/**
 * HUD PROVISÓRIO DE VALDÓRIA.
 *
 * Mostra só o que já é jogável: o lugar, o relógio do mundo, a viagem em
 * curso e o diário do caminho. O controle de zoom saiu de propósito — pinça
 * no celular e roda no desktop já resolvem, e cada botão a menos é mais mapa
 * visível. Nada aqui guarda estado do mundo: é tudo leitura do que o mapa e a
 * viagem já sabem, para poder ser substituído inteiro sem tocar no jogo.
 */
export function Hud({
  placeName, worldHours, traveling, destinationName, travelHours, progress,
  paused, onTogglePause, speed, onSpeed,
  follow, onToggleFollow, onFit,
  lightingName, lightingNight, lightingMode, onCycleLighting,
  debug, onToggleDebug, journal, selected, coins, influence, food = null, level, onOpenSheet,
  political, onTogglePolitical,
}: Props) {
  // No desktop há espaço de sobra para o diário; no celular ele é uma gaveta.
  const [journalOpen, setJournalOpen] = useState(
    () => typeof matchMedia !== "function" || !matchMedia("(max-width: 720px)").matches,
  );

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A entrada mais recente fica no topo; volta para ela a cada novidade.
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [journal]);

  const day = Math.floor(worldHours / 24) + 1;
  const hour = String(Math.floor(((worldHours % 24) + 24) % 24)).padStart(2, "0");

  return (
    <div className="hud-layer">
      <div className="hud-bar">
        <div className="hud-panel hud-place-chip">
          <div className="hud-place">{placeName}</div>
          <div className="hud-clock">
            <span>Dia <b>{day}</b></span>
            <span>·</span>
            <span><b>{hour}</b>h</span>
            <span>·</span>
            <span>{paused ? "em pausa" : traveling ? "a caminho" : "parado"}</span>
          </div>

          {traveling && destinationName && (
            <div className="hud-journey">
              <div className="hud-journey-line">
                <span>rumo a</span>
                <span className="to">{destinationName}</span>
                <span className="eta">{formatDuration(travelHours)}</span>
              </div>
              <div className="hud-progress">
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          )}

          {selected && (
            <div className="hud-selected">
              <b>{selected.name}</b>
              <span>{selected.biome} · {selected.pois} pontos · {selected.settlements} assentamentos</span>
            </div>
          )}
        </div>

        <div className="spacer" />

        {/* A ficha do personagem fica atrás do nível: é o número que o jogador
            olha com mais frequência, e serve de porta para o resto. */}
        <button className="hud-panel hud-hero" onClick={onOpenSheet} title="Ficha do personagem">
          <span className="hud-level">{level}</span>
          <span className="hud-hero-label">Ficha</span>
        </button>

        <div className="hud-panel hud-resources" aria-label="Recursos do viajante">
          <div className="hud-resource" title="Ouro disponível">
            <ResourceIcon name="gold"/><span><small>Ouro</small><b>{coins.toLocaleString('pt-BR')}</b></span>
          </div>
          <div className="hud-resource" title="Sua influência pessoal">
            <ResourceIcon name="influence"/><span><small>Influência</small><b>{influence.toLocaleString('pt-BR', {maximumFractionDigits:1})}</b></span>
          </div>
          <div className="hud-resource" title={food == null ? 'Provisões: em breve' : 'Comida disponível'}>
            <ResourceIcon name="food"/><span><small>Comida</small><b aria-label={food == null ? 'Ainda não disponível' : undefined}>{food == null ? '—' : food.toLocaleString('pt-BR')}</b></span>
          </div>
        </div>

        <div className="hud-panel hud-dock">
          <button
            className={`hud-btn icon ${paused ? "on" : ""}`}
            onClick={onTogglePause}
            aria-pressed={paused}
            aria-label={paused ? "Retomar o tempo" : "Pausar o tempo"}
            title={paused ? "Retomar" : "Pausar"}
          >
            <Icon name={paused ? "play" : "pause"} />
          </button>

          <span className="hud-speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`hud-btn ${!paused && speed === s ? "on" : ""}`}
                onClick={() => onSpeed(s)}
                aria-pressed={!paused && speed === s}
              >
                {s}×
              </button>
            ))}
          </span>

          <span className="sep" />

          <button
            className={`hud-btn icon ${follow ? "on" : ""}`}
            onClick={onToggleFollow}
            aria-pressed={follow}
            title="Manter a câmera no viajante"
          >
            <Icon name="follow" />
            <span className="label-long">Seguir</span>
          </button>

          <button className="hud-btn icon" onClick={onFit} title="Enquadrar o reino inteiro">
            <Icon name="fit" />
            <span className="label-long">Reino</span>
          </button>

          <button
            className={`hud-btn icon ${political ? "on" : ""}`}
            onClick={onTogglePolitical}
            aria-pressed={political}
            title="Mapa político: territórios pintados pela Casa que os controla"
          >
            <Icon name="banner" />
            <span className="label-long">Casas</span>
          </button>

          <button
            className={`hud-btn icon ${journalOpen ? "on" : ""}`}
            onClick={() => setJournalOpen((o) => !o)}
            aria-pressed={journalOpen}
            title="Diário de viagem"
          >
            <Icon name="journal" />
            <span className="label-long">Diário</span>
          </button>

          <span className="sep" />

          <button
            className={`hud-btn icon ${lightingMode === "cycle" ? "" : "on"}`}
            onClick={onCycleLighting}
            title={`Luz: ${LIGHTING_LABEL[lightingMode]} — ${lightingName}`}
          >
            <Icon name={lightingNight > 0.6 ? "moon" : "sun"} />
            <span className="label-long">{LIGHTING_LABEL[lightingMode]}</span>
          </button>

          <button
            className={`hud-btn icon quiet ${debug ? "on" : ""}`}
            onClick={onToggleDebug}
            aria-pressed={debug}
            title="Modo de depuração"
          >
            <Icon name="debug" />
            <span className="label-long">Debug</span>
          </button>
        </div>
      </div>

        {journalOpen && (
          <div className="hud-panel hud-journal">
            <div className="hud-journal-head">
              Diário de viagem
              <button onClick={() => setJournalOpen(false)} aria-label="Fechar o diário">×</button>
            </div>
            <div className="hud-journal-list" ref={listRef}>
              {journal.length === 0 ? (
                <div className="hud-empty">Nada aconteceu ainda. Toque em uma cidade para partir.</div>
              ) : (
                journal.map((e) => (
                  <div className={`hud-entry kind-${e.kind}`} key={e.id}>
                    <span className="glyph">{JOURNAL_GLYPH[e.kind]}</span>
                    <span className="when">{stamp(e.hours)}</span>
                    <span>{e.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
    </div>
  );
}
