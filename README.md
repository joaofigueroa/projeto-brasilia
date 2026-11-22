# Projeto Brasília

Plataforma de gestão de pessoas, projetos e tarefas semanais. Aplicação independente em **Next.js 16, React 19, TypeScript, Better Auth, Drizzle e Neon**, seguindo os padrões do monorepo Jovens Gênios.

## Primeira entrega

- Login por e-mail e senha, sessão persistida no banco e logout.
- Papéis de acesso `admin` e `collaborator`, independentes da função profissional.
- Cadastro e configuração de pessoas pelos administradores.
- Perfil com nome, e-mail, função, foto e troca de senha.
- Kanban semanal com status em aberto, em andamento e finalizada.
- Criação e edição de tarefas com projeto obrigatório, múltiplos responsáveis, administrador do card, descrição, prioridade e prazo opcional.
- Arraste com mouse ou toque, navegação por teclado e seletor de status como alternativa.
- Histórico com autor, horário e valores anteriores/novos, preservado no banco.
- Controle de versão para impedir que uma edição sobrescreva outra silenciosamente.
- Imagem do projeto nos cards e na lista de tarefas, com identificação por nome e ícone quando não há imagem.
- Exclusão de tarefas mediante confirmação, disponível para administradores do espaço ou do card, preservando os eventos de auditoria.
- Visão transversal dos projetos e filtros por projeto, semana, responsável e texto, persistidos na URL.
- Seletor de projeto no menu lateral retrátil e filtros acima do Kanban e layout responsivo com animações discretas e respeito a movimento reduzido.

Os projetos iniciais são **Clínica estética**, **Vinhos** e **Peças automotivas**. Administradores podem criar e editar projetos na página **Projetos**, com nome, foto opcional e descrição. Todos os usuários autenticados podem selecionar os projetos no Kanban e no BI. Projetos novos recebem quatro abas iniciais de análise, configuráveis pelos administradores. Alterações de nome preservam a identidade do projeto, as tarefas e as abas existentes; edições concorrentes exigem reabrir a versão atual antes de salvar.

## Inteligência de mercado

A tela **Business Intelligence** combina mapas interativos de UFs e municípios, recortes por Brasil/região/UF/município e seleção de um ou mais anos. Administradores podem configurar abas, registrar análises e possíveis clientes e importar CSV. O mapa usa população do Censo 2022 ou estoque de automóveis de dezembro de 2022–2024, com média anual para múltiplos anos. A aba de veículos mostra apenas modelos de automóveis, com colunas anuais, soma ou média e fonte identificada. Estão carregados os rankings nacionais da Fenabrave de 2022–2024 e as publicações anuais de automóveis do Sincodiv-DF de 2022–2025. O DF e o recorte cadastral Brasília usam os dados locais do DF, com cobertura e fonte identificadas. Outros territórios dependem de dados locais com fonte; não recebem números nacionais por aproximação. A aba de editais consulta o PNCP para cada ano selecionado.

Consulte [fontes, cobertura, permissões e formato de importação](docs/intelligence-data.md) e [operação da pesquisa comercial](docs/commercial-research.md). O 3C Automotive possui levantamento cadastral de CNPJs ativos de Brasília e Goiânia, perfis comerciais com fontes e análises por IA persistidas no banco. Administradores podem atualizar a base, editar evidências comerciais e gerar novas análises pela própria plataforma. Cada empresa possui página própria, com resumo, ficha Google aberta e abas de cadastro, oportunidade comercial e fontes. Cards e perfis usam pequenas logos de montadoras para indicar especialização ou multimarcas. Favoritos são pessoais e aparecem em uma aba com os mesmos cards. As listas de empresas usam paginação no servidor; modelos, registros e editais têm controles de página. Aplique as migrations até `0008_prospect_favorites` antes desta versão.

## Interface

