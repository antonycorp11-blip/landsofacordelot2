/**
 * Desenhos vetoriais PROVISÓRIOS.
 *
 * Tudo aqui é descartável: quando um `assetKey` ganhar um PNG/WebP em
 * `mapAssets.ts`, estes desenhos deixam de ser usados sem que nada mais no
 * projeto precise mudar. Nenhuma lógica de jogo importa deste arquivo.
 *
 * Convenção: todo placeholder é desenhado numa caixa de 100×100 com a "base"
 * do objeto em y = 92 e o centro horizontal em x = 50.
 */
import type { ReactNode } from "react";

const C = {
  stoneLight: "#d9d3c6",
  stone: "#b9b2a2",
  stoneDark: "#8d8676",
  roofRed: "#9b4a3c",
  roofDark: "#6f3128",
  roofBlue: "#4a6484",
  wood: "#8a6238",
  woodDark: "#5d4125",
  gold: "#d8b24a",
  leafDark: "#2f5233",
  leaf: "#3f6b3d",
  leafLight: "#568a49",
  dryLeaf: "#7c7a3c",
  rock: "#7c7a78",
  rockLight: "#a5a29c",
  snow: "#eef2f4",
  water: "#5f93a8",
  sand: "#d8c48c",
  crop: "#c9ac4e",
  wine: "#7a4a72",
  banner: "#b23b33",
};

const outline = { stroke: "#3a3128", strokeWidth: 2.2, strokeLinejoin: "round" as const };
const thin = { stroke: "#3a3128", strokeWidth: 1.6, strokeLinejoin: "round" as const };

/* ------------------------------ primitivas ----------------------------- */

function Tower({ x, w, h, roof }: { x: number; w: number; h: number; roof: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={92 - h} width={w} height={h} fill={C.stone} {...outline} />
      <rect x={x - w / 2} y={92 - h} width={w / 2.6} height={h} fill={C.stoneLight} opacity={0.55} />
      <path d={`M ${x - w / 2 - 3} ${92 - h} L ${x} ${92 - h - w * 0.95} L ${x + w / 2 + 3} ${92 - h} Z`} fill={roof} {...outline} />
    </g>
  );
}

function Hall({ x, w, h, roof }: { x: number; w: number; h: number; roof: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={92 - h} width={w} height={h} fill={C.stoneLight} {...outline} />
      <path d={`M ${x - w / 2 - 4} ${92 - h} L ${x} ${92 - h - h * 0.55} L ${x + w / 2 + 4} ${92 - h} Z`} fill={roof} {...outline} />
    </g>
  );
}

function Ground({ fill = "#6f7a4a", w = 78 }: { fill?: string; w?: number }) {
  return <ellipse cx={50} cy={93} rx={w / 2} ry={7} fill={fill} opacity={0.35} />;
}

function Banner({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 16} stroke="#3a3128" strokeWidth={2} />
      <path d={`M ${x} ${y - 16} L ${x + 13} ${y - 12} L ${x} ${y - 8} Z`} fill={C.banner} {...thin} />
    </g>
  );
}

/* ------------------------------ construções ---------------------------- */

const castleRoyal = (
  <g>
    <Ground w={92} />
    <rect x={16} y={54} width={68} height={38} fill={C.stone} {...outline} />
    <path d="M16 54 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8" fill={C.stone} {...outline} />
    <Tower x={26} w={18} h={54} roof={C.roofBlue} />
    <Tower x={74} w={18} h={54} roof={C.roofBlue} />
    <Tower x={50} w={24} h={70} roof={C.roofBlue} />
    <rect x={44} y={72} width={12} height={20} fill={C.woodDark} {...thin} />
    <Banner x={50} y={92 - 70 - 12} />
    <circle cx={50} cy={38} r={3.4} fill={C.gold} />
  </g>
);

