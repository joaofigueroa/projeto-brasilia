# Inteligência de mercado

O contexto selecionado no menu lateral acompanha a navegação. O Kanban mantém a opção Todos os projetos. BI exige um projeto e conserva o território e o ano ao alternar negócios; a aba é redefinida porque pertence ao projeto.

## Modelo e permissões

`analysis_tabs` define visões por projeto, com nome, tipo, ordem, segmentos e termos para consulta de editais. Os tipos iniciais são mercado, possíveis clientes, veículos, oportunidades e notas. O nome e as categorias são configuráveis; novas abas não exigem criar colunas no banco. O tipo de uma aba existente é preservado para não reinterpretar seus registros.

`intelligence_records` armazena registros por aba, território e ano, com indicador, valor decimal, unidade, categoria, situação de abordagem, fonte e notas. Características como marca, modelo, tipo, ano de fabricação e contato ficam em `details`. O escopo geográfico é validado pelo código IBGE: um município deve pertencer à UF informada. Ano de fabricação é uma dimensão do veículo e não substitui o ano de referência do registro.

Todos os usuários autenticados podem consultar. Administradores configuram abas, cadastram, editam e importam registros. Edições de abas e registros usam versão esperada para impedir sobrescrita silenciosa. O registro conserva seu território de origem quando editado a partir de uma visão agregada.

A lista de uma UF inclui seus municípios; a de uma região inclui suas UFs. Registros quantitativos de níveis diferentes são exibidos individualmente e não são somados automaticamente, evitando contar simultaneamente um total de UF e seus municípios. O painel limita a lista a 500 registros e informa esse limite quando alcançado.

## Fontes carregadas

- IBGE: malha simplificada com as 27 UFs; catálogo de municípios e regiões; população residente do Censo 2022, tabela SIDRA 4714, variável 93.
- Senatran: frota por município e tipo, posição de dezembro de 2022, 2023 e 2024. Os totais nacionais conferidos são 115.116.532, 119.227.657 e 123.974.520 veículos.
- PNCP: consulta pública por UF, município e período. São consultadas a primeira página de pregão eletrônico e a primeira página de dispensa (até 50 publicações cada), com limite de oito segundos por chamada e cache de uma hora. Os termos são aplicados ao objeto da compra. O painel informa a amostra, o total informado pela fonte, o período e falhas parciais; não faz busca nos anexos.

Dados do CNPJ e CNES são referências oficiais para prospecção. A base integral de empresas não foi carregada. Não há números artificiais de mercado, listas fictícias de clientes ou vendas inferidas de frota.

A população permanece identificada como Censo 2022, qualquer que seja o ano do filtro. A frota de outros anos aparece como indisponível, não zero. O ano de referência inicial é 2024; o usuário pode consultar períodos diferentes e cadastrar séries complementares.

A correspondência Senatran → IBGE usa UF e normalização exata do nome, com poucos aliases explícitos. Nomes divergentes não são aproximados. As linhas não vinculadas estão em `fleet.json.unmatched`; os totais estaduais preservam todas as linhas oficiais. A interface mostra quantos códigos municipais possuem frota vinculada. Municípios criados depois da coleta podem não ter população de 2022 ou frota disponível.

O arquivo de marca/modelo de dezembro de 2022 vinculado pela Senatran redirecionou para um arquivo SharePoint arquivado na coleta. A base inicial não inclui modelos ou vendas anuais por modelo. O cadastro e o CSV permitem carregar essas dimensões a partir de outras fontes identificadas, sem confundi-las com estoque.

## Reprodução dos dados estáticos

`src/data/official/provenance.json` registra os oito URLs de entrada, a data da coleta e o SHA-256 dos arquivos recebidos. Baixe os arquivos com os nomes indicados no manifesto para uma pasta temporária, mantendo a validação TLS habilitada. Em um ambiente Python isolado, instale `xlrd==2.0.2` e `openpyxl==3.1.5` e execute:

```sh
python scripts/prepare-official-data.py /caminho/para/as/fontes
```

O script gera os limites SVG, o catálogo geográfico e as séries de frota. Valida os totais nacionais antes de gravar as séries. Python é apenas uma ferramenta de preparação offline; a aplicação continua integralmente em Next.js e Neon. O build não baixa planilhas nem depende dessas bibliotecas Python.

## CSV

O modelo está em `public/templates/intelligence-records.csv`. A tela aceita arquivo ou conteúdo CSV colado; quando os dois são informados, o arquivo é utilizado. Aceita UTF-8 com BOM, delimitador vírgula ou ponto e vírgula e campos entre aspas, inclusive notas com quebras de linha. Limite: 500 linhas e 500 KB. Use números sem separador de milhar; ponto decimal, ou vírgula decimal quando o delimitador for ponto e vírgula.

Campos mínimos: `title` e `source_name`. Indicadores numéricos exigem `value`, `metric` e `source_url`. `metric` aceita `context`, `market_size`, `fleet`, `sales` ou `registrations`. `status` aceita `new`, `contacted`, `qualified` ou `discarded`.

O arquivo inteiro é validado antes da gravação. O lote usa uma única instrução PostgreSQL. A chave de importação considera território, ano, título, categoria, indicador, dimensões e URL da fonte; reimportar a mesma observação atualiza valor, unidade, notas e situação sem duplicar. Linhas repetidas no mesmo lote são rejeitadas.

## Evolução

Novas integrações devem conservar fonte, periodicidade, definição do indicador, abrangência e dimensão territorial. Receitas, vendas, emplacamentos e estoque são medidas distintas. Estimativas de mercado precisam registrar premissas nas notas. O cadastro dos projetos continua reservado à próxima etapa; as abas e os fluxos analíticos já podem variar entre os negócios existentes.
