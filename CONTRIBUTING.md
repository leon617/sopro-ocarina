# Contribuindo com o Sopro

Obrigado por ajudar o Sopro. Antes de começar, abra uma issue descrevendo o problema ou a melhoria para evitar trabalho duplicado.

## Desenvolvimento

Use Node.js 22.13 ou superior.

```sh
npm ci
npm run dev -- --port 5173
```

Antes de enviar uma mudança:

```sh
npm run typecheck
npm test
npm run build
```

Mantenha o processamento musical local sempre que possível, não remova notas silenciosamente e preserve as mensagens de procedência/licença. Novas digitações precisam de fonte verificável e testes. Novos conectores devem usar fontes autorizadas, downloads sob demanda e as proteções descritas em `docs/catalogos.md`.

Commits devem ser pequenos e descrever o comportamento alterado. Pull requests devem explicar o problema, a solução, como foi testada e qualquer limitação conhecida.

Ao divulgar forks ou adaptações, pedimos que mantenha o crédito a Ítalo Araújo como idealizador do Sopro, conforme o arquivo `NOTICE`. O pedido não altera as permissões da licença MIT.
