# Pesquisa comercial — 3C Automotive

## Base e cobertura

A carga de novembro de 2026 usa a competência **2026-10** do cadastro CNPJ da Receita Federal, disponibilizada no espelho público `ArthurKrieger/cnpj-dados-receita-brasil-2026-10` no Hugging Face. O endereço oficial retornou acesso negado no momento da pesquisa. O espelho é identificado em cada perfil; não é uma API oficial da Receita.

Escopo: situação cadastral ativa (`02`), município RFB 9701 (Brasília, IBGE 5300108) ou 9373 (Goiânia, IBGE 5208707), com CNAE principal **ou secundário** 4520001, 4520003, 4520004, 4530701 ou 4530703. A carga examinou os dez arquivos de estabelecimentos e os dez de empresas, sem baixar QSA/CPFs. Resultado: **15.681 Brasília + 15.300 Goiânia = 30.981 CNPJs distintos**. A atividade é principal em 7.552 e 8.011, respectivamente. Aparecida de Goiânia não é agregada a Goiânia.

Isso cobre o critério cadastral definido, sem afirmar que todas as empresas atendem automóveis de passeio ou estão operando. Especialização, multimarcas, demanda e fundação da marca ficam a confirmar quando não há fonte comercial. Capital social é da pessoa jurídica, não faturamento ou orçamento da filial. Não se deve somar capitais de filiais.

Os perfis comerciais da entrega inicial permanecem quando o CNPJ é inequívoco e elegível. Identidades ambíguas e CNAEs fora do escopo são arquivados, sem exclusão física, e continuam acessíveis por relatórios antigos. Perfis apenas cadastrais não recebem evidências comerciais inventadas. Administradores podem enriquecer o perfil, informando fonte e evidência; conflitos exigem reabrir a versão atual.

## Atualização pela plataforma

Em Possíveis clientes, selecione Brasília ou Goiânia e use **Atualizar cadastro**. O serviço descobre a competência mais recente nos espelhos públicos permitidos e executa lotes retomáveis. A aba pode ser pausada e a atualização retomada. Cursor, fonte, fase, prazo de processamento e mensagens ficam no banco; um lote não substitui dados comerciais editados. Nenhuma publicação de código é necessária.

Se a competência já estiver importada, o serviço informa que a base está atualizada. O endpoint de consulta do espelho pode estar indisponível ou com índice em preparação; nesse caso, os perfis atuais e o progresso são preservados. Não há promessa de disponibilidade contínua do fornecedor. A carga inicial completa foi feita a partir dos Parquets, pois a consulta filtrada estava preparando o índice.

Para repetir a carga operacional em um checkout seguro:

```sh
# Requer duckdb no ambiente Python. Arquivos públicos ficam em .local, ignorados pelo Git.
python3 scripts/prepare-company-census.py
# Valida integralmente antes de gravar; sem --apply é apenas conferência.
node --conditions=react-server --import tsx scripts/import-company-census.ts .local/research-runtime/census/companies.json
node --conditions=react-server --import tsx scripts/import-company-census.ts .local/research-runtime/census/companies.json --apply
```

Confira o ambiente de banco antes de usar `--apply`. A importação aplica migrations, mantém a identidade dos projetos e não altera usuários, tarefas ou fotos. Uma competência já concluída com a mesma quantidade não é reimportada.

## IA e custos

**Conectar IA** permite ao administrador salvar uma chave Gemini e escolher um modelo com faixa gratuita. O administrador cria a chave no Google AI Studio, aceita os termos e usa um projeto sem faturamento, sujeito às quotas e disponibilidade do Google. A plataforma não habilita cobrança nem cria projeto Google Cloud. Não envie chaves pelo chat. A chave é criptografada com AES-256-GCM, derivada de `BETTER_AUTH_SECRET`, nunca devolvida à interface; trocar esse segredo exige reconectar a chave.

A geração usa AI SDK, saída estruturada validada, timeout e nenhum retry automático. Envia catálogo, totais da cidade e amostra estratificada de até 50 perfis públicos; não envia tarefas, avaliações manuais do Google ou anotações privadas. A análise não representa pesquisa individual dos 30 mil CNPJs. Conserva contagem, amostra, modelo, data e fontes. Falhas e quotas preservam a versão anterior. Novas gerações têm intervalo mínimo e exclusão de concorrência por cidade. A análise inicial fica explicitamente identificada até ser substituída.