const castleMedium = (
  <g>
    <Ground w={82} />
    <rect x={22} y={60} width={56} height={32} fill={C.stone} {...outline} />
    <path d="M22 60 h8 v-7 h9 v7 h9 v-7 h9 v7 h9 v-7 h7 v7" fill={C.stone} {...outline} />
    <Tower x={30} w={16} h={48} roof={C.roofRed} />
    <Tower x={70} w={16} h={48} roof={C.roofRed} />
    <rect x={45} y={76} width={11} height={16} fill={C.woodDark} {...thin} />
    <Banner x={70} y={92 - 48 - 10} />
  </g>
);

const fortress = (
  <g>
    <Ground w={88} />
    <path d="M14 92 L22 50 H78 L86 92 Z" fill={C.stoneDark} {...outline} />
    <path d="M22 50 h9 v-8 h9 v8 h9 v-8 h9 v8 h9 v-8 h9 v8" fill={C.stoneDark} {...outline} />
    <rect x={42} y={68} width={16} height={24} fill="#3d342a" {...thin} />
    <Tower x={24} w={15} h={58} roof={C.rock} />
    <Tower x={76} w={15} h={58} roof={C.rock} />
  </g>
);

const cityLarge = (
  <g>
    <Ground w={90} />
    <Hall x={28} w={26} h={30} roof={C.roofRed} />
    <Hall x={72} w={24} h={26} roof={C.roofRed} />
    <Hall x={50} w={30} h={40} roof={C.roofBlue} />
    <Tower x={50} w={12} h={58} roof={C.roofBlue} />
    <path d="M10 92 h80" stroke={C.stoneDark} strokeWidth={4} strokeLinecap="round" />
  </g>
);

const citySmall = (
  <g>
    <Ground w={70} />
    <Hall x={36} w={22} h={22} roof={C.roofRed} />
    <Hall x={62} w={18} h={18} roof={C.roofRed} />
    <Hall x={50} w={16} h={28} roof={C.roofBlue} />
  </g>
);

const village = (
  <g>
    <Ground w={58} />
    <Hall x={40} w={18} h={16} roof={C.roofRed} />
    <Hall x={62} w={14} h={13} roof={C.roofRed} />
  </g>
);

const councilHall = (
  <g>
    <Ground w={80} />
    <rect x={22} y={56} width={56} height={36} fill={C.stoneLight} {...outline} />
    <path d="M14 56 L50 32 L86 56 Z" fill={C.roofBlue} {...outline} />
    {[32, 44, 56, 68].map((x) => (
      <rect key={x} x={x} y={62} width={6} height={30} fill={C.stone} {...thin} />
    ))}
  </g>
);

const marketLarge = (
  <g>
    <Ground w={84} />
    {[
      [24, C.roofRed],
      [50, "#c8a34c"],
      [76, "#4a7a6a"],
    ].map(([x, col]) => (
      <g key={x as number}>
        <rect x={(x as number) - 15} y={70} width={30} height={22} fill={C.wood} {...thin} />
        <path d={`M ${(x as number) - 20} 70 q 20 -16 40 0 Z`} fill={col as string} {...thin} />
      </g>
    ))}
  </g>
);

const temple = (
  <g>
    <Ground w={64} />
    <rect x={34} y={58} width={32} height={34} fill={C.stoneLight} {...outline} />
    <path d="M28 58 L50 38 L72 58 Z" fill={C.roofBlue} {...outline} />
    <line x1={50} y1={38} x2={50} y2={24} stroke="#3a3128" strokeWidth={2.6} />
    <line x1={43} y1={30} x2={57} y2={30} stroke="#3a3128" strokeWidth={2.6} />
  </g>
);

const cathedral = (
  <g>
    <Ground w={86} />
    <rect x={28} y={52} width={44} height={40} fill={C.stoneLight} {...outline} />
    <path d="M22 52 L50 28 L78 52 Z" fill="#6f5aa8" {...outline} />
    <Tower x={22} w={14} h={70} roof="#6f5aa8" />
    <Tower x={78} w={14} h={70} roof="#6f5aa8" />
    <path d="M50 92 v-24 a8 8 0 0 1 16 0 v24" fill="none" {...thin} />
    <circle cx={50} cy={62} r={6} fill={C.gold} {...thin} />
  </g>
);

