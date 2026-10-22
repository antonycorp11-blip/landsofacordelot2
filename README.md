# Dissonância

Roguelike incremental em pixel art, visto de cima em isométrico, com tema de teoria musical. A jogabilidade é inspirada em *Outliers: Incrementum*.

## História: "A Última Nota"

No meio do Grande Concerto, o **Maestro Trítono** rasgou a Partitura Primordial em cinco páginas e **sequestrou a regente Clara** numa gaiola de pautas. As notas soltas azedaram e viraram **Dissonâncias**, que odeiam qualquer som afinado. Antes de ser levada, a Clara pôs a própria alma na batuta, e **você é ela**.

Cortar uma Dissonância é regê-la de volta à afinação, e por isso cada abate rende notas ♪. O tambor do **Tito** é o último som afinado da cidade, e por isso os monstros vão atrás dele. A cada página perdida, o Trítono foge com a gaiola e se funde a um instrumento novo, mudando de forma:
- Regente Mascarado;
- Pianista de Ébano;
- Organista Sombrio;
- Fantasma da Ópera;
- Supremo Desafinado.

O irmão mais novo dela, **Tito**, sai com o seu tambor para recuperar as páginas. A **Dona Fermata** é a velha professora que ensina os dois na oficina. A cada vitória a história avança:
- cenas com retratos;
- o passado do Trítono, que já foi aluno dela;
- um final.

## Cenários

Cada lugar tem visual, luz e objetos próprios:

| Lugar | Visual |
| --- | --- |
| Porão do Teatro | Cortinas de veludo, assoalho de tábuas, piano e refletores |
| Conservatório | Piso xadrez, janelas de luar, harpa |
| Catedral do Órgão | Tubos de órgão, vitrais nas 7 cores das notas, candelabros |
| Ópera em Ruínas | Camarotes dourados, tapete vermelho, lustre caído |
| Coliseu dos Ecos | Arcos de pedra, gramofone gigante |

Os monstros são criaturas musicais:
- notas vivas da cor do seu grau na escala;
- tamborins;
- metrônomos blindados;
- coristas fantasmas;
- sanfonas.

## Como jogar

**Você é o cursor.** Corte os monstros passando o mouse rápido ou arrastando o dedo por cima deles, e proteja o Tito.

- **Exploração:** clique ou toque no chão (ou use WASD) para o Tito andar. Nos **salões** entre as lutas:
  - a Clara quebra caixotes, barris, vasos e caixas de música, que soltam itens (o Tito precisa passar perto para pegar);
  - os **baús musicais** abrem quando você corta as notas do cadeado (um acorde) num traço só;
  - os **ecos de memória** contam o passado da Clara.
- **Habilidades do Tito** (teclas 1 a 4 ou os botões):
  - **Rufar:** todo corte conta como no tempo.
  - **Fortíssimo:** dano dobrado.
  - **Pancada:** atordoa os monstros; atordoados sofrem mais dano.
  - **Metrônomo:** deixa tudo lento.
- **Rastro:** o rastro da batuta corta e evolui na árvore. Há visuais diferentes: Prata, Ouro, Prisma, Brasa e Poeira estelar.
- **Chefes:** cada forma tem ataques marcados no chão (teclas de piano, lustres, rajadas de tubos). Mova o Tito para desviar.

## Na masmorra

- **Corte:** cada acerto gasta **vigor**, o orbe amarelo. Sem vigor, a batuta não corta.
- **Combos:** acertar vários monstros no mesmo traço mostra **N Acertos!**.
- **Armadura:** monstros com armadura precisam ser **quebrados** antes de perder vida. Com a melhoria certa, monstros quase mortos são **executados**.
- **Marcados ◆:** dão cristais e vigor.
- **Teoria musical:**
  - Cada monstro carrega uma nota.
  - Cortar as 3 notas de um **acorde** num traço só (por exemplo Dó, Mi e Sol) causa uma explosão.
  - Cortar no ritmo do tambor do Tito causa dano extra (**No tempo!**).
  - Três notas seguidas em ordem formam uma **escala**.
- **Salas:** são várias salas em sequência. A câmera segue o Tito de uma sala para a outra, e o minimapa mostra o caminho. No fim fica o chefe **Maestro Trítono**.

## Na oficina

- **LIÇÕES:** uma árvore que vai se revelando. Os nós `?` aparecem quando você compra um vizinho. Ela é paga com notas ♪, cristais ◆ e partituras ▤. Dá para liberar acordes menores, o V7, o golpe **Ciclo das Quintas** (desenhar um círculo em volta dos monstros), execução, Estado de Fluxo e outros.
- **CIDADE:** vencer o chefe libera o próximo lugar, numa tonalidade nova do ciclo das quintas:
  - Porão do Teatro (Dó)
  - Conservatório (Sol)
  - Catedral do Órgão (Ré)
  - Ópera em Ruínas (Lá)
  - Coliseu dos Ecos (Mi)

Todo o visual é desenhado por código (sprites em texto) e todo o som é sintetizado em WebAudio: cada corte toca a nota do monstro.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npm run build
```
