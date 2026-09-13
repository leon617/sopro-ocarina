# Sopro

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-b9cca6.svg)](.github/workflows/ci.yml)
[![Licença MIT](https://img.shields.io/badge/código-MIT-b9cca6.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-offline-ccb36f.svg)](https://sopro-ocarina.videotenir.chatgpt.site)

**[Abrir o Sopro](https://sopro-ocarina.videotenir.chatgpt.site)**

![Biblioteca do Sopro](docs/sopro-preview.png)

Aplicação web bilíngue (português e inglês) para importar MusicXML/MXL e MIDI e praticar ocarina transversal de 12 furos em C, com diagramas SVG próprios e áudio sincronizado. Dados musicais e biblioteca ficam no dispositivo.

## Destaques

- MusicXML, MXL e MIDI com escolha de parte, pauta e voz.
- Digitações próprias em SVG para ocarina Alto C de 12 furos.
- Prática sincronizada, metrônomo, contagem, velocidade e repetição de compassos.
- Adaptação de oitavas e transposição sem alterar silenciosamente o original.
- Biblioteca offline com backup, capas, compositores, favoritos e progresso.
- Catálogo público com importação sob demanda, sem incluir grandes datasets no aplicativo.
- Interface responsiva, instalável como PWA e disponível em português e inglês.

## Executar

Requisitos: Node.js **22.13 ou superior** e npm. As versões exatas estão em `package-lock.json`.

```sh
npm ci
npm run dev -- --port 5173
```

Abra http://localhost:5173. Para a versão de produção e o funcionamento offline:

```sh
npm run build
npm start -- --port 4173
```

Abra http://127.0.0.1:4173, aguarde o primeiro carregamento e a instalação do service worker. HTTPS é obrigatório fora de localhost. A configuração de produção emite um Cloudflare Worker e arquivos estáticos em `dist/`; `npm start` usa o runtime local do Wrangler.

Nenhuma chave de API, conta musical ou variável secreta é necessária. O conector consulta o índice público do GitHub.

## Usar

1. Importe `.musicxml`, `.xml` ou `.mxl`, até 8 MB. Arrastar e soltar também funciona.
2. Confira título, instrumento e voz sugerida. Ouça a prévia.
3. Se houver acordes ou sobreposições, escolha a nota mais aguda ou mais grave. A transformação aparece na tela.
4. Confira o alcance. O perfil usa **alturas reais Lá4–Fá6**, não a oitava transposta de algumas tabelas impressas. Use as sugestões de transposição quando necessário.
5. Salve a música e abra **Praticar**. Espaço reproduz/pausa; setas navegam; R volta ao início; ? abre os atalhos.
6. Ajuste velocidade, contagem, metrônomo e repetição. O intervalo usa a posição na sequência expandida, incluindo repetições.
7. Exporte um backup JSON para transferir a biblioteca ou guardar uma cópia. Restaurar mescla músicas pelo identificador e revalida os XMLs em uma única transação.

A composição original **Jardim ao anoitecer** acompanha a aplicação, sob CC0, com oito compassos, pausa, notas pontuadas, Fá♯, quiáltera, ligadura, mudança de andamento e repetição. O arquivo também está em `public/jardim-ao-anoitecer.musicxml`.

## Arquitetura

- `components/sopro`: interface React, navegação, controles acessíveis Radix/Shadcn e SVGs próprios.
- `core/music/xml.ts`: leitura segura de XML/MXL, parsing MusicXML `score-partwise` para partes, pautas, vozes, compassos e alturas reais.
- `core/music/types.ts`: modelo musical interno. Inícios e durações são números de semínimas, independentes de andamento.
- `core/music/melody.ts`: seleção monofônica, redução explícita por altura, lacunas como pausas, expansão limitada de repetições/casas.
- `core/music/profile.ts`: alcance, geometria, 21 digitações cromáticas e transposição, centralizados.
- `core/audio/player.ts`: Web Audio, relógio único `AudioContext.currentTime`, conversão de tempo musical, agendamento antecipado e cancelamento de osciladores. Ligaduras adjacentes compatíveis compartilham um único ataque.
- `core/storage/library.ts`: IndexedDB versionado, biblioteca e preferências, backup validado atomicamente.
- `core/catalog`: contrato comum e conectores Ichigo’s, PDMX, OpenScore Lieder e Internet Archive, com cache e downloads limitados.
- `app/api/catalog/route.ts`: backend HTTP do catálogo, compatível com Workers.
- `public/manifest.webmanifest` e `scripts/create-sw.mjs`: PWA e cache de recursos gerado depois do build. A biblioteca independe da rede.

React/TypeScript, Web Audio, DOMParser e IndexedDB reduzem dependências no núcleo. `fflate` implementa descompressão incremental. Vitest, jsdom, fake-indexeddb e Playwright cobrem os comportamentos reais. O projeto usa Vite e React estáveis para o cliente e um Worker HTTP pequeno para o catálogo. A estrutura inicial de Sites foi preservada, mas Vinext/SSR não são usados: não há necessidade de renderização de servidor para a biblioteca local. Dependências herdadas e seu lockfile foram preservados para compatibilidade do ambiente; o produto não depende das bibliotecas beta herdadas.

## MusicXML e segurança

O parser lê título/compositor, partes/instrumentos, compassos, `pitch/alter/octave`, armaduras, durações explícitas em `divisions`, notas pontuadas, quiálteras, pausas, `tie/tied`, vozes/pautas, `backup/forward`, fórmulas de compasso, anacruses, tempos e transposição do instrumento. A duração MusicXML é a autoridade; ponto e quiáltera não a multiplicam uma segunda vez. `pitch/alter` ausente significa natural, inclusive com armadura: a altura não é inferida de sinais apenas gráficos.

A redução de polifonia varre tanto inícios quanto finais de notas: se uma voz aguda termina, uma nota grave ainda sustentada pode reaparecer. O aviso deixa explícita essa divisão. Notas fora do alcance permanecem na sequência e no áudio, sem digitação inventada.

Proteções: 8 MB por entrada/XML, 20 MB expandidos por MXL, 128 entradas ZIP, razão declarada de expansão até 200:1, limites de saída reais durante descompressão incremental em blocos de 1 KB, validação de caminhos e `META-INF/container.xml`. XML bloqueia entidades e subconjuntos DTD internos; declarações externas padrão são removidas sem busca de rede. Limites de 100 níveis, 200.000 elementos, 60.000 notas, 3.000 compassos por parte e 120.000 eventos expandidos. O parser não injeta HTML nem executa conteúdo do arquivo.

O processamento é local no navegador. Uma entrada grande dentro dos limites pode ocupar temporariamente a interface; não há worker dedicado de parsing nesta versão.

## Digitações e novos perfis

Veja `docs/digitacoes.md`. Uma ocarina de 12 furos tem **dez aberturas superiores no total (oito principais + dois subfuros)** e dois furos inferiores. Não são quatorze furos.

Para adicionar perfil, crie dados com `id`, `name`, `min`, `max`, `holes`, `patterns` e `sources`, seguindo a ordem documentada. Cada padrão tem doze posições binárias (1 fechado, 0 aberto). Confira todas as alturas com o fabricante; variantes cromáticas dependem do modelo. Adicione testes com posições verificadas. Extraia o perfil como argumento de `fingering`, `transposeEvents` e `suggestTranspositions` e conecte um seletor na interface. Nenhum perfil novo deve ser inferido pelo número de furos apenas. A versão entregue oferece somente o perfil Alto C solicitado.

## Catálogo e novos conectores

O fluxo de busca → importação → escolha da melodia → prática acontece inteiramente no Sopro. O catálogo inicia no **Ichigo’s**, com a busca “Zelda”. Créditos e condições de uso abrem em um diálogo interno; nenhum site externo precisa ser aberto. Nenhuma partitura geek é pré-instalada ou incluída no código-fonte.

| Fonte | Conteúdo | Importação | Popularidade |
| --- | --- | --- | --- |
| Ichigo’s Sheet Music | Jogos e anime; consulta à busca pública do site | MIDI público, para uso pessoal e não comercial | A fonte não publica esse ranking; não é inventado |
| PDMX | 58 partituras curadas do subconjunto `no_license_conflict` | MXL sob demanda, CC0 ou domínio público | Não disponível na amostra |
| OpenScore Lieder | Canções em edições CC0 1.0 | MXL | Não disponível por partitura |
| Internet Archive / PublicJukebox | Partituras históricas com declaração de domínio público ou CC0 | MusicXML; PDFs identificados como incompatíveis | “Mais populares”: campo `downloads`, que inclui leituras, reproduções e downloads |

São 20 resultados por página. **Somente importáveis** fica ativado inicialmente. A classificação de popularidade é habilitada apenas no Archive e ordena a consulta inteira na fonte, antes da paginação. Não mistura métricas de catálogos diferentes. O horário da consulta é mostrado; não são métricas em tempo real. O PublicJukebox pode conter transcrições OMR com erros, avisados antes da prática.

Ichigo’s: `POST /sheets` reproduz apenas o formulário público de pesquisa. O parser HTML extrai título, obra, transcritor, formatos e links MIDI; não renderiza HTML, scripts, anúncios ou imagens da fonte. Os IDs são compostos pela página da obra e ID da transcrição. Antes de importar, a página pública da obra é relida para obter o link MIDI atual fornecido pela própria fonte; nenhum token é inventado ou obtido por autenticação. O backend aceita somente MIDI nesse domínio e não redistribui PDF, MUS ou GIF. Respeita a permissão de uso não comercial publicada pela fonte; não afirma que a composição é de domínio público. Créditos e condições ficam no XML armazenado e sobrevivem ao backup.

PDMX: índice externo separado e leve, com 58 partituras já verificadas como deduplicadas, válidas, sem paywall, não oficiais e pertencentes a `no_license_conflict`. O Sopro carrega cada MXL somente ao importar e confere seu SHA-256. A amostra é mantida pelo projeto público MelodicaTrainer e remete ao registro PDMX no Zenodo; o dataset de 14,4 GB não entra no app. OpenScore: Git Trees API do repositório oficial. Archive: Advanced Search + Metadata API, restrito a `PublicJukebox`, às declarações de licença reconhecidas e sem itens restritos. O campo MusicXML é confirmado nos metadados de cada arquivo: XML de OCR ou de metadados não é confundido com partitura. Itens com vários arquivos abrem uma seleção interna.

Proteções: allowlist HTTPS exata para endpoints e caminhos; nenhuma URL fornecida pelo usuário; IDs/nomes resolvidos contra a fonte; redirecionamentos revalidados (até 3 saltos). Os únicos destinos adicionais de download são nós `iaNNNNNN`/`dnNNNNNN` sob `us.archive.org` ou `ca.archive.org`, mantendo exatamente o item e arquivo originais. Timeout total 12 s por consulta upstream; limites de 2–3 MB para respostas de catálogo, 12 MB para índice OpenScore, 8 MB para MusicXML/MXL e 2 MB para MIDI. Cache limitado em memória: buscas Ichigo’s 10 min, Archive 15 min, OpenScore 1 h; downloads abertos até 16 MB. MIDI do Ichigo’s não entra no cache de downloads. Requisições simultâneas são deduplicadas e limitadas; 30 consultas/minuto por IP por instância; `429`/`403` interrompem consultas e respeitam `Retry-After`. Não contorna login, CAPTCHA, paywall ou bloqueios.

A última busca de cada fonte fica no IndexedDB com fonte, texto, filtro, ordenação e página. Em falha/offline, só se mostra o cache que corresponda exatamente à consulta; resultados de outra pesquisa não são apresentados como resposta. A biblioteca já importada continua independente dos catálogos. Rate limiting/cache são por isolate; uma instalação com várias réplicas deve configurar limites globais na borda.

Para acrescentar uma fonte, implemente `CatalogConnector` (`search`, `files`, `download`) e registre em `core/catalog/server.ts` e `catalogSources` de `types.ts`. Declare os modos de ordenação realmente suportados. Cada resultado deve ter `source`, `importable`, formatos e créditos verdadeiros; popularidade é opcional. Amplie `http.ts` apenas com endpoints necessários, estabeleça licença e limites antes de habilitar download e teste redirecionamentos adversariais. Fontes somente PDF não completam a prática e nunca devem prometer conversão automática. Veja [análise das fontes](docs/catalogos.md).

## Importação MIDI

Aceita `.mid` e `.midi` (SMF tipos **0 e 1**, relógio PPQ), com parser `@tonejs/midi` e validação binária prévia. Limites: **2 MB, 64 faixas, 10.000 notas, 150.000 eventos MIDI e 3.000 compassos**. Tipos 2, SMPTE, truncamento, notas sem término ou com duração nula são rejeitados com mensagem específica.

Cada faixa/canal melódico vira uma parte escolhível. Alturas, início e duração em ticks, mudanças de andamento e fórmula de compasso são preservados **sem quantização**. Notas atravessando barras são divididas com ligaduras; acordes/sobreposições exigem seleção de faixa ou redução explícita para nota mais aguda/grave. As durações não são arredondadas para inventar uma partitura mais simples.

MIDI descreve execução, não toda a notação: os nomes enarmônicos, barras e pausas são reconstruídos. Na ausência de compasso usa-se 4/4; na ausência de andamento inicial usa-se 120 bpm, como no padrão MIDI. Pedal, dinâmica, efeitos, SysEx e pitch bends não são executados; isso é avisado. Percussão é identificada e representada por pausas, com aviso; arquivos exclusivamente percussivos são rejeitados. A ocarina não recebe instrumentos de bateria como alturas falsas.

O núcleo converte MIDI localmente para um MusicXML canônico, preservando avisos e procedência. Esse XML usa a mesma biblioteca, reprodução e backup existentes. O binário MIDI original não é mantido; o backup contém a representação convertida. O módulo de MIDI entra no cache PWA e permite novas importações offline.

## PWA, offline e versões nativas

O manifesto contém nome, escopo, `start_url`, cores, ícones PNG 192/512 e modo standalone. `create-sw.mjs` gera uma versão de cache com hash e lista de arquivos de produção. A navegação tenta a rede e usa o shell salvo quando offline. Arquivos estáticos são cacheados; `/api` e rotas de autenticação não entram no cache. Service worker é ativado apenas no build de produção; não interfere no HMR do desenvolvimento.

A instalação depende do suporte do navegador. Em iOS, use Compartilhar → Adicionar à Tela de Início. Limpar os dados do navegador remove a biblioteca; o backup permite recuperação. Não existe sincronização entre dispositivos.

Capacitor/Tauri: o núcleo musical e a interface não dependem do Worker. Para empacotar, use `dist/client` como `webDir` do Capacitor ou `frontendDist` do Tauri. O shell cliente já é estático e monta `components/sopro/App`; configure a URL HTTPS do backend do catálogo (ou desative Explorar sem rede). Substitua a chamada relativa `/api/catalog` por um adaptador de endpoint permitido, com CORS restrito à origem nativa. IndexedDB e Web Audio permanecem disponíveis na WebView. Adapte seletor de arquivos e persistência ao plugin nativo, se necessário. **Não foram gerados nem assinados binários Android/iOS/desktop**, conforme o escopo de preparação futura.

## Variáveis de ambiente

Nenhuma é obrigatória para o produto.

| Nome | Uso |
| --- | --- |
| `SOPRO_CATALOG_TEST` | Use `1` para incluir o teste E2E do catálogo real, com rede. |
| `SOPRO_TEST_URL` | Endereço da aplicação de produção para os testes E2E; padrão `http://127.0.0.1:4173`. |
| `PLAYWRIGHT_BROWSERS_PATH` | Opcional: diretório dos navegadores de teste. |
| `SITES_RUNTIME_ROOT` | Opcional: diretório temporário de runtime local; padrão `.sites-runtime`. |
| `WRANGLER_SEND_METRICS` | Desativado por padrão nos scripts locais. |
| `CLOUDFLARE_CF_FETCH_ENABLED` | Desativado nos scripts locais para usar dados locais de emulação. |

O starter possui helpers de autenticação Sites, sem dados de usuário incorporados. As credenciais de publicação não são variáveis do aplicativo e não são distribuídas. Consulte `.env.example`.

## Testes

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm start -- --port 4173
# Em outro terminal:
npm run test:e2e
# Opcional: validar também a fonte pública real
SOPRO_CATALOG_TEST=1 npm run test:e2e
```

Testes unitários/integrados cobrem XML/MXL, metadados, alturas/acidentes, duração/ponto/quiáltera, pausas, ligaduras, seleção de voz, polifonia sustentada, múltiplas partes, backup/forward, anacruse, transposição, repetições/casas, entidades, ZIP bombs, digitações, IndexedDB/backup, tempos/relógio/cancelamento/contagem/loop e validação de URLs/rate limiting. Playwright testa o fluxo completo solicitado e layouts em 1440, 768, 390 e 320 pixels. Relatório local em `test-report/` após os testes.

## Limitações musicais conhecidas

- `score-timewise`, tablaturas sem altura e arquivos que não sejam MusicXML são rejeitados.
- Repetições simples e casas numeradas 1–4 são suportadas; repetições aninhadas recebem aviso e leitura linear. D.C., D.S., Coda e Fine recebem aviso e não são executados.
- Notas de adorno são omitidas com aviso; ornamentos, trêmolos, glissandos e slides não são executados. Percussão sem altura vira pausa com aviso.
- Microtons ficam fora do perfil. O áudio de referência pode sintetizar sua frequência, mas não há digitação parcial de furos.
- Tempos explícitos são suportados; indicações verbais como ritardando não são interpoladas. Não há dinâmica expressiva, respiração modelada nem gravação/avaliação do usuário.
- Fórmulas aditivas com o mesmo denominador são somadas; fórmulas compostas com denominadores diferentes usam o primeiro par e geram aviso.
- Um único perfil transversal, na orientação documentada, sem espelhamento automático. O som é uma referência senoidal, não amostra acústica de ocarina.
- Não há conversão óptica de PDF, reprodução em segundo plano garantida nem sincronização na nuvem. Trocar de aba pausa a reprodução para impedir áudio e destaque divergentes.

### Prática, adaptação e biblioteca

- As transições de dedos ignoram pausas e usam a última nota válida. Ocultar pausas afeta somente a apresentação; o relógio e o áudio continuam intactos.
- Novas importações usam o modo recomendado. Os modos estrito, recomendado e flexível comparam ajustes de oitava e transposição por importância estimada: duração, recorrência de alturas/motivos e posição na frase. Notas isoladas e muito curtas recebem menos peso. As porcentagens são heurísticas, não uma medida validada de reconhecimento musical.
- “Original” com transposição zero e simplificação desligada restaura a linha selecionada. O MusicXML armazenado nunca é alterado. Simplificação elimina apenas ornamentos muito curtos entre notas próximas e fecha pausas curtas recorrentes; não encurta a linha do tempo. Notas importantes impossíveis de adaptar continuam sinalizadas.
- Estados de aprendizado, origem, coleção e configurações usam o IndexedDB existente e acompanham o backup. Busca ignora acentos; estados podem ser filtrados e músicas ordenadas por compositor/origem.
- Capas são consultadas sob demanda pela API pública do MediaWiki, apenas para cards próximos da tela. O título e a franquia são enviados à Wikipédia. O Sopro prioriza capas rasterizadas e exibe origem/licença no próprio card, inclusive quando a página identifica uso limitado. Metadados ficam em cache local por 30 dias. Sem correspondência, conexão ou imagem válida, aparece a arte local do Sopro. As capas externas não são redistribuídas no repositório e sua disponibilidade offline não é garantida.
- A instalação aparece somente após `beforeinstallprompt`, fora de modo standalone; desaparece após uso do prompt ou `appinstalled`. O acesso superior abre os créditos; o guia permanece na barra lateral.

## Licença e créditos

O código do Sopro é distribuído sob a [licença MIT](LICENSE). Ao usar, adaptar ou divulgar o projeto, pedimos que mantenha um crédito visível para **Ítalo Araújo como idealizador do Sopro**, com um link para este repositório ou para o site oficial. Esse pedido de atribuição não acrescenta restrições à licença MIT.

A composição de demonstração **Jardim ao anoitecer** é CC0. Partituras encontradas no catálogo mantêm a licença e os créditos informados por suas fontes; a licença do código não altera os direitos dessas obras. Consulte também o arquivo [NOTICE](NOTICE).

Idealizado por **Ítalo Araújo**, com carinho para **Manu Zancatt**. Desenvolvido com apoio do ChatGPT, da OpenAI.

Para contribuir, consulte [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilidades devem seguir [SECURITY.md](SECURITY.md). As mudanças publicadas são registradas em [CHANGELOG.md](CHANGELOG.md).