const monastery = (
  <g>
    <Ground w={76} />
    <rect x={24} y={64} width={52} height={28} fill={C.stoneLight} {...outline} />
    <path d="M20 64 L50 46 L80 64 Z" fill="#7a6a4a" {...outline} />
    <Tower x={72} w={12} h={46} roof="#7a6a4a" />
    {[32, 44, 56].map((x) => (
      <path key={x} d={`M ${x} 92 v-14 a4 4 0 0 1 8 0 v14`} fill="#6e6455" {...thin} />
    ))}
  </g>
);

const shrine = (
  <g>
    <Ground w={48} />
    <path d="M34 92 V66 L50 52 L66 66 V92 Z" fill={C.stoneLight} {...outline} />
    <circle cx={50} cy={44} r={7} fill={C.gold} {...thin} />
  </g>
);

const watchtower = (
  <g>
    <Ground w={44} />
    <path d="M40 92 L43 46 H57 L60 92 Z" fill={C.stone} {...outline} />
    <rect x={38} y={38} width={24} height={10} fill={C.stoneDark} {...outline} />
    <path d="M38 38 h5 v-5 h5 v5 h4 v-5 h5 v5 h5" fill={C.stoneDark} {...thin} />
  </g>
);

const gate = (
  <g>
    <Ground w={80} />
    <rect x={16} y={52} width={20} height={40} fill={C.stoneDark} {...outline} />
    <rect x={64} y={52} width={20} height={40} fill={C.stoneDark} {...outline} />
    <rect x={36} y={62} width={28} height={30} fill="#4a3f33" {...outline} />
    <path d="M36 62 q14 -14 28 0" fill="#4a3f33" {...thin} />
    <path d="M16 52 h6 v-6 h7 v6 h7 M64 52 h6 v-6 h7 v6 h7" fill={C.stoneDark} {...thin} />
  </g>
);

const fort = (
  <g>
    <Ground w={74} />
    <path d="M22 92 V58 h56 v34 Z" fill={C.woodDark} {...outline} />
    <path d="M22 58 h8 l4 -8 h8 l4 8 h8 l4 -8 h8 l4 8 h8" fill={C.woodDark} {...thin} />
    <rect x={44} y={72} width={12} height={20} fill="#33291e" {...thin} />
    <Banner x={30} y={58} />
  </g>
);

const warcamp = (
  <g>
    <Ground w={76} />
    {[
      [30, 1],
      [52, 1.15],
      [72, 0.9],
    ].map(([x, s]) => (
      <path
        key={x as number}
        d={`M ${(x as number) - 14 * (s as number)} 92 L ${x} ${92 - 26 * (s as number)} L ${(x as number) + 14 * (s as number)} 92 Z`}
        fill="#a89474"
        {...thin}
      />
    ))}
    <Banner x={52} y={92 - 30} />
  </g>
);

const trainingGround = (
  <g>
    <Ground w={80} />
    <ellipse cx={50} cy={80} rx={34} ry={12} fill="#bfa476" {...thin} />
    <path d="M34 80 V58 M34 62 h16" stroke={C.woodDark} strokeWidth={3.5} />
    <path d="M62 80 V60 l10 6" stroke={C.woodDark} strokeWidth={3.5} fill="none" />
  </g>
);

const mine = (
  <g>
    <Ground w={66} />
    <path d="M20 92 q30 -40 60 0 Z" fill={C.rock} {...outline} />
    <path d="M40 92 v-16 a10 10 0 0 1 20 0 v16 Z" fill="#2b2620" {...outline} />
    <path d="M34 86 l-10 -10 M24 76 l6 -6" stroke={C.woodDark} strokeWidth={3} />
  </g>
);

