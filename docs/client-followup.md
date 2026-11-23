# Acompanhamento comercial e anexos

A aba **Acompanhamento** lista os clientes favoritados pela pessoa autenticada, com os mesmos cards da prospecção, etapa atual, busca, filtros e paginação no servidor. O filtro de etapa é preservado na URL em `researchStage`. O acompanhamento é atual e não é agregado pelos anos dos indicadores do BI.

As sete etapas são Novo Lead, Tentativa de Contato, Em Qualificação, Reunião Agendada, Proposta Enviada, Em Negociação e Fechamento / Contrato. Esta última representa formalização, não uma venda concluída. O status é compartilhado pela equipe do projeto; os favoritos continuam pessoais. Quem favorita pode alterar a etapa, comentar e anexar arquivos. Todos os usuários autenticados que acessam o perfil podem ler seu acompanhamento. Remover um favorito preserva a etapa, os comentários, arquivos e eventos.

`prospect_followups` conserva a etapa e a versão. A mudança de etapa e seu evento são gravados em uma instrução PostgreSQL com CTEs, validando simultaneamente projeto, cliente ativo, favorito do autor e versão. Comentários e confirmações de anexos também verificam a autorização no servidor. O histórico é imutável no banco, com autoria e horário, e reutiliza `HistoryTimeline`, o mesmo componente das tarefas. A paginação do histórico usa data com precisão de microssegundos e UUID como desempate; anexos têm páginas de 12 itens.

## Neon Object Storage

Projeto: `polished-flower-06380805`; branch: `br-still-shadow-bbbagrvp` / `production`; região: `us-east-1`. Bucket criado: **brasilia-client-files**, com visibilidade **Private**. É o armazenamento de objetos nativo do Neon, separado das tabelas PostgreSQL. [Documentação do Neon](https://neon.com/docs/storage/overview).

O cliente usa a API S3 do Neon com path style. Variáveis somente no servidor:

```dotenv
NEON_STORAGE_ENDPOINT=https://br-still-shadow-bbbagrvp.storage.c-15.us-east-1.aws.neon.tech
NEON_STORAGE_REGION=us-east-1
NEON_STORAGE_ACCESS_KEY_ID=
NEON_STORAGE_SECRET_ACCESS_KEY=
NEON_STORAGE_BUCKET=brasilia-client-files
```

A credencial de aplicação usa os escopos `storage:read` e `storage:write`, para leitura, envio e remoção, limitados à branch. Não requer acesso administrativo, funções ou IA. Seu ciclo de vida vai da criação até a revogação/rotação; o segredo deve ficar no ambiente privado local e como Secret do ambiente de produção da aplicação. Nenhuma credencial deve ser versionada ou enviada pelo chat. As variáveis de armazenamento não devem ser distribuídas a previews que não tenham autorização para acessar os arquivos de produção.

O navegador solicita uma autorização ao servidor e envia o arquivo **diretamente para o Neon**, usando formulário POST assinado por cinco minutos. A política fixa caminho, tipo e quantidade exata de bytes, até **20 MiB (20 × 1.024 × 1.024 bytes)**. O corpo do arquivo não passa por Server Actions nem por armazenamento da Vercel; o limite de corpo dessas actions continua em 2 MB.

Antes de publicar a referência, o servidor confere os metadados reais no Neon e copia o objeto para uma chave final nova. A referência e o evento são confirmados atomicamente no PostgreSQL. Reutilizar a autorização do upload temporário não substitui o arquivo já confirmado. O banco armazena nome, tamanho, tipo, autor, bucket e chave; não armazena os bytes do anexo. Downloads exigem autenticação e verificação do projeto, com URL temporária de um minuto e disposição de download. As URLs assinadas não ficam no histórico.

Formatos: PDF, XLS/XLSX, CSV, PNG, JPEG/JPG, WebP, DOC/DOCX, PPT/PPTX, TXT, ODT e ODS. Extensão, MIME e tamanho são validados; arquivos vazios são rejeitados. A origem de CORS permite o domínio canônico de produção e os dois endereços locais de desenvolvimento. `scripts/configure-neon-storage.ts` verifica o bucket privado e configura essas origens, sem tornar arquivos públicos.

Uploads interrompidos podem deixar registros pendentes. Eles não aparecem na lista do cliente, expiram em duas horas e não podem ser confirmados depois disso. Objetos temporários são removidos após a confirmação; pendências expiradas e falhas de remoção podem precisar de limpeza operacional posterior. Regras de lifecycle do S3 não devem ser assumidas como executadas pelo Neon sem verificar a compatibilidade atual.

## Ativação e verificação

1. Aplicar a migration `0009_prospect_crm` no banco alvo; ela inicializa os acompanhamentos dos favoritos já existentes e acrescenta a aba ao projeto automotivo.
2. Configurar a credencial de armazenamento somente após a autorização do responsável, mantendo os segredos fora de logs e argumentos de comando.
3. Executar `node --conditions=react-server --import tsx scripts/configure-neon-storage.ts` com as variáveis do armazenamento no ambiente.
4. Verificar upload e download reais em ambiente de teste, incluindo um arquivo com mais de 4,5 MB e rejeição acima de 20 MB. Conferir histórico, chaves temporária/final e acesso privado antes de publicar.

Os testes isolados cobrem os filtros por etapa, favoritos pessoais e histórico compartilhado, permissão no projeto exato, concorrência, imutabilidade, paginação, limite de tamanho, política assinada e confirmação dos metadados. Testes com armazenamento simulado não substituem a verificação do bucket real.
