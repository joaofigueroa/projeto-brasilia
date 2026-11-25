# Inteligência de mercado

O contexto selecionado no menu lateral acompanha a navegação. O Kanban mantém a opção Todos os projetos. BI exige um projeto e conserva o território e os anos ao alternar negócios; a aba é redefinida porque pertence ao projeto.

## Modelo e permissões

`analysis_tabs` define visões por projeto, com nome, tipo, ordem, segmentos e termos para consulta de editais. Os tipos iniciais são mercado, possíveis clientes, veículos, oportunidades e notas. O nome e as categorias são configuráveis; novas abas não exigem criar colunas no banco. O tipo de uma aba existente é preservado para não reinterpretar seus registros.

`intelligence_records` armazena registros por aba, território e ano, com indicador, valor decimal, unidade, categoria, situação de abordagem, fonte e notas. Características como marca, modelo, tipo, ano de fabricação e contato ficam em `details`. O escopo geográfico é validado pelo código IBGE: um município deve pertencer à UF informada. Ano de fabricação é uma dimensão do veículo e não substitui o ano de referência do registro.

Todos os usuários autenticados podem consultar. Administradores configuram abas, cadastram, editam e importam registros. Edições de abas e registros usam versão esperada para impedir sobrescrita silenciosa. O registro conserva seu território de origem quando editado a partir de uma visão agregada.

A lista de uma UF inclui seus municípios; a de uma região inclui suas UFs. Registros quantitativos de níveis diferentes são exibidos individualmente e não são somados automaticamente, evitando contar simultaneamente um total de UF e seus municípios. O painel limita a lista a 500 registros e informa esse limite quando alcançado.

## Fontes carregadas

- IBGE: malhas simplificadas das 27 UFs e dos municípios de cada UF; catálogo de municípios e regiões; população residente do Censo 2022, tabela SIDRA 4714, variável 93.
- Senatran: frota por município e tipo, posição de dezembro de 2022, 2023 e 2024. Os totais nacionais conferidos são 115.116.532, 119.227.657 e 123.974.520 veículos.
- Fenabrave: página 7 dos boletins de dezembro de 2022, 2023, 2024 e 2025, tabela acumulada anual de AUTOMÓVEIS, 50 modelos por ano. A tabela vizinha de comerciais leves é excluída. Abrangência nacional; os boletins não fornecem esses mesmos dados por município ou UF.
- Sincodiv-DF: seção AUTOMÓVEIS dos rankings anuais de 2022–2025. Fonte primária setorial, com quantidades mensais e total anual do DF. A classificação da entidade é preservada; comerciais leves e demais tipos são excluídos. Não é uma publicação governamental de vendas.
- PNCP: consulta pública por UF, município e período. São consultadas a primeira página de pregão eletrônico e a primeira página de dispensa (até 50 publicações cada), com limite de oito segundos por chamada e cache de uma hora. Os termos são aplicados ao objeto da compra. O painel informa a amostra, o total informado pela fonte, o período e falhas parciais; não faz busca nos anexos.

Dados do CNPJ e CNES são referências oficiais para prospecção. A base integral de empresas não foi carregada. Não há números artificiais de mercado, listas fictícias de clientes ou vendas inferidas de frota.

A população permanece identificada como Censo 2022, qualquer que seja o ano do filtro. A frota de outros anos aparece como indisponível, não zero. O ano de referência inicial é 2024. O seletor aceita de um a dez anos, consecutivos ou não, e preserva a seleção na URL (`years=2022,2024`); URLs antigas com `year` continuam válidas. Registros e séries exibem somente os anos selecionados. A população é uma referência única, sem multiplicação pelo número de anos.

A correspondência Senatran → IBGE usa UF e normalização exata do nome, com poucos aliases explícitos. Nomes divergentes não são aproximados. As linhas não vinculadas estão em `fleet.json.unmatched`; os totais estaduais preservam todas as linhas oficiais. A interface mostra quantos códigos municipais possuem frota vinculada. Municípios criados depois da coleta podem não ter população de 2022 ou frota disponível.

