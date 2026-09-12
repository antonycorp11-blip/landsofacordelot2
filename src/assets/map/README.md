# Arte do mapa

Solte aqui os PNG/WebP finais. O nome do arquivo tem de ser **exatamente** o
`assetKey` (veja `src/render/mapAssets.ts`), por exemplo:

    pine_tree.webp
    mountain_large.webp
    castle_royal.png

São detectados automaticamente e substituem o placeholder vetorial — sem editar
código. Nome que não bate com nenhum `assetKey` é ignorado, com aviso no
console em desenvolvimento.

Especificação de enquadramento e resolução: `docs/biomas.md`.
