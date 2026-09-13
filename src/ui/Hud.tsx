import { heroById } from "../data/heroes";
import { heroPortraitUrl } from "../data/heroAssets";
import { xpToNextLevel } from "../game/progression";
import { ResourceIcon } from "./ResourceIcon";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../world/time";
import { JOURNAL_GLYPH, stamp, type JournalEntry } from "./journal";
import { BalanceBar } from "./BalanceBar";
import type { BalanceState } from "../game/balance";
import "./hud.css";

const SPEEDS = [1, 2, 4];

/**
 * Ícones desenhados à mão, em vez de caracteres Unicode.
 *
 * Glifos decorativos dependem da fonte do aparelho: no serifado do mapa saem
 * tortos, e no iOS nem sempre existem. Estes são sempre iguais em toda parte e
 * acompanham a cor do texto.
 */
function Icon({ name }: { name: "pause" | "play" | "follow" | "fit" | "journal" | "debug" | "banner" | "party" }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="glyph" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      {name === "pause" && <g fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="0.6" /><rect x="9" y="3" width="3" height="10" rx="0.6" /></g>}
      {name === "play" && <path d="M5 3.2 12.4 8 5 12.8Z" fill="currentColor" />}
      {name === "follow" && <g {...p}><circle cx="8" cy="8" r="3.1" /><path d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2" /></g>}
      {name === "fit" && <g {...p}><path d="M2.4 5.8V2.4h3.4M10.2 2.4h3.4v3.4M13.6 10.2v3.4h-3.4M5.8 13.6H2.4v-3.4" /></g>}
      {name === "journal" && <g {...p}><path d="M3.2 2.8h6.4a2 2 0 0 1 2 2v8.4H5.2a2 2 0 0 1-2-2Z" /><path d="M5.4 5.6h4M5.4 8h4" /></g>}
      {name === "debug" && <g {...p}><path d="M6.2 2.6 8 4.4 6.4 6 4.6 4.2a3.4 3.4 0 0 0 4.6 4.6l3.4 3.4a1.3 1.3 0 0 1-1.8 1.8L7.4 10.6a3.4 3.4 0 0 1-4.6-4.6Z" /></g>}
      {name === "banner" && <g {...p}><path d="M4 2.6h8v7.2l-4 3.6-4-3.6Z" /><path d="M8 2.6v10.8" /></g>}
      {name === "party" && <g {...p}><circle cx="6" cy="5.6" r="2.2" /><path d="M2.2 13.4c0-2.2 1.7-3.6 3.8-3.6s3.8 1.4 3.8 3.6" /><path d="M11 4.2a2 2 0 0 1 0 3.9M12.2 13.4c0-1.6-.7-2.7-1.8-3.3" /></g>}
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
  debug: boolean;
  onToggleDebug: () => void;
  journal: JournalEntry[];
  /** Bolsa do jogador. */
  coins: number;
  heroId: string | null;
  xp: number;
  /** Registro da jornada — contrato em curso e crônica. */
  onOpenJourney: () => void;
  influence: number;
  /** Null until provisions become a tracked gameplay resource. */
  food?: number | null;
  /** Nível do personagem — abre a ficha. */
  level: number;
  onOpenSheet: () => void;
  /** Para que lado ele vem andando: usar os selos ou quebrá-los. */
  balance: BalanceState;
  /** Vista política — o mapa pintado por Casa, para planejar conquista. */
  political: boolean;
  onTogglePolitical: () => void;
};

/**
 * HUD DE VALDÓRIA.
 *
 * Duas faixas finas e nada no meio: o mapa é a tela do jogo. Em cima, quem
 * você é e o que você tem; embaixo, ao alcance do polegar, o tempo e a
 * câmera. Toda janela de conteúdo — localidade, conversa, ficha, registro —
 * é outra coisa, e some quando fecha.
 *
 * O zoom saiu de propósito: pinça no celular e roda no desktop dão conta, e
 * cada botão a menos é mais mapa visível.
 */
export function Hud({
  placeName, worldHours, traveling, destinationName, travelHours, progress,
  paused, onTogglePause, speed, onSpeed,
  follow, onToggleFollow, onFit,
  debug, onToggleDebug, journal, coins, influence, food = null, level, onOpenSheet,
  political, onTogglePolitical, heroId, xp, onOpenJourney, balance,
}: Props) {
  const [journalOpen, setJournalOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A entrada mais recente fica no topo; volta para ela a cada novidade.
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [journal]);

  const hero = heroById.get(heroId ?? "");
  const portrait = heroPortraitUrl(hero?.portraitAssetKey);
  const nextLevel = xpToNextLevel(level);
  const xpRatio = Number.isFinite(nextLevel) ? Math.max(0, Math.min(1, xp / nextLevel)) : 1;
  const circumference = 2 * Math.PI * 29;
  const xpLabel = Number.isFinite(nextLevel) ? `${xp} de ${nextLevel} XP` : "Nível máximo";
  // Nunca "Dia 0": no primeiro quadro de uma viagem o relógio pode passar
  // um instante abaixo de zero, e isso aparecia na barra.
  const day = Math.max(1, Math.floor(worldHours / 24) + 1);
  const hour = String(Math.floor(((worldHours % 24) + 24) % 24)).padStart(2, "0");

  return (
    <div className="hud-layer">
      {/* ----------------------------- topo ----------------------------- */}
      <div className="hud-top">
        <div className="hud-bar">
          {/* O retrato é a porta da ficha: é o que o jogador mais olha. */}
          <button
            className="hud-hero"
            onClick={onOpenSheet}
            title={`${hero?.name} · nível ${level} · ${xpLabel}`}
            aria-label={`Abrir ficha de ${hero?.name}. Nível ${level}. ${xpLabel}`}
          >
            <svg className="hero-xp-ring" viewBox="0 0 64 64" aria-hidden="true">
              <circle className="xp-track" cx="32" cy="32" r="29" />
              <circle className="xp-value" cx="32" cy="32" r="29" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - xpRatio)} />
            </svg>
            <span className="hero-avatar">{portrait ? <img src={portrait} alt="" /> : hero?.name[0]}</span>
            <span className="hero-level-badge">{level}</span>
          </button>

          <div className="hud-place">
            <b>{placeName}</b>
            <span>Dia {day} · {hour}h{paused ? " · pausa" : ""}</span>
          </div>

          <div className="hud-resources" aria-label="Recursos do viajante">
            <span className="hud-resource" title="Ouro disponível">
              <ResourceIcon name="gold" size={17} />
              <b>{coins.toLocaleString("pt-BR")}</b>
            </span>
            <span className="hud-resource" title="Sua influência pessoal">
              <ResourceIcon name="influence" size={17} />
              <b>{influence.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</b>
            </span>
            <span className="hud-resource" title={food == null ? "Provisões: em breve" : "Comida disponível"}>
              <ResourceIcon name="food" size={17} />
              <b>{food == null ? "—" : food.toLocaleString("pt-BR")}</b>
            </span>
          </div>
        </div>

        <BalanceBar balance={balance} />

        {/* A viagem só ocupa espaço enquanto existe. */}
        {traveling && destinationName && (
          <div className="hud-journey">
            <div className="hud-journey-line">
              <span className="to">{destinationName}</span>
              <span className="eta">{formatDuration(travelHours)}</span>
            </div>
            <div className="hud-progress"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          </div>
        )}
      </div>

      {/* ----------------------------- doca ----------------------------- */}
      <div className="hud-dock">
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

        <button className={`hud-btn icon ${follow ? "on" : ""}`} onClick={onToggleFollow} aria-pressed={follow} title="Manter a câmera no viajante">
          <Icon name="follow" />
        </button>
        <button className="hud-btn icon" onClick={onFit} title="Enquadrar o reino inteiro">
          <Icon name="fit" />
        </button>
        <button className={`hud-btn icon ${political ? "on" : ""}`} onClick={onTogglePolitical} aria-pressed={political} title="Mapa político: territórios pintados pela Casa que os controla">
          <Icon name="banner" />
        </button>

        <span className="sep" />

        <button className="hud-btn icon" onClick={onOpenJourney} title="Registro da jornada: contrato em curso e crônica">
          <Icon name="party" />
        </button>
        <button className={`hud-btn icon ${journalOpen ? "on" : ""}`} onClick={() => setJournalOpen((o) => !o)} aria-pressed={journalOpen} title="Diário de viagem">
          <Icon name="journal" />
        </button>
        <button className={`hud-btn icon quiet desktop-only ${debug ? "on" : ""}`} onClick={onToggleDebug} aria-pressed={debug} title="Modo de depuração">
          <Icon name="debug" />
        </button>
      </div>

      {/* --------------------------- registro --------------------------- */}
      {journalOpen && (
        <div className="hud-journal">
          <div className="hud-journal-head">
            Diário de viagem
            <button onClick={() => setJournalOpen(false)} aria-label="Fechar o diário">×</button>
          </div>
          <div className="hud-journal-list" ref={listRef}>
            {journal.length === 0 ? (
              <div className="hud-empty">Nada aconteceu ainda. Toque em uma localidade para partir.</div>
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