O sistema visual compartilhado está em `src/app/design-system.css`. A identidade usa uma marca vetorial própria, curvas atravessadas por um eixo, e o nome **Brasília**. A composição usa superfícies planas, divisórias e hierarquia tipográfica, com as skills `apple-design` e `emil-design-eng` como referências de interação.

O Kanban combina planejamento semanal, filtro local por dia do prazo, progresso compacto e vistas de quadro ou lista. A lista conserva abertura de detalhes, histórico e alteração de status com as mesmas permissões do quadro. Trocar de semana encerra o filtro de dia. Os filtros de projeto, pessoa e texto continuam na URL.

No BI, o período fica no cabeçalho, as abas organizam a análise e a busca territorial fica junto ao mapa. **Expandir análise** amplia o relatório e preserva o mapa montado, incluindo zoom e posição. No celular, as abas usam um seletor nativo. O relatório de automóveis reúne busca, marca, indicador e consolidação nos mesmos controles, sem alterar fontes ou regras de agregação. O mapa mantém geometrias, cores geográficas e gestos. As siglas permanecem no mapa; as bandeiras das 27 UFs aparecem no hover, no card abaixo do mapa e no contexto do território selecionado. Os arquivos estão em `public/flags`, obtidos da galeria oficial dos Correios com fontes registradas em `src/data/state-flags.json`. Movimentos respeitam a preferência por movimento reduzido.

## Desenvolvimento

Requisitos: Node.js 22 ou superior e pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra <http://127.0.0.1:3000>. A configuração local fica no arquivo ignorado `.env.local`.

### Neon

Copie `.env.example` para `.env.local` e configure uma base dedicada:

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://127.0.0.1:3000
```

Gere um segredo aleatório com pelo menos 32 bytes. Não use variáveis `NEXT_PUBLIC_` para credenciais. Em produção, configure `BETTER_AUTH_URL` com a origem HTTPS da aplicação.

```sh
pnpm db:migrate
```

As migrations criam o schema e os três projetos. Não criam contas de demonstração. Para o primeiro administrador, configure `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e opcionalmente `ADMIN_JOB_TITLE` no ambiente do comando e execute:

```sh
pnpm admin:create
```

A senha deve ter pelo menos 12 caracteres. O comando usa o mesmo hash do Better Auth. Remova `ADMIN_PASSWORD` do ambiente depois do uso. Os próximos acessos são cadastrados na tela **Pessoas** por um administrador. O cadastro público permanece desabilitado.

### Demonstração local isolada

Em um checkout sem `.env.local`, rode:

```sh
pnpm setup:local
pnpm dev
```

Esse comando prepara um PostgreSQL embarcado com PGlite, quatro pessoas e oito tarefas de demonstração. Gera senhas aleatórias em `.local/access.txt`. Não usa nem altera o Neon. A implementação usa as mesmas queries PostgreSQL e as mesmas migrations da aplicação. O driver local é bloqueado em produção.

O setup não sobrescreve uma configuração Neon existente. Para manter os dois ambientes, preserve os arquivos privados separadamente e selecione a configuração antes de iniciar o servidor. Reinicie o processo ao trocar de banco.

## Permissões

| Operação | Admin do espaço | Admin do card | Responsável | Outra pessoa autenticada |
| --- | --- | --- | --- | --- |
| Visualizar tarefas e histórico | Sim | Sim | Sim | Sim |
| Criar tarefa | Sim | Sim, administrando o próprio card | Sim, administrando o próprio card | Sim, administrando o próprio card |
| Editar todos os campos | Sim | Sim | Não | Não |
| Mover entre status | Sim | Sim | Sim | Não |
| Excluir tarefa | Sim | Sim | Não | Não |
| Gerenciar pessoas e papéis | Sim | Não | Não | Não |
| Criar e editar projetos | Sim | Não | Não | Não |
| Alterar o próprio perfil e senha | Sim | Sim | Sim | Sim |

