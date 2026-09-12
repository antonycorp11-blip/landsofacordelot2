/**
 * Carregamento automático da arte definitiva.
 *
 * Três pastas, todas por nome de arquivo:
 *
 *   src/assets/map/       sprites        `pine_tree.webp`  → asset `pine_tree`
 *   src/assets/textures/  texturas       `terrain_plains.webp`
 *   src/assets/tilesets/  chão           `grass.png`       → folha `grass`
 *
 * Nenhum código precisa ser editado para adicionar arte, e nada além da
 * aparência muda: posição, colisão, rotas e tempo de viagem continuam vindo
 * do modelo de dados.
 */
import { mapAssets, setAssetUrl } from "./mapAssets";
import { mapTextures, setTextureUrl } from "./mapTextures";
import { knownSheets, setTilesetUrl } from "./tilesets";

// As opções do `import.meta.glob` precisam ser um literal: o Vite as lê em
// tempo de build, antes de qualquer código rodar.
const artwork = import.meta.glob<string>("../assets/map/*.{png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});
const textures = import.meta.glob<string>("../assets/textures/*.{png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});
const tiles = import.meta.glob<string>("../assets/tilesets/*.{png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});

const unknown: string[] = [];

function apply(
  files: Record<string, string>,
  known: Record<string, unknown>,
  register: (key: string, url: string) => void,
): string[] {
  const done: string[] = [];
  for (const [path, url] of Object.entries(files)) {
    const key = path.split("/").pop()!.replace(/\.[^.]+$/, "");
    if (!(key in known)) {
      unknown.push(key);
      continue;
    }
    register(key, url);
    done.push(key);
  }
  return done;
}

const loaded = apply(artwork, mapAssets, setAssetUrl);
const loadedTex = apply(textures, mapTextures, setTextureUrl);
const loadedTiles = apply(tiles, knownSheets, setTilesetUrl);

/** Chaves que já têm arte real; o resto ainda usa placeholder. */
export const loadedArtKeys = loaded;
export const loadedTextureKeys = loadedTex;
export const loadedTilesetKeys = loadedTiles;

if (import.meta.env.DEV) {
  if (loaded.length || loadedTex.length || loadedTiles.length) {
    console.log(
      `%c[Valdória] arte real: ${loaded.length}/${Object.keys(mapAssets).length} assets · ${loadedTex.length}/${Object.keys(mapTextures).length} texturas · ${loadedTiles.length}/${Object.keys(knownSheets).length} folhas de chão`,
      "color:#2e7d32;font-weight:bold",
      [...loaded, ...loadedTex, ...loadedTiles].join(", "),
    );
  }
  if (unknown.length) {
    console.warn(
      `[Valdória] arquivos ignorados — o nome precisa ser exatamente um assetKey ou uma chave de textura: ${unknown.join(", ")}`,
    );
  }
}
