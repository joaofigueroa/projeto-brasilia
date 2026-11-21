<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Projeto Brasília

Aplicação independente que segue os padrões de engenharia do monorepo Jovens Gênios. Leia `README.md` e `CONTEXT.md` antes de alterar regras de produto.

- Stack: Next.js App Router, React 19 com React Compiler, TypeScript, pnpm, Better Auth, Drizzle, Neon, Tailwind e Biome.
- Leituras em Server Components chamam services. Escritas passam por Server Actions e services. Repositories encapsulam o acesso aos dados.
- Services e repositories usam `server-only`. Não coloque regras de negócio em TSX ou hooks; hooks contêm apenas lógica de interface.
- Valide entradas de services com Zod. Use UUIDv7 e índices em todas as chaves estrangeiras. Identificadores de código e SQL ficam em inglês.
- Use funções, sem classes. Não adicione `useMemo` ou `useCallback` manuais.
- O driver Neon HTTP não suporta transações interativas. Preserve a atomicidade das tarefas, atribuições e eventos e o controle de versão.
- A configuração de projetos é a próxima etapa; preserve os três projetos iniciais e a visão transversal.
- Preserve animações discretas, navegação por teclado, foco visível, responsividade e respeito a movimento reduzido.
- Não versione credenciais, arquivos `.env.local`, bancos locais ou arquivos de acesso. Não registre senhas em logs; mantenha o logging de argumentos das Server Actions desativado.
- Antes da entrega, execute os checks adequados: `pnpm check-types`, `pnpm check`, `pnpm test` e `pnpm build`.
