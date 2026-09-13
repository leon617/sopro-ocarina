# Fontes de partituras avaliadas

Consulta em **12/09/2026**. Objetivo: ampliar o repertório com foco em jogos/anime e permitir buscar, importar e praticar sem sair do Sopro. Acessibilidade pública não foi tratada como licença universal de redistribuição.

| Fonte | Evidência e decisão |
| --- | --- |
| **Ichigo’s** | Integrado. A busca pública retorna obras, transcritores e links MIDI. As [condições](https://ichigos.com/legal) permitem uso não comercial, proíbem repostagem de MUS/PDF/GIF e reservam a música aos titulares. O Sopro importa apenas o MIDI que a fonte oferece publicamente, para prática local; não hospeda um acervo de cópias nem extrai PDFs. [robots.txt](https://ichigos.com/robots.txt) veda fóruns, que não são consultados. Não há ranking público de popularidade encontrado. |
| **Internet Archive / PublicJukebox** | Integrado via APIs oficiais, com MusicXML e opção de mostrar PDFs incompatíveis. [Automação](https://archive.org/developers/bots.html), [metadados](https://archive.org/developers/md-read.html), [busca](https://archive.org/advancedsearch.php), [contagem de acessos](https://archive.org/developers/views.html). O campo `downloads` engloba visualização/execução e download; rótulo usado: “acessos no Archive”. Consulta restrita a um acervo identificado, licença reconhecida e arquivos públicos. |
| **OpenScore Lieder** | Conector existente mantido. [Repositório oficial](https://github.com/OpenScore/Lieder) CC0, MXL importável; sem estatística pública por partitura. Estrelas do repositório não são usadas como popularidade das músicas. |
| **NinSheetMusic** | Excelente adequação geek: a [FAQ](https://www.ninsheetmusic.org/info/about) informa mais de 5.000 partituras, PDF/MIDI/MUS/MSCZ e popularidade relativa semanal. A rota pública de catálogo respondeu HTTP 403 ao acesso automatizado durante a avaliação. Não contornamos esse bloqueio nem usamos o site de desenvolvimento como espelho. Não foi integrado: um link externo não atenderia ao fluxo solicitado. Nova tentativa depende de acesso permitido/API ou autorização técnica da fonte. |
| **VGLeadSheets** | [Site](https://vgleadsheets.com/) oferece um [CSV público](https://vgleadsheets.com/download/csv) de títulos/jogos para importação em listas, com 1.630 registros na consulta. O conteúdo musical encontrado é PDF; não se confirmou MusicXML/MIDI ou métrica pública de popularidade. Um conector apenas de descoberta não permitiria prática dentro do app, por isso não foi incluído na interface. |
| **MuseScore.com** | Amplo repertório geek e seção de melhores partituras. [robots.txt](https://musescore.com/robots.txt) restringe busca, rotas de download e recursos protegidos. Não foi implementado scraper nem reutilização de endpoints autenticados. O usuário pode importar seus próprios arquivos legitimamente obtidos, mas esse site não é etapa obrigatória do Sopro. |
| **Mutopia** | [Licenças livres](https://www.mutopiaproject.org/legal.html), mas repertório sobretudo clássico e formatos LilyPond/PDF/MIDI. Não priorizado para a preferência geek; nenhuma classificação de popularidade por obra confirmada. |
| **PDMX** | Integrado por uma amostra curada de 58 MXL. Cada registro precisa estar marcado como deduplicado, válido, sem paywall e `no_license_conflict`, com CC0 ou domínio público. O índice separado vem do [MelodicaTrainer](https://github.com/shafranek-js/MelodicaTrainer/tree/main/public/score-library), que documenta a verificação contra o [PDMX v9 no Zenodo](https://zenodo.org/records/15571083). Arquivos são baixados individualmente e verificados por SHA-256; o dataset completo não entra no bundle. |
| **music21 corpus** | [Licenças individuais](https://github.com/cuthbertLab/music21/blob/master/music21/corpus/license.txt), algumas restritivas e dependentes da jurisdição; não se aplica a licença BSD do software a todo o repertório. Fora da prioridade geek. |

## O que significa “popular” no app

A opção **Mais populares** existe apenas quando o conector entrega uma métrica real. Atualmente é o Archive, em ordem decrescente de acessos acumulados na fonte, antes da paginação. Ichigo’s não tem esse ranking público confirmado. Não simulamos classificações nem misturamos acessos, estrelas ou curtidas entre sites.

## Por que MIDI, e não conversão de PDF

MIDI traz alturas e tempos que podem ser convertidos de forma determinística. PDF contém desenho da notação; reconhecer música exige OMR e revisão dos erros. Tratar PDFs como automaticamente importáveis comprometeria a fidelidade. A integração geek usa MIDI de ponta a ponta. Não usa download manual, abertura de outro site, conversor externo ou PDF disfarçado de MusicXML.

## Condições e falhas

Links são resolvidos pela fonte a cada importação e somente para IDs válidos. Mudança de estrutura HTML, retirada do arquivo, expiração de link, 403/429 ou indisponibilidade são apresentados como falha recuperável. A biblioteca local continua funcionando. Licenças e créditos são exibidos dentro do app e preservados no score; não garantimos direitos além dos declarados pela fonte.