Opcionalmente, ambientes já configurados podem usar `GOOGLE_GENERATIVE_AI_API_KEY` ou `AI_GATEWAY_API_KEY`. Não há fallback automático para créditos ou faturamento da Vercel. O acesso real à geração precisa de chave válida; testes automatizados usam mocks sem chamadas pagas.

## Google Maps sem faturamento

Cada empresa da pesquisa tem página própria em `/clientes/[id]`, autenticada e associada ao projeto. Os cards e as referências dos relatórios abrem essa página; o retorno conserva território, anos, filtros e página da lista. O resumo, contatos e iframe Google permanecem na área principal. O Google carrega ao entrar, sem expansão ou recolhimento; trocar as abas de informações não desmonta o mapa.

As abas separam **Cadastro**, **Oportunidade comercial**, **Fontes e evidências** e **Consultas do Google**. Capital social permanece no cadastro, fora dos cards e do resumo. Edição comercial e registro de consultas continuam restritos a administradores.

A busca incorporada gratuita usa nome, endereço e cidade, sem chave de API. Resultados podem ser ambíguos ou não existir para determinado CNPJ; a interface pede conferência e oferece refinamento temporário.

Administradores podem fixar a ficha exata em **Consultas do Google → Registrar consulta → Ficha exata**, colando o código de Compartilhar → Incorporar um mapa. Apenas o endereço HTTPS `google.com/maps/embed?pb=…` é extraído e validado; o HTML não é renderizado. Endereços externos, API com chave, credenciais em URL e caminhos diferentes são rejeitados. A referência fica no JSON versionado da consulta, sem migration adicional.

O Google controla o conteúdo incorporado: nota e quantidade de avaliações podem aparecer, mas comentários completos são abertos pelo próprio Google Maps. Não se deve prometer leitura completa dos comentários dentro do iframe. Consultas manuais ficam em uma aba própria e continuam distintas da ficha atual.

Os cards mostram apenas os dados de prospecção e a estrela de favorito. O Google Maps fica na página do cliente; a aba de consultas oferece o link externo como alternativa. Administradores podem registrar nota, quantidade de avaliações, data e até cinco trechos breves, com autoria e fonte. A interface distingue consulta manual de sincronização e não mostra zero quando a nota é desconhecida. Não há scraping ou integração Places habilitada. A API Places exige faturamento; a chave de demonstração não oferece avaliações nem serve para produção.

## Paginação e permissões

Empresas: filtros e paginação no PostgreSQL com 10, 20 ou 50 resultados; contagem e filtros consideram a base completa, não só a página. Município, projeto e filtros ficam na URL. Trocar território ou filtro retorna à primeira página. Veículos, registros e editais paginam a base disponível, preservando seus limites de cobertura publicados. Paginar não expande a amostra PNCP nem o ranking da fonte.

Somente administradores atualizam cadastro, editam perfis, registram Google ou conectam/geram IA. Pessoas autenticadas podem consultar os resultados. Todas as escritas validam papel e projeto no servidor, usam controle de versão ou lease e não confiam em permissões da interface.


## Favoritos pessoais

A estrela nos cards e na página salva uma seleção pessoal da conta autenticada. A aba **Clientes favoritados** do 3C Automotive reutiliza os mesmos cards, filtros territoriais, busca e paginação SQL. Favoritar não altera prioridade, cadastro ou a seleção de outra pessoa. Administradores e colaboradores podem manter seus próprios favoritos; somente o servidor escolhe o usuário autor da escrita.

A migration `0008_prospect_favorites` cria a relação única usuário/empresa, com UUIDv7 e índices nas FKs, e inclui a nova aba sem recriar projetos ou perfis. A publicação usa duas etapas: preparar os seis primeiros blocos idempotentes de DDL da migration (tabela, FKs e índices), publicar o código e então executar a migration completa, que habilita a nova aba. A versão anterior não recebe o tipo `favorites` antes do novo código. A preparação não cria favoritos, não altera posições de abas e não registra a migration como aplicada. O migrator grava a versão somente ao concluir o arquivo completo.