const quarry = (
  <g>
    <Ground w={72} />
    <path d="M18 92 L26 70 H74 L82 92 Z" fill={C.rockLight} {...outline} />
    <path d="M30 92 L36 78 H60 L66 92 Z" fill={C.rock} {...thin} />
    <rect x={44} y={62} width={14} height={10} fill={C.stone} {...thin} />
  </g>
);

const foundry = (
  <g>
    <Ground w={72} />
    <rect x={26} y={64} width={48} height={28} fill={C.stoneDark} {...outline} />
    <path d="M22 64 L50 48 L78 64 Z" fill="#5c4a3a" {...outline} />
    <rect x={62} y={34} width={12} height={30} fill={C.stoneDark} {...outline} />
    <path d="M64 34 q4 -12 8 -4" stroke="#d9d3c6" strokeWidth={3} fill="none" opacity={0.8} />
    <rect x={40} y={74} width={14} height={18} fill="#c9652e" {...thin} />
  </g>
);

const sawmill = (
  <g>
    <Ground w={72} />
    <rect x={28} y={62} width={44} height={30} fill={C.wood} {...outline} />
    <path d="M24 62 L50 46 L76 62 Z" fill={C.woodDark} {...outline} />
    <circle cx={72} cy={78} r={12} fill="none" stroke="#3a3128" strokeWidth={2.4} />
    {[0, 45, 90, 135].map((a) => (
      <line key={a} x1={72 - 12 * Math.cos((a * Math.PI) / 180)} y1={78 - 12 * Math.sin((a * Math.PI) / 180)} x2={72 + 12 * Math.cos((a * Math.PI) / 180)} y2={78 + 12 * Math.sin((a * Math.PI) / 180)} stroke="#3a3128" strokeWidth={2} />
    ))}
  </g>
);

const farm = (
  <g>
    <Ground w={72} />
    <rect x={22} y={92} width={56} height={0} />
    <path d="M14 92 q18 -8 36 0 q18 -8 36 0" stroke={C.crop} strokeWidth={4} fill="none" />
    <rect x={40} y={64} width={26} height={28} fill={C.wood} {...outline} />
    <path d="M36 64 L53 50 L70 64 Z" fill={C.roofRed} {...outline} />
  </g>
);

const mill = (
  <g>
    <Ground w={62} />
    <path d="M38 92 L42 56 H58 L62 92 Z" fill={C.stoneLight} {...outline} />
    <path d="M34 50 L66 62 M34 62 L66 50" stroke={C.woodDark} strokeWidth={4} strokeLinecap="round" />
    <circle cx={50} cy={56} r={4} fill={C.woodDark} />
  </g>
);

const studFarm = (
  <g>
    <Ground w={78} />
    <path d="M16 84 h68 M16 76 h68" stroke={C.wood} strokeWidth={3} />
    {[20, 38, 56, 80].map((x) => (
      <line key={x} x1={x} y1={72} x2={x} y2={90} stroke={C.woodDark} strokeWidth={3} />
    ))}
    <path d="M52 72 q6 -14 14 -10 l4 -6 2 8 q6 6 -2 12 Z" fill="#6b4a30" {...thin} />
  </g>
);

const port = (
  <g>
    <Ground w={90} fill="#4d6f80" />
    <rect x={14} y={74} width={72} height={8} fill={C.wood} {...thin} />
    {[22, 40, 58, 76].map((x) => (
      <line key={x} x1={x} y1={82} x2={x} y2={92} stroke={C.woodDark} strokeWidth={3} />
    ))}
    <Hall x={32} w={22} h={26} roof={C.roofRed} />
    <path d="M62 74 V40 l18 12 -18 8" fill="#f0ece0" {...thin} />
    <line x1={62} y1={40} x2={62} y2={74} stroke="#3a3128" strokeWidth={2.4} />
  </g>
);

const shipyard = (
  <g>
    <Ground w={80} fill="#4d6f80" />
    <path d="M18 88 q32 10 64 0 l-6 -14 H24 Z" fill={C.wood} {...outline} />
    <path d="M30 74 V46 M30 46 l22 10 -22 8" fill="#e6dfce" {...thin} />
    <path d="M58 82 h26" stroke={C.woodDark} strokeWidth={4} />
  </g>
);

