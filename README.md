# Farol da Última Costa

Tower defense incremental para navegador. Um farol numa ilha escura é cercado
por criaturas que sobem do mar. Só a luz as mantém longe.

Feito com **TypeScript + Vite + Canvas 2D**. Mar, ilha, farol, criaturas,
torres, luz, chuva e relâmpagos são **desenhados por código**, sem nenhuma
imagem.

## Como executar

```bash
npm install
npm run dev     # http://localhost:5180
npm test        # testes de lógica e de ritmo de progressão
npm run build
```

A Vercel publica o branch `main` (configuração em `vercel.json`). O progresso
fica salvo no navegador.

## Como se joga

- **O feixe** gira sozinho e fere tudo que ilumina. **Arraste no mar** (ou use
  ← →) para apontar; solte e ele volta a girar.
- **Escuridão de verdade:** fora da luz as criaturas são só olhos brilhando.
- **Pedras da ilha:** toque numa para construir ou melhorar torres:
  - **Lanterna**: ilumina e queima o que chega perto (fere águas-vivas).
  - **Arpão**: longo alcance, dano dobrado em alvo iluminado.
  - **Rede**: prende grupos e deixa lentos.
  - **Sino de névoa**: empurra tudo de volta ao mar.
  Torres dentro do feixe trabalham 60% mais rápido.
- **Lentes:** clara (atravessa carapaça), âmbar (incendeia), azul (desacelera)
  e prisma (três feixes, por talento).
- **Criaturas:** enguias rápidas, caranguejos com carapaça, águas-vivas que só
  sentem luz, sereias que curam as outras e o Kraken a cada 10 ondas.
- **Incremental:** produtores (barco baleeiro, destilaria, vagalumes, farol
  vizinho, frota) rendem óleo sempre, inclusive com o jogo fechado (50% por até
  8 h). Compras ×1, ×10 ou Máx.
- **Sem game over:** se o farol apagar, você recua 3 ondas e mantém tudo.
- **Reconstruir (prestígio):** a partir da onda 20, recomece numa ilha nova
  com memórias. Cada memória dá +4% de dano e óleo para sempre, e elas compram
  talentos (mira automática, prisma, partida rápida, torres veteranas…).

## Estrutura

```
src/data/content.ts   inimigos, torres, melhorias, produtores, lentes, talentos e ilhas
src/game/             estado, economia, simulação (ondas, luz, torres), ações e save
src/render/           mar, ilha por pixel, farol, criaturas, torres, luz e clima
src/ui/hud.ts         barra superior, painel com abas, dicas e avisos
tests/                lógica (feixe, dano, economia, ondas, prestígio, save) e ritmo
```

O teste de ritmo joga 20 minutos com um robô que sempre compra a opção mais
barata e exige que ele passe da onda 15, para o balanceamento não travar.
