# Validação da entrega

Data: 12/09/2026.

- TypeScript: `npm run typecheck`, sem erros.
- Vitest: 46 testes passando em 5 arquivos.
- Build de produção: cliente Vite/React + Worker ESM, concluído.
- Playwright: 7 cenários verificados, incluindo consultas e importações reais do OpenScore, Ichigo’s, PDMX e Internet Archive com `SOPRO_CATALOG_TEST=1`.
- Fluxo validado: importar XML → conferir parte/voz → ouvir prévia → salvar → gerar 12 compassos com repetição → tocar → mudar velocidade sem interromper o estado de reprodução → configurar intervalo → pausar/retomar → voltar à biblioteca → recarregar → reabrir com velocidade persistida → desligar a rede → recarregar o shell offline → abrir e reproduzir a música local.
- MXL real de Jane Bingham Abbott, Just for Today, OpenScore CC0: descompressão, múltiplas partes e geração de melodia verificadas, além de importação pela interface do catálogo.
- PDMX real: busca por Amazing Grace, importação do MXL curado em `no_license_conflict`, escolha da melodia, salvamento, prática e reprodução verificados pela interface.
- Visuais: biblioteca, prática e erro de importação verificados em desktop e celular. Larguras 1440, 768, 390 e 320 px. Sem transbordamento horizontal, controles de reprodução acessíveis. Polegares ganharam fundo claro separado para contraste.
- Segurança testada: entidades XML, XML inválido, caminhos de arquivo, bombas ZIP, arquivos grandes, redirecionamentos SSRF, host/porta/credenciais de URL, limite de download e rate limiting.
- Digitação: tabelas oficiais inspecionadas; variante STL de Mi♭5 preservada explicitamente. SVG com oito furos superiores principais, dois subfuros e dois polegares.

Os testes de áudio verificam agendamento/cancelamento, integração de tempos, loop, contagem e relógio visual. O fluxo de navegador usa o Web Audio real; não houve avaliação auditiva humana do timbre nem verificação física com um instrumento. Compatibilidade nativa de Safari/iOS/Android não foi executada neste ambiente. Os binários Capacitor/Tauri ainda não fazem parte desta versão.

Atualização MIDI e catálogo: importação local de SMF 0/1, seleção de faixa, avisos de conversão, persistência e nova importação MIDI offline verificadas. Busca real por Song of Storms (Zelda) no Ichigo’s, créditos internos, importação MIDI, reprodução e recarga, sem abrir outras abas. Archive: ordem real por acessos, paginação, resolução e importação de MusicXML e cache isolado por consulta. A troca de fonte remonta o seletor de ordenação para preservar opções válidas. Capturas do catálogo verificadas em 1440, 390 e 320 px, sem transbordamento horizontal.