## Mapas e consolidação

O mapa alterna entre estados e municípios da UF selecionada. Clicar em um município atualiza o painel e o seletor de território; os mapas de estados e municípios permitem zoom de 1× a 6×, arraste por mouse ou toque quando ampliados e identificação por nome junto ao cursor. Um gesto de arraste não seleciona o território ao soltar. O mapa municipal mantém navegação por teclado. Áreas sem dados continuam clicáveis; a hachura indica falta de cobertura completa para os anos selecionados. Contornos selecionados e em hover são desenhados em uma camada sobre todas as áreas, evitando que vizinhos ocultem a borda. DF conserva sua geometria e um alvo ampliado no mapa nacional. Códigos recentes sem geometria no arquivo oficial são sinalizados.

A camada Automóveis usa apenas a classificação AUTOMOVEL da Senatran, não o total de veículos. Para múltiplos anos, mostra a média dos estoques de dezembro e exige dados para todos os anos selecionados; uma lacuna deixa o indicador indisponível. Não representa vendas.

A visão de veículos contém apenas modelos classificados como automóveis, com marca, modelo e indicador `sales` ou `registrations`. Motocicletas, comerciais leves, caminhões, observações sem classificação e registros de estoque ficam fora dessa visualização. Os dados continuam armazenados para preservar o histórico. A busca por modelo e o filtro de marca operam sobre as linhas disponíveis.

Os rankings Fenabrave são mostrados exclusivamente no recorte Brasil e no indicador Emplacamentos. O botão de referência nacional troca explicitamente o território, sem atribuir números nacionais ao município. A soma e a média usam os anos selecionados com valores disponíveis. Ausência no top 50 não é zero: a linha fica identificada como parcial, com a quantidade de anos disponíveis. Anos sem boletim carregado não são inferidos. Vendas informadas usam somente cadastros ou CSV com fonte. Emplacamentos no DF e no recorte cadastral Brasília (IBGE 5300108) usam os rankings locais do Sincodiv-DF; Mato Grosso recebe a lista anual da Fenabrave-MT para 2024. A lista de MT soma 31.513 unidades, enquanto o resumo anual informa 31.541; a diferença de 28 permanece sem atribuição por modelo. Nenhum total estadual é emprestado à capital Cuiabá. As demais séries territoriais permanecem sem dados por modelo carregados. O recorte Brasília cobre todo o DF e não representa o Plano Piloto ou uma região administrativa. Totais do DF não são atribuídos a municípios de outras UFs nem usados como total da região Centro-Oeste.

Uma linha consolidada exige a mesma marca, modelo, categoria, unidade, fonte e território exato. Totais estaduais e seus municípios ficam em linhas diferentes; fontes distintas também. Observações repetidas para a mesma combinação e ano são marcadas para revisão e excluídas daquela célula, impedindo dupla contagem. Não há total geral que misture níveis geográficos.

O PNCP consulta separadamente a janela dos últimos 31 dias de cada ano selecionado. O painel lista as janelas reais, soma a cobertura consultada e remove resultados duplicados. Isso não representa a cobertura integral dos anos.

## Pesquisa de cobertura local — 21/11/2026

**Revisão de 22/11/2026:** esta primeira pesquisa foi insuficiente para concluir o mapeamento. O [novo inventário das 27 UFs e capitais](vehicle-registration-sources.md) confirma, entre outras fontes abertas, modelo × município × período no Detran-SC, contagens municipais por tipo no Sincodiv-ES e totais anuais das 27 UFs na Anfavea. As limitações descritas abaixo são o estado da coleta anterior, não evidência de inexistência de dados públicos. Séries novas de pesquisa ainda não estão importadas na aplicação.

A pesquisa identificou uma limitação de acesso, sem converter estoque em vendas:

