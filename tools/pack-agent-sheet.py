#!/usr/bin/env python3
"""
Reempacota uma folha de sprites de agente do mapa.

O gerador entrega os quadros soltos na folha: cada um numa posição diferente
dentro da sua célula, com a bandeira puxando o recorte para um lado. Desenhado
assim, o agente escorrega de lado e sobe e desce a cada quadro.

Esta ferramenta encontra cada sprite pelo alfa, mede onde ficam os CASCOS
(a faixa de baixo do sprite, que é onde a unidade pisa) e reempacota tudo numa
grade regular com o ponto de apoio sempre no MESMO lugar da célula: centro
horizontal, base vertical. Depois disso o mapa só precisa saber a âncora
(0.5, 1.0) — e a arte original não é tocada.

    python3 tools/pack-agent-sheet.py entrada.png saida.png [--cols 4] [--rows 4] [--scale 0.5]
"""
import argparse
from PIL import Image


def bands(flags):
    """Faixas contínuas de `True` — separa as linhas e colunas de sprites."""
    out, start = [], None
    for i, v in enumerate(flags):
        if v and start is None:
            start = i
        if not v and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(flags) - 1))
    return out


def measure(mask, x0, x1, y0, y1, foot_fraction=0.10):
    """Caixa do sprite e o centro dos cascos, dentro da região dada."""
    px = mask.load()
    xs = [x for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if px[x, y]]
    ys = [y for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if px[x, y]]
    bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
    foot_top = by1 - max(2, int((by1 - by0 + 1) * foot_fraction))
    feet = [x for y in range(foot_top, by1 + 1) for x in range(bx0, bx1 + 1) if px[x, y]]
    return bx0, by0, bx1, by1, ((min(feet) + max(feet)) // 2 if feet else (bx0 + bx1) // 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("target")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--rows", type=int, default=4)
    ap.add_argument("--scale", type=float, default=0.5, help="redução final; 1 mantém o tamanho")
    ap.add_argument("--alpha", type=int, default=16, help="limiar de alfa para considerar pixel")
    args = ap.parse_args()

    src = Image.open(args.source).convert("RGBA")
    w, h = src.size
    mask = src.getchannel("A").point(lambda v: 255 if v > args.alpha else 0)
    px = mask.load()

    row_bands = bands([any(px[x, y] for x in range(w)) for y in range(h)])
    col_bands = bands([any(px[x, y] for y in range(h)) for x in range(w)])
    if len(row_bands) != args.rows or len(col_bands) != args.cols:
        raise SystemExit(
            f"esperava {args.rows}x{args.cols} sprites, o alfa mostra "
            f"{len(row_bands)}x{len(col_bands)} — confira a folha"
        )

    frames = []
    for ry0, ry1 in row_bands:
        for cx0, cx1 in col_bands:
            frames.append(measure(mask, cx0, cx1, ry0, ry1))

    # A célula precisa caber o sprite mais largo dos dois lados do apoio e o
    # mais alto. Lados iguais deixam o apoio exatamente no centro horizontal.
    side = max(max(f[4] - f[0] for f in frames), max(f[2] - f[4] for f in frames)) + 1
    cell_w = side * 2
    cell_h = max(f[3] - f[1] for f in frames) + 2

    sheet = Image.new("RGBA", (cell_w * args.cols, cell_h * args.rows), (0, 0, 0, 0))
    for i, (x0, y0, x1, y1, foot) in enumerate(frames):
        r, c = divmod(i, args.cols)
        sprite = src.crop((x0, y0, x1 + 1, y1 + 1))
        # apoio no centro horizontal da célula, cascos na base
        sheet.paste(sprite, (c * cell_w + side - (foot - x0), (r + 1) * cell_h - (y1 - y0 + 1)), sprite)

    if args.scale != 1:
        sheet = sheet.resize(
            (round(sheet.width * args.scale), round(sheet.height * args.scale)), Image.LANCZOS
        )
    sheet.save(args.target)
    print(
        f"{args.target}: {sheet.width}x{sheet.height} · "
        f"célula {sheet.width // args.cols}x{sheet.height // args.rows} · âncora (0.5, 1.0)"
    )


if __name__ == "__main__":
    main()