const lighthouse = (
  <g>
    <Ground w={50} />
    <path d="M40 92 L44 40 H56 L60 92 Z" fill={C.stoneLight} {...outline} />
    <path d="M42.5 60 H57.5 M41.5 74 H58.5" stroke={C.roofRed} strokeWidth={5} />
    <rect x={41} y={30} width={18} height={11} fill={C.gold} {...outline} />
    <path d="M59 35 l14 -5 M41 35 l-14 -5" stroke={C.gold} strokeWidth={2.4} opacity={0.8} />
  </g>
);

const bay = (
  <g>
    <path d="M12 62 q22 22 44 4 q20 -16 32 6 v20 H12 Z" fill={C.water} opacity={0.85} {...thin} />
    <path d="M20 74 q10 -6 20 0 M52 80 q10 -6 20 0" stroke="#dff0f4" strokeWidth={2} fill="none" opacity={0.7} />
  </g>
);

const lake = (
  <g>
    <ellipse cx={50} cy={70} rx={40} ry={24} fill={C.water} {...outline} />
    <path d="M28 66 q10 -5 20 0 M50 78 q10 -5 20 0" stroke="#dff0f4" strokeWidth={2} fill="none" opacity={0.75} />
  </g>
);

const sacredGrove = (
  <g>
    <Ground w={70} />
    <circle cx={50} cy={64} r={26} fill={C.leafLight} opacity={0.35} />
    <path d="M50 92 V70" stroke={C.woodDark} strokeWidth={5} />
    <circle cx={50} cy={56} r={20} fill={C.leaf} {...outline} />
    <circle cx={38} cy={64} r={11} fill={C.leafDark} {...thin} />
    <circle cx={64} cy={62} r={12} fill={C.leafDark} {...thin} />
  </g>
);

const ruins = (
  <g>
    <Ground w={70} />
    <path d="M26 92 V56 h12 v36 Z" fill={C.stone} {...outline} />
    <path d="M52 92 V64 h10 v28 Z" fill={C.stone} {...outline} />
    <path d="M70 92 V72 h9 v20 Z" fill={C.stone} {...outline} />
    <path d="M26 60 h36" stroke={C.stoneDark} strokeWidth={5} />
  </g>
);

const inn = (
  <g>
    <Ground w={64} />
    <rect x={30} y={62} width={40} height={30} fill="#c9b48e" {...outline} />
    <path d="M24 62 L50 44 L76 62 Z" fill={C.roofRed} {...outline} />
    <rect x={44} y={76} width={12} height={16} fill={C.woodDark} {...thin} />
    <path d="M70 58 h10 M78 58 v8" stroke="#3a3128" strokeWidth={2} />
    <rect x={72} y={66} width={12} height={8} fill={C.gold} {...thin} />
  </g>
);

const outpost = (
  <g>
    <Ground w={54} />
    <path d="M34 92 L38 60 H62 L66 92 Z" fill={C.wood} {...outline} />
    <path d="M30 60 L50 46 L70 60 Z" fill={C.woodDark} {...outline} />
    <path d="M22 92 v-10 M78 92 v-10" stroke={C.woodDark} strokeWidth={3} />
  </g>
);

const mountainPass = (
  <g>
    <path d="M4 92 L30 36 L48 70 L56 58 L74 92 Z" fill={C.rock} {...outline} />
    <path d="M22 54 L30 36 L38 54 Z" fill={C.snow} {...thin} />
    <path d="M96 92 L76 46 L62 70 Z" fill={C.rockLight} {...outline} />
    <path d="M44 92 q8 -16 18 0" stroke="#d9cfae" strokeWidth={4} fill="none" />
  </g>
);

