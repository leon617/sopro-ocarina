# Fontes e convenções de digitação

Verificadas em 11 de setembro de 2026:

1. STL, compositor interativo: https://www.stlocarina.com/pages/12-hole-c-major-ocarina-fingering-composer
2. STL, tabela oficial completa de doze furos em C: https://cdn.shopify.com/s/files/1/0103/7756/0119/files/12tenorC.pdf
3. Imperial City Ocarina, Alto C, tabela completa em duas páginas: https://www.imperialcityocarina.com/images/cache/ac-12-hole-fingering-chart.pdf
4. Página do instrumento e alcance: https://www.imperialcityocarina.com/alto-12-hole-key-of-c-p341.html
5. Desenho-base indicado pelo pedido, consultado como referência: https://cdn.shopify.com/s/files/1/0103/7756/0119/files/12_hole_c_major_blank.png

As tabelas PDF foram inspecionadas visualmente. Nenhuma imagem STL/ICO integra o produto. A geometria SVG foi desenhada para o Sopro.

Ambas as tabelas escrevem a melodia uma oitava abaixo da altura real do instrumento desta classe (STL chama este registro de Tenor). O perfil Sopro usa Lá4 (MIDI 69) até Fá6 (89); Dó5 é MIDI 72. O intervalo não foi escolhido pela oitava desenhada na pauta.

## Ordem dos bits

`L4 L3 L2 L1 R1 R2 R3 R4 SL SR TL TR`

- L/R: mão esquerda/direita de quem toca.
- 1 indicador, 2 médio, 3 anelar, 4 mínimo.
- SL/SR: subfuro sob o médio da mão correspondente.
- TL/TR: polegares da mão correspondente, separados visualmente embaixo.
- 1 fechado; 0 aberto. As duas mãos se distribuem em diagonais no corpo do instrumento.

| Altura real | Padrão |
| --- | --- |
| Lá4 | 111111111111 |
| Lá♯4 / Si♭4 | 111111111011 |
| Si4 | 111111110111 |
| Dó5 | 111111110011 |
| Dó♯5 / Ré♭5 | 111111100111 |
| Ré5 | 111111100011 |
| Ré♯5 / Mi♭5 | 111111000111 |
| Mi5 | 111111000011 |
| Fá5 | 111110000011 |
| Fá♯5 / Sol♭5 | 111100100011 |
| Sol5 | 111100000011 |
| Sol♯5 / Lá♭5 | 110100100011 |
| Lá5 | 110100000011 |
| Lá♯5 / Si♭5 | 100100100011 |
| Si5 | 100100000011 |
| Dó6 | 000100000011 |
| Dó♯6 / Ré♭6 | 000100100001 |
| Ré6 | 000100000001 |
| Ré♯6 / Mi♭6 | 000100100000 |
| Mi6 | 000100000000 |
| Fá6 | 000000000000 |

Os acidentes usam as digitações cruzadas da tabela, não uma regra inventada de abrir furos em sequência. Subfuros de outros modelos podem estar em posições diferentes; o usuário deve conferir o próprio instrumento. Fontes e padrões são centralizados em `core/music/profile.ts`.

## MusicXML e catálogo

Semântica MusicXML 4.0: https://www.w3.org/2021/06/musicxml40/
Licença e estrutura OpenScore: https://github.com/OpenScore/Lieder e https://raw.githubusercontent.com/OpenScore/Lieder/main/LICENSE.txt
API pública de índice: https://api.github.com/repos/OpenScore/Lieder/git/trees/main?recursive=1
Catálogo da própria comunidade: https://fourscoreandmore.org/openscore/lieder/

A integração usa o índice da API, não scraping da página nem endpoints pagos do MuseScore. As partituras OpenScore têm CC0 1.0; a interface credita o projeto e preserva o link da partitura.

No Ré♯5 / Mi♭5 o perfil adota especificamente a variante STL: Mi5 com o subfuro direito fechado. Há variações na tabela Imperial City, que não foram misturadas ao perfil.