Um colaborador pode administrar um card sem ser administrador do espaço. A função profissional não concede permissões. A aplicação relê o usuário no servidor; alterações de papel não dependem de dados enviados pelo cliente. Um administrador não pode remover o próprio papel administrativo.

Para trocar o e-mail pelo perfil, a aplicação exige a senha atual e encerra as sessões. Na troca de senha, exige a senha atual e revoga as outras sessões. Fotos são normalizadas para 256 × 256 no navegador, validadas no servidor e persistidas como dados de imagem no PostgreSQL. Não existe dependência de serviço externo de arquivos nesta etapa.

## Arquitetura

```text
src/app/                  rotas, layouts e composição de Server Components
src/components/           interface e animações
src/hooks/                estado e interações de interface
src/validators/           contratos Zod
src/types/                DTOs serializáveis
src/server/actions/       escritas iniciadas pela interface
src/server/services/      regras de negócio e autorização
src/server/repositories/  acesso ao PostgreSQL
src/server/security/      Better Auth e sessão
src/server/db/            schema Drizzle e drivers
drizzle/                  migrations versionadas
scripts/                  operação e preparação local
tests/                    integração com PostgreSQL isolado
```

Leituras: **Server Component → service → repository**. Escritas: **interface → Server Action → service → repository**. Services e repositories são `server-only`. As únicas rotas HTTP da aplicação são as rotas de autenticação do Better Auth.

IDs seguem UUIDv7; identificadores de código e SQL usam inglês. Todas as chaves estrangeiras têm índices. O driver de produção é `drizzle-orm/neon-http`, sem transações interativas. Cada gravação de tarefa, responsáveis e evento de histórico usa uma única instrução SQL com CTEs, atômica no PostgreSQL. A atualização só acontece quando a versão esperada e a autorização ainda correspondem à tarefa. Os eventos de auditoria têm um trigger que bloqueia alterações e exclusões. Excluir uma tarefa marca `deleted_at`, incrementa a versão e registra um evento `deleted` com autor e snapshot na mesma instrução SQL. Tarefas excluídas ficam fora de consultas do quadro e não podem ser editadas, movimentadas ou abertas pelo endereço anterior.

Semanas começam na segunda-feira e são armazenadas como `date`, independentes de fuso horário. Datas de auditoria usam `timestamptz`; a apresentação usa `America/Sao_Paulo`.

## Verificação

```sh
pnpm check-types
pnpm check
pnpm test
pnpm build
```

Os testes usam PostgreSQL em memória, migrations reais e o Better Auth. Cobrem permissões, filtros transversais, escrita atômica, histórico imutável, concorrência, hash de senha, sessão HTTP-only, bloqueio de cadastro público e alteração de papel, perfil e revogação de sessões. Não acessam o banco Neon configurado.

Evolução do banco: `pnpm db:generate`, revisão do SQL gerado e `pnpm db:migrate`. Não use `db:push` como fluxo de evolução. As constraints adicionais, o trigger de auditoria e a carga inicial dos projetos estão no SQL da primeira migration.

## Publicação

Na Vercel, importe o repositório `joaofigueroa/projeto-brasilia` e use `main` como branch de produção. O projeto fixa Node.js 24, detecta Next.js e usa o lockfile pnpm nas instalações. Configure `DATABASE_URL` e `BETTER_AUTH_SECRET` somente no ambiente de produção. O segredo de autenticação da hospedagem é independente do ambiente local.

`BETTER_AUTH_URL` pode definir explicitamente a origem HTTPS da aplicação. Quando omitido na Vercel, a autenticação usa o domínio canônico informado por `VERCEL_PROJECT_PRODUCTION_URL`. Não configure uma URL de localhost nas variáveis de produção. Mantenha as credenciais do banco de produção fora dos deployments de preview.

As migrations e o primeiro administrador já foram preparados no Neon dedicado ao Brasília. Novas alterações de schema devem ser migradas e verificadas antes de promover uma versão que dependa delas. Credenciais e o arquivo privado de acesso não são enviados ao GitHub.