const mountainLarge = (
  <g>
    <path d="M2 92 L34 24 L58 66 L70 48 L98 92 Z" fill={C.rock} {...outline} />
    <path d="M24 46 L34 24 L45 46 q-10 7 -21 0 Z" fill={C.snow} {...thin} />
    <path d="M34 24 L58 66 L34 92 Z" fill={C.rockLight} opacity={0.45} />
  </g>
);

const mountainSmall = (
  <g>
    <path d="M8 92 L38 40 L62 78 L74 62 L94 92 Z" fill={C.rockLight} {...outline} />
    <path d="M30 56 L38 40 L47 56 Z" fill={C.snow} opacity={0.9} />
  </g>
);

const hill = (
  <g>
    <path d="M6 92 q22 -34 44 -20 q20 -26 44 20 Z" fill="#8fa05e" {...thin} />
    <path d="M22 86 q14 -14 26 -6" stroke="#6f8049" strokeWidth={2.4} fill="none" />
  </g>
);

const dryHill = (
  <g>
    <path d="M6 92 q22 -32 44 -18 q20 -24 44 18 Z" fill="#b4914f" {...thin} />
    <path d="M24 86 q14 -12 26 -5" stroke="#8e6d38" strokeWidth={2.4} fill="none" />
  </g>
);

const cliff = (
  <g>
    {/* Falésia vista de lado: topo com vegetação, parede rochosa em degraus. */}
    <path d="M10 92 V62 l14 -10 20 4 18 -8 22 6 v38 Z" fill="#b8a179" {...outline} />
    <path d="M10 62 l14 -10 20 4 18 -8 22 6 -6 8 -18 -4 -16 8 -18 -4 Z" fill="#8fa05e" {...thin} />
    <path d="M26 88 V66 M48 90 V64 M70 88 V62" stroke="#9a8455" strokeWidth={2.4} />
    <path d="M10 92 h80" stroke="#7d6a44" strokeWidth={3} />
  </g>
);

function treeShape(leaf: string, leafDark: string, conifer: boolean) {
  return (
    <g>
      <path d="M50 92 V66" stroke={C.woodDark} strokeWidth={6} strokeLinecap="round" />
      {conifer ? (
        <>
          <path d="M50 14 L74 54 H26 Z" fill={leaf} {...thin} />
          <path d="M50 34 L80 78 H20 Z" fill={leafDark} {...thin} />
        </>
      ) : (
        <>
          <circle cx={50} cy={44} r={26} fill={leaf} {...thin} />
          <circle cx={34} cy={56} r={16} fill={leafDark} {...thin} />
          <circle cx={66} cy={54} r={17} fill={leafDark} {...thin} />
        </>
      )}
    </g>
  );
}

const forestCluster = (
  <g>
    <ellipse cx={50} cy={74} rx={46} ry={24} fill={C.leafDark} opacity={0.35} />
    <g transform="translate(-18,6) scale(0.55)">{treeShape(C.leaf, C.leafDark, true)}</g>
    <g transform="translate(18,10) scale(0.5)">{treeShape(C.leafLight, C.leaf, false)}</g>
    <g transform="translate(0,-6) scale(0.62)">{treeShape(C.leaf, C.leafDark, true)}</g>
  </g>
);

const scrubCluster = (
  <g>
    <ellipse cx={50} cy={80} rx={38} ry={16} fill="#8a8a4a" opacity={0.3} />
    {[30, 50, 70].map((x, i) => (
      <circle key={x} cx={x} cy={76 - i * 4} r={12 - i * 2} fill={i % 2 ? "#7e7f3f" : "#94914c"} {...thin} />
    ))}
  </g>
);

function fieldShape(fill: string, stripe: string) {
  return (
    <g>
      <path d="M12 80 L34 58 H86 L64 92 H12 Z" fill={fill} {...thin} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={20 + i * 13} y1={80 - i * 1} x2={42 + i * 13} y2={58} stroke={stripe} strokeWidth={2.2} opacity={0.8} />
      ))}
    </g>
  );
}