| Fonte primária | Conteúdo verificado | Uso na aplicação |
| --- | --- | --- |
| [Senatran / RENAVAM](https://dados.transportes.gov.br/dataset/registro-nacional-de-veiculos-automotores-renavam) | Inventário de frota por UF, município e marca/modelo | Estoque, sem inferência de vendas a partir de fabricação ou diferença entre estoques. |
| [Serviço oficial Serpro](https://www.gov.br/pt-br/servicos/contratar-arquivos-estatisticos-denatran) | Arquivos de emplacamentos e distribuição regional; acesso depende de autorização, contrato e homologação | Nenhum contrato ou acesso foi aberto. O usuário informou não possuir acesso contratado. O leiaute e a cobertura histórica ainda precisam ser obtidos para uma integração. |
| [Fenabrave DMP](https://www.fenabrave.org.br/Dados/index2.html) | Dados de modelos e municípios para assinantes | Não acessado sem credenciais ou contratação. |
| [Sincodiv-DF](https://sincodivdf.com.br/emplacamentos/) | Rankings anuais abertos com marca, modelo, meses e total do DF | 2022–2025 carregados, somente seção AUTOMÓVEIS. |
| [Sincodiv-MG](https://www.sincodiv-mg.com.br/servicos/emplacamentos/) | Informativos regionais publicados | Não foi obtida série anual por modelo e município para importação. |
| Fenabrave-SC | URLs antigas indexadas dos boletins anuais de 2022/2023 retornaram HTML na coleta, sem o PDF original | Não importados de cache de busca ou notícias secundárias. |

A cobertura municipal de todo o Brasil permanece **incompleta**. A aplicação mostra os anos disponíveis e ausentes, identifica a abrangência integral do DF e permite voltar explicitamente à referência nacional. Nenhum resultado nacional é distribuído entre estados ou municípios por estimativa.

O extrator do DF confere a soma de todos os totais anuais dos modelos com o total da seção: 32.580 (2022), 36.853 (2023), 44.307 (2024), 50.029 (2025). Também confere os meses de cada linha. O Honda Civic de 2023 tem total publicado 18 e soma mensal 34: o valor fica nulo com aviso, sem decidir arbitrariamente qual número é correto. Linhas de mesmo rótulo na publicação são agrupadas; o alias de marca VOLKSWAGEN → VW permite comparar o Nivus entre anos sem alterar seu nome de modelo. O total de uma seção não é usado como quantidade de vendas de outra classificação.

## Reprodução dos dados estáticos

`src/data/official/provenance.json` registra os URLs de entrada, as datas das coletas e o SHA-256 dos arquivos recebidos. A coleção adicional `municipalities-and-models` contém as 27 malhas municipais e os três boletins Fenabrave. Baixe os arquivos com os nomes indicados no manifesto para uma pasta temporária, mantendo a validação TLS habilitada. Em um ambiente Python isolado, instale `xlrd==2.0.2` e `openpyxl==3.1.5` e execute:

```sh
python scripts/prepare-official-data.py /caminho/para/as/fontes
```

O script gera os limites SVG, o catálogo geográfico e as séries de frota. Valida os totais nacionais antes de gravar as séries. Python é apenas uma ferramenta de preparação offline; a aplicação continua integralmente em Next.js e Neon. O build não baixa planilhas nem depende dessas bibliotecas Python.

Os arquivos adicionais devem ficar em outra pasta, com as malhas nomeadas `{UF}.json` e os relatórios `{ano}.pdf`. Execute:

```sh
python scripts/prepare-municipal-maps.py /caminho/para/municipalities-and-models
python scripts/prepare-car-models.py /caminho/para/municipalities-and-models
```

O segundo comando usa `pdfplumber` e valida a sequência dos 50 modelos de cada tabela anual antes de salvar. As geometrias são compactadas offline; somente a UF aberta é enviada para o mapa no navegador. Nenhum download de PDF ou malha ocorre no build.

A coleção `regional-models` registra os quatro PDFs do DF no manifesto. Para reproduzir a extração com `pdfplumber`:

```sh
python scripts/prepare-regional-car-models.py /caminho/para/regional-models
```

O extrator exige o ano e território no cabeçalho, interrompe a leitura no primeiro total da seção AUTOMÓVEIS e conserva SHA-256, páginas e intervalo anual. As diferenças entre classificações de fontes e anos aparecem na cobertura; ausência de um modelo não vira zero.

## CSV

O modelo está em `public/templates/intelligence-records.csv`. A tela aceita arquivo ou conteúdo CSV colado; quando os dois são informados, o arquivo é utilizado. Aceita UTF-8 com BOM, delimitador vírgula ou ponto e vírgula e campos entre aspas, inclusive notas com quebras de linha. Limite: 500 linhas e 500 KB. Use números sem separador de milhar; ponto decimal, ou vírgula decimal quando o delimitador for ponto e vírgula.

Campos mínimos: `title` e `source_name`. Indicadores numéricos exigem `value`, `metric` e `source_url`. `metric` aceita `context`, `market_size`, `fleet`, `sales` ou `registrations`. `status` aceita `new`, `contacted`, `qualified` ou `discarded`.

Cada lote é associado ao ano explicitamente selecionado no formulário de importação. Importe um lote por ano para construir uma série. O cadastro individual também permite escolher um dos anos do período; ao editar, o registro conserva o ano e o território originais. Para modelos de automóveis, informe `make`, `model`, `vehicle_type=Automóvel` e `metric=sales` ou `registrations`.

O arquivo inteiro é validado antes da gravação. O lote usa uma única instrução PostgreSQL. A chave de importação considera território, ano, título, categoria, indicador, dimensões e URL da fonte; reimportar a mesma observação atualiza valor, unidade, notas e situação sem duplicar. Linhas repetidas no mesmo lote são rejeitadas.

## Evolução

Novas integrações devem conservar fonte, periodicidade, definição do indicador, abrangência e dimensão territorial. Receitas, vendas, emplacamentos e estoque são medidas distintas. Estimativas de mercado precisam registrar premissas nas notas. Administradores podem criar e editar projetos com nome, foto e descrição. Novos projetos começam com quatro abas genéricas; segmentos e fluxos podem ser configurados em seguida. Alterar o nome mantém as abas e os registros associados ao mesmo projeto.

## Sistema visual

A interface usa o sistema compartilhado `src/app/design-system.css`, carregado após os estilos estruturais. Navegação clara, marca vetorial própria, superfícies planas e divisórias organizam o espaço. O período fica no cabeçalho; a busca por região, UF e município pode ser aberta junto ao mapa. As abas ficam acima do espaço de análise; no celular, usam um seletor. **Expandir análise** esconde visualmente o mapa sem desmontá-lo e preserva seu zoom e arraste. Os filtros de modelos aparecem juntos; a cobertura completa fica acessível abaixo da tabela, com a nota principal da fonte antes dos resultados.

As geometrias, cores geográficas, hover, cliques, teclado e gestos do mapa são preservados. Movimentos usam molas sem overshoot por padrão e respeitam movimento reduzido. O mesmo sistema visual cobre login, tarefas, pessoas, perfil, BI, seletores e diálogos.

## Pesquisa comercial 3C Automotive

A versão `2026.11.22.1`, em `src/data/research/3c-automotive.json`, contém 12 perfis (seis por cidade), seis referências técnicas do catálogo e duas análises iniciais elaboradas por IA. O conjunto é vinculado à identidade original do projeto automotivo, preservada quando renomeado para **3C Automotive**. Não é uma lista de clientes ativos, um censo de estabelecimentos ou uma estimativa de demanda.

**Possíveis clientes** apresenta a pesquisa com busca por empresa, marca, bairro ou CNPJ, filtro de segmento e sugestão de prioridade. O perfil distingue fundação declarada, abertura do estabelecimento, matriz/filial, capital da pessoa jurídica, CNAE, especialização, fontes, exemplos do catálogo e pendências. Dados não confirmados ficam explicitados. Nenhuma empresa foi contatada. Não foram armazenados QSA, CPF, dados pessoais de sócios ou contatos privados.

As declarações de especialização e serviços vêm dos sites das próprias empresas quando localizados. Os cadastros foram consultados via BrasilAPI (`/api/cnpj/v1/{cnpj}`), intermediário de dados públicos, e não constituem um comprovante oficial emitido pela Receita Federal. Publicações governamentais ajudam a confirmar identidade; diretórios de terceiros permanecem identificados. Datas de consulta não garantem a atualidade da base cadastral. Capital social não é receita, crédito ou orçamento de compra; não deve ser somado entre filiais da mesma pessoa jurídica.

A Auto France permanece com dois CNPJs candidatos e capital/abertura não atribuídos à marca. França Multipeças tem CNAE principal de peças usadas, exigindo validação para peças novas. Francecar requer confirmação da especialização em canal próprio; Aguilera e VP requerem validação de operação e portfólio. Polipeças Brasília/Goiânia constituem estabelecimentos do mesmo grupo cadastral, não dois clientes independentes para somar capital. Não foi utilizado o site de desmanche de nome semelhante encontrado na busca da Polipeças.

A aba **Inteligência comercial** é criada pela migration `0004_commercial_research` no projeto automotivo. Relatórios separam fatos vinculados aos perfis de hipóteses de prioridade, próximos passos, critérios de avanço e agrupamentos de visita. As recomendações são uma análise inicial produzida por IA e armazenada com a aplicação: não há chamada paga a provedor, regeneração automática, monitoramento contínuo ou envio de dados do usuário a um modelo externo nesta versão. Uma nova pesquisa exige uma nova versão do conjunto e das análises. Referências de produtos foram conferidas nas fichas do catálogo; a aplicação exata deve ser validada antes de cotar.

Perfis e análises retratam a data da pesquisa e não são filtrados ou somados como se fossem séries anuais. Os registros manuais da equipe mantêm seu ano e aparecem separadamente. O filtro de múltiplos anos continua aplicável aos indicadores, veículos e notas anuais. Em recortes agregados, a tela mostra apenas a amostra das cidades cobertas. Em outro município, mostra a cobertura disponível; **Aparecida de Goiânia não recebe os dados de Goiânia**. O município cadastral Brasília (IBGE 5300108) abrange todo o DF.

A validação do conjunto usa Zod; testes verificam identidade de projeto, limites municipais, fontes de cada evidência, referências de produtos e relatórios, filiais, ambiguidade de CNPJ e filtros combinados. Atualizações da pesquisa não sobrescrevem registros manuais ou situações de abordagem cadastradas pela equipe.

## Ampliação de UFs e capitais — 22/11/2026

O escopo de consulta por modelo é de 27 UFs e 27 capitais, com códigos IBGE explícitos em `vehicle-capitals.json`. Os demais municípios não entram nas listas de modelos desta etapa, inclusive por registros manuais; seus registros permanecem armazenados. O mapa e as demais análises mantêm a navegação municipal. Brasília conserva a exceção cadastral da área integral do DF.

A tabela **Cobertura das publicações**, paginada e filtrada pelos anos selecionados, mostra os anos carregados e ausentes de cada UF e capital e permite navegar diretamente ao recorte. Não confunde território planejado com cobertura concluída. A contagem refere-se às publicações carregadas; registros manuais ficam fora dessa contagem. A média considera apenas células disponíveis; anos ausentes continuam nulos.

Foram acrescentados o top 50 nacional de 2025 (Fenabrave, página 7) e 135 rótulos de modelos do segmento Auto de MT em 2024. Cada uma das 135 linhas do PDF de MT confere com seus doze valores mensais. A lista soma 31.513, contra 31.541 no resumo da mesma entidade (página 4): não foi criada uma linha fictícia para os 28 restantes nem declarado que a lista é integral. A classificação original é preservada, sem incluir a tabela separada de comerciais leves.

A obtenção das listas completas para todas as UFs e capitais **não foi concluída**. A pesquisa verificou o serviço estatístico [Serpro/Senatran](https://www.gov.br/pt-br/servicos/contratar-arquivos-estatisticos-denatran), que exige autorização e contratação, e o [DMP da Fenabrave](https://www.fenabrave.org.br/Dados/index2.html), voltado a assinantes. Nenhum acesso contratado está disponível. O usuário confirmou manter apenas vendas e emplacamentos verificáveis, sem usar frota como substituto. Não foi criado serviço pago nem usado estoque para completar lacunas.

Os arquivos municipais do MT consultados trazem totais por segmento, sem cruzamento por modelo, e não foram importados como listas de modelos da capital. O PDF identificado no post de dezembro de 2025 foi publicado em 04/12/2025, e o quadro municipal refere-se a novembro; não foi tratado como encerramento anual. As URLs antigas de SC retornaram HTML em vez do PDF original na coleta; os resultados indexados não foram utilizados como arquivo primário. Informativos MG e PR consultados não forneceram série anual por modelo e capital para importação. Isso registra o que foi verificado, sem afirmar inexistência de outras fontes abertas.

A coleção `expanded-models` do manifesto registra URLs e SHA-256 dos originais de MT e do boletim nacional de 2025. Para reproduzir a ampliação, instale `pdfplumber` no ambiente Python de preparação e execute:

```sh
python scripts/prepare-expanded-car-models.py /caminho/para/expanded-models
```

Arquivos esperados: `MT-2024.pdf`, `MT-2024-summary.pdf` e `BR-2025.pdf`. O extrator valida o cabeçalho territorial, os 12 meses, cada total anual e os 50 lugares da lista nacional antes de gravar. A aplicação continua Next.js/Neon e não baixa PDFs no build.

### Totais de emplacamentos estaduais (25/11/2026)

A série `state-car-registrations.json` integra 270 observações (27 UFs × 2016–2025) da tabela 2.2.2 de AUTOMÓVEIS do Anuário Anfavea 2026. Os dez totais nacionais foram reconciliados com as somas estaduais e a página original foi conferida visualmente. O projeto 3C Automotive inicia o mapa em Emplacamentos, com a mesma série no hover e no painel do território. Totais e tabela anual ficam disponíveis independentemente da existência de um ranking de modelos. Seleções de múltiplos anos somam apenas os anos selecionados; períodos parciais mostram lacunas, e a média considera somente os anos com dados.

A camada Frota de automóveis conserva seu significado de estoque nos demais projetos. A série estadual de emplacamentos não contém dimensão de modelo nem de município. Os dados por modelo existentes continuam disponíveis com sua fonte e cobertura próprias. O total nacional ou estadual nunca é utilizado para completar modelos ou municípios faltantes.

### Listas de modelos do Detran-SC (25/11/2026)

`sc-car-models.json` acrescenta Santa Catarina e Florianópolis para os dez anos completos de 2016–2025: 20 tabelas, 3.031 observações anuais por marca/modelo. A extração do relatório público conserva a classificação administrativa `AUTOMOVEL` e o serviço `PRIMEIRO EMPLACAMENTO`; cada lista confere com uma consulta mensal de controle de doze meses. A definição difere do resumo setorial da Anfavea mostrado no mapa e está identificada na interface. Não foi feita aproximação de modelos, municípios ou anos ausentes.

Para reproduzir a transformação: `python scripts/prepare-sc-car-models.py DIRETORIO_DAS_EXPORTACOES`. O script exige as consultas agregadas e respectivas respostas completas e valida os filtros antes de gravar a coleção. Os hashes das oito entradas ficam no manifesto da coleção. As contagens e a cobertura das outras UFs permanecem independentes; esta carga não conclui as 27 UFs solicitadas.
