#!/usr/bin/env python3
"""
Converte a saída de um gerador de imagem em pixel art de verdade.

Gerador de imagem não produz pixel art: ele produz uma ILUSTRAÇÃO com cara de
pixel art — grade irregular, centenas de cores, bordas borradas e franja
semitransparente no alpha. Este script faz os três passos que faltam:

  1. reduz por vizinho mais próximo até a grade alvo (sem borrão);
  2. quantiza a paleta para um número fixo de cores;
  3. corta o alpha em limiar, eliminando a franja da borda.

Depois recorta ao conteúdo e reemoldura na convenção do projeto: quadrado, com
a base do objeto a 92% da altura — pronto para `src/assets/map/`.

Uso:
    python3 tools/pixelize.py entrada/ saida/ --grid 64 --colors 16
    python3 tools/pixelize.py arvore.png saida/ --grid 80 --center
"""
import argparse
import pathlib
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Falta Pillow:  pip install Pillow")


def pixelize(img: Image.Image, grid: int, colors: int, alpha_cut: int) -> Image.Image:
    img = img.convert("RGBA")

    # Alpha em limiar ANTES de reduzir: senão a franja vira cor de borda suja.
    a = img.getchannel("A").point(lambda v: 255 if v >= alpha_cut else 0)
    img.putalpha(a)

    # Recorta ao conteúdo para a redução não desperdiçar resolução em vazio.
    box = img.getbbox()
    if box:
        img = img.crop(box)

    # Reduz mantendo proporção, lado maior = grid.
    w, h = img.size
    scale = grid / max(w, h)
    img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.NEAREST)

    # Quantiza só os pixels opacos; o transparente não deve entrar na paleta.
    rgb = img.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT).convert("RGB")
    rgb.putalpha(img.getchannel("A").point(lambda v: 255 if v >= 128 else 0))
    return rgb


def reframe(img: Image.Image, center: bool) -> Image.Image:
    """Quadrado, objeto centrado; base a 92% da altura (ou centrado)."""
    box = img.getbbox()
    if box:
        img = img.crop(box)
    w, h = img.size
    side = int(max(w, h if center else h / 0.92)) + 2
    side += side % 2
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    y = (side - h) // 2 if center else int(0.92 * side) - h
    out.paste(img, ((side - w) // 2, y), img)
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("source", help="arquivo .png ou pasta")
    p.add_argument("dest", help="pasta de saída")
    p.add_argument("--grid", type=int, default=64, help="lado maior em pixels (padrão 64)")
    p.add_argument("--colors", type=int, default=16, help="cores na paleta (padrão 16)")
    p.add_argument("--alpha-cut", type=int, default=128, help="limiar de alpha (padrão 128)")
    p.add_argument("--center", action="store_true", help="centrar em vez de apoiar a base (campos, lagos, navios)")
    args = p.parse_args()

    src = pathlib.Path(args.source)
    dest = pathlib.Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    files = sorted(src.glob("*.png")) if src.is_dir() else [src]
    if not files:
        sys.exit(f"nenhum .png em {src}")

    for f in files:
        img = pixelize(Image.open(f), args.grid, args.colors, args.alpha_cut)
        out = reframe(img, args.center)
        out.save(dest / f.name)
        print(f"  {f.name:28} -> {out.size[0]}x{out.size[1]}  ({args.colors} cores)")

    print(f"{len(files)} arquivo(s) em {dest}")


if __name__ == "__main__":
    main()