const ship = (
  <g>
    <path d="M16 78 q34 16 68 0 l-8 10 H24 Z" fill={C.wood} {...thin} />
    <line x1={50} y1={78} x2={50} y2={30} stroke="#3a3128" strokeWidth={2.6} />
    <path d="M50 32 q20 14 0 26 Z" fill="#f2ecdd" {...thin} />
    <path d="M50 40 q-16 10 0 20 Z" fill="#e3dac6" {...thin} />
  </g>
);

const bridgeStone = (
  <g>
    <path d="M8 78 h84 v10 H8 Z" fill={C.stoneLight} {...outline} />
    <path d="M30 88 q20 -22 40 0" fill="none" {...outline} />
    <path d="M8 78 v-10 M92 78 v-10" stroke="#3a3128" strokeWidth={3} />
  </g>
);

const bridgeWood = (
  <g>
    <path d="M10 76 q40 -14 80 0 v10 q-40 -14 -80 0 Z" fill={C.wood} {...outline} />
    <path d="M22 84 v10 M50 78 v14 M78 84 v10" stroke={C.woodDark} strokeWidth={3.4} />
  </g>
);

const ford = (
  <g>
    <path d="M6 72 q24 12 46 0 q22 -12 42 0" stroke={C.water} strokeWidth={9} fill="none" opacity={0.9} />
    {[24, 44, 64, 82].map((x, i) => (
      <ellipse key={x} cx={x} cy={74 + (i % 2) * 6} rx={7} ry={4.5} fill={C.rockLight} {...thin} />
    ))}
  </g>
);

const forestPath = (
  <g>
    <path d="M50 92 q-14 -26 4 -48" stroke="#c2ae83" strokeWidth={7} fill="none" strokeLinecap="round" />
    <g transform="translate(-26,4) scale(0.5)">{treeShape(C.leaf, C.leafDark, true)}</g>
    <g transform="translate(26,0) scale(0.52)">{treeShape(C.leafDark, C.leaf, true)}</g>
  </g>
);

const roadMarker = (
  <g>
    <path d="M44 92 V52 h12 v40 Z" fill={C.stoneLight} {...outline} />
    <path d="M56 58 h22 l-6 8 6 8 H56 Z" fill={C.stone} {...thin} />
  </g>
);

/* ------------------------------- registro ------------------------------ */

export const placeholderById: Record<string, ReactNode> = {
  castle_royal: castleRoyal,
  castle_medium: castleMedium,
  fortress,
  city_large: cityLarge,
  city_small: citySmall,
  village,
  council_hall: councilHall,
  market_large: marketLarge,
  temple,
  cathedral,
  monastery,
  shrine,
  watchtower,
  gate,
  fort,
  warcamp,
  training_ground: trainingGround,
  mine,
  quarry,
  foundry,
  sawmill,
  farm,
  mill,
  stud_farm: studFarm,
  port,
  shipyard,
  lighthouse,
  bay,
  lake,
  sacred_grove: sacredGrove,
  ruins,
  inn,
  outpost,
  mountain_pass: mountainPass,
  mountain_large: mountainLarge,
  mountain_small: mountainSmall,
  hill,
  dry_hill: dryHill,
  cliff,
  forest_cluster: forestCluster,
  scrub_cluster: scrubCluster,
  oak_tree: treeShape(C.leafLight, C.leaf, false),
  pine_tree: treeShape(C.leaf, C.leafDark, true),
  dry_tree: treeShape(C.dryLeaf, "#5f5f2c", false),
  cypress_tree: treeShape("#3e6b4a", "#2c5138", true),
  palm_tree: treeShape("#5f8f52", "#3f6b3d", false),
  field: fieldShape("#b7c06a", "#94a054"),
  wheat_field: fieldShape(C.crop, "#a88a34"),
  vineyard: fieldShape("#9a7f96", C.wine),
  salt_pan: fieldShape("#e4ded0", "#c3bba6"),
  ship,
  bridge_stone: bridgeStone,
  bridge_wood: bridgeWood,
  ford,
  forest_path: forestPath,
  road_marker: roadMarker,
};
