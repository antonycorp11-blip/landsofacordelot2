# Texturas do terreno

Ladrilhos **seamless** que substituem a cor chapada das regiões e da água. O
nome do arquivo tem de ser exatamente a chave (veja `src/render/mapTextures.ts`):

    terrain_temperate_valley   terrain_dense_forest   terrain_alpine
    terrain_steppe_march       terrain_sacred_valley  terrain_plains
    terrain_coastal            water

São detectados automaticamente — sem editar código.

**A textura carrega só o detalhe, em tons quase neutros.** A cor vem do polígono
por baixo, para que uma região possa mudar de dono e de cor. Especificação e
prompts: `docs/biomas.md`.
