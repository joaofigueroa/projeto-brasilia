# Mapeamento de fontes de emplacamentos

Consulta: 22/11/2026. Escopo de produto: automóveis, 27 UFs e suas 27 capitais, com seleção de múltiplos anos. Este documento registra pesquisa de fontes; não declara que todas as séries foram importadas na plataforma.

A conclusão anterior foi prematura. Existem publicações abertas de primeiro emplacamento por município e, em Santa Catarina, um painel governamental que cruza **modelo, município, tipo e período**. Respostas HTTP 403/404, páginas dependentes de JavaScript e PDFs antigos substituídos não demonstram inexistência de dados.

## Fontes verificadas com maior utilidade

| Fonte primária | Recortes efetivamente conferidos | Acesso e resultado | Próximo uso |
| --- | --- | --- | --- |
| [Detran-SC — primeiro emplacamento e transferências](https://www.detran.sc.gov.br/primeiro-emplacamento-e-transferencias-de-veiculos/) | Visão **0 km Modelo**, filtros MUNICÍPIO, TIPO DE VEÍCULO, ANO / MÊS, MARCA e combustível; tabela com meses e total por modelo. A tabela inicial mostra 2015–2026. | Painel Power BI público, aberto no navegador sem login. Consulta de Florianópolis + AUTOMOVEL + 2024 validada. | Prioridade para uma nova integração de modelos estaduais e da capital. Exportação integral e exaustividade da lista ainda precisam ser conferidas; a tabela virtualizada não deve ser copiada apenas até a primeira tela. |
| [Anfavea — Anuário 2026](https://anfavea.com.br/site/wp-content/uploads/2026/07/BOOK-ANUARIO-ANFAVEA-2026BAIXA.pdf) | Tabela 2.2.2, seção **AUTOMÓVEIS / CARS**: todas as 27 UFs × 2016–2025. | PDF público baixado. Extraídas 270 observações; as somas das 27 UFs conferem com o total nacional em cada um dos dez anos. | Base de controle de volume por UF, separada das listas de modelos. Não contém modelo nem município nessa tabela. |
| [Sincodiv-ES — documentos](https://sincodives.com.br/documentos), [exemplo de agosto/2026](https://sincodives.com.br/publicacao/agosto2026) | PDF “Veículos emplacados — agosto 2026”, município × tipo × quantidade; Vitória verificada na página 13. | Download público pela página normal. A API antiga retornou 403, mas o documento é acessível pela interface atual. | Totais municipais por tipo; buscar fechamentos anuais no arquivo. O exemplo examinado não tem marca/modelo. |
| [Detran-SP — emissões de CRV](https://dadosabertos.sp.gov.br/dataset/emissao-de-certificados-de-registro-de-veiculo-crv) | A descrição oficial de cada recurso lista município, **tipo de serviço, incluindo primeiro registro**, categoria, combustível, tipo, quantidade, mês e ano. Catálogo inclui 2025 e 2026. | Metadados confirmados pelo CKAN. Links dos CSVs de janeiro/2025 e outubro/2026 retornaram 404 na coleta. | Recuperar os recursos atuais pelo publicador e conferir contagens. Somente o serviço primeiro registro serve ao fluxo de novos; todas as emissões de CRV somadas não servem. Marca/modelo não constam no esquema descrito. |
| [Detran-SE — veículos novos por montadora](https://www.detran.se.gov.br/estatistica/estat_RB00069M.asp) | Consulta mensal por ano e mês; seletor oferece 2003–2026. Dezembro/2024 retorna contagens por montadora, separando nacionais/importados e alguns tipos. | Formulário público testado. Novembro/2026 estava vazio, mas dezembro/2024 tem resultados. | Série de montadoras estadual. Não equivale a modelo; não há filtro municipal nessa consulta. Não assumir que cada opção de ano possui todos os meses preenchidos. |
| [Detran-PE — dados estaduais](https://estatisticas.detran.pe.gov.br/veiculos/estado/) | Quadros “Veículos Novos Registrados” e “Veículos Novos (1º Emplacamento) por Tipo de Veículo e Mês”; controles de exportação CSV, HTML e Excel. | Interface pública conferida. A página municipal examinada tem quadros de **frota**, não o mesmo cruzamento de primeiro registro. | Exportar os fluxos estaduais e confirmar cobertura histórica. Não atribuir a Recife os totais estaduais. |
| [Sincodiv/Fenabrave-RS](https://www.sincodiv-rs.com.br/dados-de-mercado/emplacamentos), [dezembro/2025](https://www.sincodiv-rs.com.br/hd-imagens/dados_mercado/190120261528125.pdf) | PDF com meses, acumulados por segmento e ranking estadual por segmento; também anuncia quadro municipal por segmento. | PDF original lido pelo navegador de pesquisa; download direto local apresentou timeout. Automóveis estaduais: 96.167 em 2025 nessa edição. | Volume e controle regional. Quadro municipal exige conferência visual/exportação; busca textual não extraiu seus municípios. Nenhum cruzamento municipal por modelo foi confirmado nesse arquivo. |
| [ABVE Data — Geografia da Eletromobilidade](https://abve.org.br/abve-data/bi-geografia-da-eletromobilidade/) | Painel público com ano, mês, estado, município, fabricante, tecnologia e segmento; tabelas de vendas por município e UF, com colunas 2022–2026. | Aberto no navegador sem login. Goiânia e Brasília aparecem no recorte municipal. | Fonte complementar **de eletrificados**, com universo e classificação próprios. Não cobre todo o mercado de carros; filtro de fabricante não é filtro de modelo. |
| [Sincodiv-DF](https://sincodivdf.com.br/emplacamentos/) e [Fenabrave-MT](https://fenabravemt.com.br/emplacamento/) | Listas estaduais de modelos já conferidas e carregadas: DF 2022–2025; MT 2024. Publicações municipais de MT examinadas são por segmento. | PDFs públicos com proveniência no conjunto da aplicação. | Manter as listas e ampliar os anos com arquivos primários. DF corresponde ao recorte cadastral Brasília; Cuiabá não recebe o total de MT. |
| [Detran-RJ — serviços veiculares 2024](https://dadosabertos.rj.gov.br/pt_BR/dataset/servicos-veiculares-2024) | CSV agregado baixado: município × serviço, incluindo **PRIMEIRA LICENCA**. | A própria descrição identifica **município de atendimento**. Não há tipo de automóvel nem modelo no arquivo examinado. | Evidência do mecanismo de contagem administrativa; não usar como mercado de novos por residência sem confirmar definição e abrangência. |

### Consulta que comprova o cruzamento modelo × cidade × ano

No Detran-SC: abrir **0 km Modelo**, pesquisar `FLORIANOPOLIS` no filtro municipal e pressionar Enter; selecionar o município, selecionar `AUTOMOVEL` e expandir o ano 2024 na tabela. Foram observados:

| Recorte | Modelo | Total publicado de 2024 |
| --- | --- | ---: |
| Florianópolis, AUTOMOVEL | ONIX | 1.016 |
| Florianópolis, AUTOMOVEL | HB20 | 715 |
| Florianópolis, AUTOMOVEL | T-CROSS | 583 |
| Florianópolis, AUTOMOVEL | Todos os modelos, total do ano no painel | 9.433 |

Os doze meses visíveis do ONIX foram 42, 46, 61, 67, 62, 53, 58, 49, 52, 178, 42 e 306: somam 1.016. Este é um teste de consulta, não uma lista completa importada. A mesma tela mantém filtros de município e períodos; transferências têm uma visão separada e não devem entrar na consulta de 0 km.

No [PDF municipal do ES](https://sincodives.com.br/assets/modules/publicacoes/download/files/2631/agosto-6.pdf), Vitória tem **407 AUTOMOVEL em agosto/2026**. O arquivo contém outros tipos em linhas separadas, que ficam excluídos do recorte de automóveis. A soma de meses acumulados não deve duplicar valores acumulados anuais.

## Inventário das 27 UFs e respectivas capitais

**Todas as linhas abaixo têm o total estadual de automóveis de 2016–2025 verificado na Anfavea.** A coluna de pesquisa local descreve fontes adicionais e a pendência específica para modelo/capital. “Candidato” significa que o recurso foi localizado, mas o cruzamento ainda não foi validado. Não significa indisponibilidade.

| UF / capital | Fonte local adicional | Resultado da pesquisa local / próxima verificação |
| --- | --- | --- |
| AC / Rio Branco | [Detran-AC, Estatísticas](https://www.detran.ac.gov.br/institucional/estatisticas/) | Página aberta e arquivos de frota por estado e municípios identificados; não usar estoque como primeiro registro. Procurar publicação de fluxo e solicitar tabela agregada de modelos se necessário. |
| AL / Maceió | [Detran em Dados](https://www.detran.al.gov.br/detran-em-dados), [indicadores](https://indicadores.detran.al.gov.br/) | Candidato de painel público. Granularidade e histórico do primeiro registro ainda não validados. |
| AP / Macapá | [Detran-AP, Estatísticas](https://www.detran.ap.gov.br/detranap/servicos/estatisticas-de-transito/) | Portal estatístico localizado; separar frota e serviços de uma série de novos antes de integrar. |
| AM / Manaus | [Detran-AM, Anuário 2024](https://www.detran.am.gov.br/wp-content/uploads/pdf/RELATORIO-ESTATISTICO-ANUARIO-2024_compressed-1.pdf) | Anuário localizado. Vistorias, pares de placas e estampagens são serviços distintos de primeiro registro; não usar seu total como vendas. Cruzamento por modelo/capital pendente. |
| BA / Salvador | [Sincodiv-BA](https://www.sincodivba.com.br/), referenciado no [diretório Fenabrave](https://www.fenabrave.org.br/Portal/conteudo/regionais) | Entidade primária identificada; site apresentou timeout na coleta. Os “microdados de veículos” da SSP não foram validados como emplacamentos e ficam fora da ingestão. |
| CE / Fortaleza | [Detran-CE, Estatísticas](https://www.ce.gov.br/detran/estatisticas/) | Relatórios de “veículos implantados” localizados. Confirmar se a definição distingue novos e transferências; modelos e capital pendentes. |
| DF / Brasília | [Sincodiv-DF](https://sincodivdf.com.br/emplacamentos/) | Modelos estaduais 2022–2025 já carregados. Comparar o universo das publicações com a referência Anfavea antes de declarar cobertura integral. |
| ES / Vitória | [Sincodiv-ES](https://sincodives.com.br/documentos) | Município × tipo verificado, incluindo Vitória; localizar fechamentos históricos e outro recurso para marca/modelo. Pastas de 2022 e 2023/2024 aparecem no catálogo. |
| GO / Goiânia | [Detran-GO](https://goias.gov.br/detran/estatisticas-go/), [dados abertos de frota](https://dadosabertos.go.gov.br/dataset/frota-de-veiculos), [Sincodive-GO](https://sincodivego.com.br/) | Frota não é venda. Site regional foi identificado pelo diretório nacional; tabela atual de novos por modelo/capital ainda não validada. ABVE oferece recorte geográfico de eletrificados. Prioridade de pesquisa junto com DF. |
| MA / São Luís | [Detran-MA](https://www.detran.ma.gov.br/Portal/consulta/Veiculo.xhtml) | Portal de serviços localizado; “cálculo de 1º emplacamento” é serviço, não tabela estatística. Publicação agregada local por modelo/capital ainda não localizada. |
| MT / Cuiabá | [Fenabrave-MT](https://fenabravemt.com.br/emplacamento/) | Lista estadual de 2024 carregada; arquivos municipais examinados fornecem segmentos, sem modelo. Não extrapolar o estado para Cuiabá. |
| MS / Campo Grande | [Detran, Indicadores](https://www.detran.ms.gov.br/indicadores/), [Fenabrave-MS](https://www.fenabravems.com.br/) | Link oficial “Detran em Números” chega a 403 no painel na consulta. Confirmar acesso/URL vigente e esquema, sem classificar a base como inexistente ou paga. |
| MG / Belo Horizonte | [Sincodiv-MG, Emplacamentos](https://www.sincodiv-mg.com.br/servicos/emplacamentos/) | Arquivo de boletins localizado. Há também registro oficial histórico de fornecimento de novos registros ao sindicato; isso comprova um mecanismo, não acesso público atual aos microdados. Agregados por modelo/capital pendentes. |
| PA / Belém | [Anuário/painel de frota do Detran-PA](https://dashboard-frota.detran.pa.gov.br/) | Painel localizado por publicação oficial; resposta 502 na coleta direta. Seu objeto declarado é frota. Não assumir fluxo a partir do histórico de estoque. |
| PB / João Pessoa | [Detran-PB, Estatísticas](https://detran.pb.gov.br/institucional-1/estatisticas) | Portal e PDFs de frota localizados. Primeiro registro por modelo/capital ainda não validado. |
| PR / Curitiba | [Detran-PR, Anuários](https://www.detran.pr.gov.br/Pagina/Anuarios-Estatisticos-de-Transito-no-Parana), [Sincodiv-PR](https://www.sincodivpr.com.br/emplacamentos-no-parana-tem-alta-de-36-sobre-2024/) | Anuário 2024 baixado, 117 páginas, com frota e processos. Não contém tabela textual de emplacamentos por modelo. Investigar painel atual e boletins regionais; não usar frota de Curitiba como novos. |
| PE / Recife | [Detran-PE, dados estaduais](https://estatisticas.detran.pe.gov.br/veiculos/estado/), [municipais](https://estatisticas.detran.pe.gov.br/veiculos/municipios/) | Primeiro emplacamento estadual com exportação verificado; página municipal examinada oferece frota. Modelos e Recife no fluxo de novos pendentes. |
| PI / Teresina | [Detran-PI, Relatório de gestão 2024](https://portal.pi.gov.br/detran/wp-content/uploads/sites/62/2025/02/relatorio_detran2024_ok1.pdf) | Candidato documental oficial. Dimensões de primeiro registro por modelo/capital ainda não conferidas. |
| RJ / Rio de Janeiro | [Detran-RJ, serviços 2024](https://dadosabertos.rj.gov.br/pt_BR/dataset/servicos-veiculares-2024), [Sincodiv-RJ](https://sincodiv-rj.com.br/) | CSV de primeira licença por município de atendimento conferido, sem modelo/tipo; investigar boletins regionais para o recorte de mercado. |
| RN / Natal | [Sincodiv-RN](https://www.sincodivrn.com.br/), referenciado no [diretório Fenabrave](https://www.fenabrave.org.br/Portal/conteudo/regionais) | Entidade primária identificada; site não recuperado na pesquisa. Portal Detran-RN encontrado oferece serviços, não tabela confirmada de novos. ABVE tem geografia de eletrificados. |
| RS / Porto Alegre | [Sincodiv/Fenabrave-RS](https://www.sincodiv-rs.com.br/dados-de-mercado/emplacamentos) | Boletim de dezembro/2025 com fluxo por segmento conferido; quadro municipal precisa de conferência visual e histórico mensal. Modelos ainda não confirmados nesse boletim. |
| RO / Porto Velho | [Detran-RO, Relação de Veículos](https://transparencia.detran.ro.gov.br/secao/index/57) | Arquivo mensal localizado por índice; coleta apresentou 502. Conferir dicionário antes de baixar: relação cadastral pode ser estoque e conter identificadores que não são necessários. |
| RR / Boa Vista | [Detran-RR, Estatísticas](https://www.detran.rr.gov.br/institucional/estatisticas/) | Portal e publicação de frota localizados. Não há cruzamento de primeiro registro por modelo/capital validado nesta consulta. |
| SC / Florianópolis | [Detran-SC, 0 km Modelo](https://www.detran.sc.gov.br/primeiro-emplacamento-e-transferencias-de-veiculos/) | **Modelo × município × período × tipo verificado.** Fonte prioritária para integração. Boletins regionais também existem no novo site da Fenabrave-SC. |
| SP / São Paulo | [Detran-SP, CRV](https://dadosabertos.sp.gov.br/dataset/emissao-de-certificados-de-registro-de-veiculo-crv) | Primeiro registro municipal descrito no esquema oficial; CSVs amostrados retornaram 404. Recuperar arquivos atuais. Marca/modelo não constam no esquema documentado. |
| SE / Aracaju | [Detran-SE, novos por montadora](https://www.detran.se.gov.br/estatistica/estat_RB00069M.asp) | Consulta mensal estadual com resultados de dezembro/2024 validada. Montadora não é modelo; Aracaju requer agregado específico. |
| TO / Palmas | [Governo-TO, relatório localizado](https://central.to.gov.br/download/396116) | Documento candidato com ranking municipal; definição de saldo/fluxo e dimensões ainda não validadas. Não usar “saldo” como novos sem metodologia. |

## Outros mecanismos e fontes que não podem ser confundidos

- [RENAVE aberto](https://dados.transportes.gov.br/dataset/registro-nacional-de-veiculos-em-estoque): tem fluxos de entrada e saída de veículos novos/usados por UF e período. Movimentação de estoque de revenda não é automaticamente primeiro emplacamento ou venda final; modelo e município não foram confirmados no esquema publicado.
- [RENAVAM aberto](https://dados.transportes.gov.br/dataset/registro-nacional-de-veiculos-automotores-renavam): inventário de frota. Ano de fabricação, diferença entre estoques ou presença de um modelo novo não comprovam venda no município. Agregadores que fazem essa inferência ficam excluídos do carregamento.
- [Arquivos estatísticos Senatran/Serpro](https://www.gov.br/pt-br/servicos/contratar-arquivos-estatisticos-denatran) e [DMP Fenabrave](https://www.fenabrave.org.br/Dados/index2.html): mecanismos institucionais de acesso especializado. Não são a única via existente e não justificam encerrar a pesquisa de publicações abertas. Nenhum serviço foi contratado.
- [Diretório nacional de regionais](https://www.fenabrave.org.br/Portal/conteudo/regionais): permite identificar a entidade primária correta, inclusive Sincodive-GO. Não é uma base estatística nem autoriza coleta de dados pessoais ou contato em nome do usuário.

## Qualidade, classificações e arquivos substituídos

O tipo CTB `AUTOMOVEL` e o segmento setorial `AUTOMÓVEIS / CARS` não devem ser tratados como universos idênticos sem reconciliação. A Anfavea informa 100.528 para SC em 2024; a consulta do Detran-SC com tipo AUTOMOVEL mostrou 70.638 no estado. A causa dessa diferença ainda não foi determinada. Para DF, o total de 2025 da Anfavea é 69.920, enquanto a seção de modelos carregada do Sincodiv-DF soma 50.029. Não declarar integralidade ou distribuir diferenças entre modelos. Fonte, classificação, edição e revisões precisam acompanhar cada série.

O endpoint atual da Fenabrave-SC `files/2785498/be411da021bf6f11b86f4b408df7840a/download`, indexado como maio/2024, entregou um resumo de **abril/2026** na coleta, com texto residual sobreposto na capa. Ele não foi importado como 2024. O conteúdo do arquivo prevalece sobre o resultado da busca e seu nome temporário. As URLs antigas do WordPress retornarem HTML não encerra a procura no novo site.

Regras para importação: (1) validar território, período e definição no original; (2) preservar os valores mensais; (3) conferir total anual contra meses e total de seção; (4) guardar URL, data de coleta, hash e página/filtros; (5) manter nulos para lacunas; (6) não somar acumulado com meses nem estado com capital; (7) registrar lista integral, top N ou amostra; (8) excluir os demais tipos; (9) no BI limitar o carregamento municipal às capitais já definidas.

## Evidências reproduzíveis e sequência de integração

O extrator `scripts/prepare-registration-source-audit.py` recebe os originais `anfavea-2026.pdf` e `es-aug2026.pdf`. Gera [270 contagens anuais por UF](research/registration-evidence/uf-car-registrations-2016-2025.csv) e [proveniência com SHA-256 e verificações](research/registration-evidence/provenance.json). Esses arquivos são evidência de pesquisa, separados dos dados usados em produção. A exportação integral de modelos de SC foi integrada em 25/11, conforme a seção abaixo.

1. Concluído em 25/11: integrar a exportação completa de SC por ano, estado e Florianópolis, preservando o filtro de múltiplos anos e a classificação da fonte. Limites de exportação e quantidade de linhas conferidos.
2. Usar os totais estaduais da Anfavea como série própria e controle de cobertura, sem apresentá-los como modelos. Recuperar primeiro registro municipal do SP e os fechamentos municipais do ES.
3. Priorizar GO/Goiânia: obter o agregado de primeiro registro do Detran-GO ou publicação primária do Sincodive-GO com modelo, ano de registro e município; confirmar o recorte dos eletrificados na ABVE como complemento, sem substituir todo o mercado.
4. Completar os demais cruzamentos com exportações públicas dos painéis, arquivos regionais e solicitações específicas de tabelas agregadas. Site indisponível é pendência de acesso; esquema não conferido é pendência de validação.

Minuta técnica para solicitar dados ao publicador, **não enviada**: “Solicito tabela agregada mensal de primeiros registros de automóveis zero quilômetro, de janeiro/2022 a dezembro/2025 e meses fechados de 2026, para o total da UF e sua capital identificada pelo IBGE. Dimensões: ano/mês do primeiro registro, município de registro, marca, modelo e tipo de veículo; medida: quantidade. Favor distinguir novos de transferências/licenciamento anual e informar classificação, revisões, cobertura e dicionário. Não são necessários placa, chassi, Renavam individual, CPF/CNPJ, endereço ou identificação de proprietários.”

## Integração dos totais estaduais — 25/11/2026

Diagnóstico: a camada “Automóveis” do mapa era estoque de dezembro da Senatran, enquanto a aba Veículos consumia publicações de emplacamentos por modelo. Os 270 totais estaduais extraídos nesta pesquisa ainda não participavam do runtime. O clique selecionava corretamente o território; a aparente divergência vinha de indicadores e coberturas diferentes.

`state-car-registrations.json` passa a publicar os 27 totais anuais de automóveis de 2016–2025, com reconciliação dos dez totais nacionais da tabela 2.2.2 da Anfavea (página 76 do PDF; página impressa 74). A camada inicial da 3C Automotive agora é **Emplacamentos**, usa essa mesma série no hover e no painel, e soma somente os anos explicitamente selecionados. A aplicação exibe total, série anual, média dos anos disponíveis, fonte e lacunas. O mapa exige cobertura do período completo para colorir uma UF; totais parciais no painel são identificados.

Reprodução: `python scripts/prepare-registration-totals.py DIRETORIO/anfavea-2026.pdf` (pdfplumber). O extrator reutiliza a validação da pesquisa, conserva SHA-256 e exclui comerciais leves, caminhões, ônibus e demais classes.

Essa tabela não traz modelos nem municípios. A cobertura por modelo continua independente e não é apresentada como completa. Municípios não recebem os totais da UF; o recorte estatístico de Brasília corresponde ao DF inteiro. Nenhum estoque foi convertido em venda ou emplacamento.

## Modelos estaduais — investigação de 25/11/2026

O objetivo continua sendo o cruzamento **UF × marca/modelo × ano**, equivalente ao DF, sem substituir modelos por totais territoriais. A cobertura das 27 UFs **não foi concluída**.

### Nova carga confirmada: Santa Catarina e Florianópolis

A fonte pública do [Detran-SC](https://www.detran.sc.gov.br/primeiro-emplacamento-e-transferencias-de-veiculos/) publica um relatório com as entidades `view_primeiro_emplacamento` e `view_marcamodelo`. Foram consultadas somente contagens agregadas: marca, modelo, ano e soma de `num_total`, filtrando `tpo_veiculo = AUTOMOVEL`. Para a capital, aplica-se ainda `nom_municipio = FLORIANOPOLIS`. Não foram consultados registros individuais de veículos ou proprietários.

O serviço independente de controle identifica todas as linhas como `PRIMEIRO EMPLACAMENTO`. As 20 tabelas anuais de 2016–2025 conferem com os doze totais mensais de cada território/ano: 1.796 observações modelo/ano na UF e 1.235 na capital, totalizando 3.031 observações. As exportações estão completas, sem truncamento; quantidade de linhas conferida com as métricas de execução. Foram conservados os rótulos publicados, inclusive um grupo com marca não informada em 2018.

| Recorte | 2022 | 2023 | 2024 | 2025 |
| --- | ---: | ---: | ---: | ---: |
| SC, AUTOMOVEL | 52.553 | 60.760 | 70.638 | 67.334 |
| Florianópolis, AUTOMOVEL | 8.108 | 8.366 | 9.433 | 9.273 |

Em Florianópolis/2024, o ONIX tem 1.016, o HB20 715 e o T-CROSS 583, conferindo com a consulta visual anteriormente registrada. O cadastro administrativo do Detran-SC tem universo/classificação diferente da Anfavea; os totais não são somados nem forçados a coincidir.

`scripts/prepare-sc-car-models.py` valida os filtros das consultas, integridade da exportação, período completo, duplicidades e reconciliação. Gera `src/data/official/sc-car-models.json` com hashes dos pedidos/respostas, origem, controle mensal, período e classificação. A integração conserva município exato, anos selecionados, soma/média e paginação já existentes. SC não empresta sua lista a outras UFs nem a outras cidades.

Reprodução completa: `python3 scripts/prepare-sc-car-models.py .local/state-model-research/reproduced --fetch`. O comando consulta quatro agregados públicos (modelos e controles mensais, UF e capital), valida as respostas e só então substitui o JSON de runtime. Não exige credencial nem serviço contratado.

### Novas rotas examinadas e limites encontrados

- **ABVE, fonte original:** os esquemas públicos dos relatórios Geral e Geografia possuem modelo, município e UF. A consulta independente de tecnologias confirmou exclusivamente BEV, HEV, HEV FLEX, MHEV, MHEV 12V, MHEV 48V e PHEV, nos segmentos Auto e Comercial Leve. Isso pode oferecer um recorte real de eletrificados nas 27 UFs, mas não reproduz todo o mercado de automóveis solicitado. Não foi carregado como substituto.
- **Fenabrave-MT, dezembro/2025:** o PDF `Auto-5.pdf` contém coluna dezembro ainda incompleta e foi publicado em 04/12/2025. Não foi tratado como fechamento integral do ano. O arquivo de dezembro/2023 examinado mostra imagem, sem tabela anual exportável confirmada.
- **Fenabrave, área do jornalista:** a página oficial `https://www.fenabrave.org.br/jornalista/myLoginnew.asp` exige vínculo e e-mail de veículo de comunicação para liberar acesso. Não foi criado cadastro nem declarada condição profissional inexistente.
- **MG, setembro/2026:** o PDF do sindicato examinado é resumo de uma página; não fornece a lista estadual completa de modelos.
- **AL:** a página oficial define expressamente o painel de veículos como frota. Não foi usado como fluxo de emplacamentos.
- **MS:** o link oficial do painel continua retornando 403 no coletor; isso permanece uma pendência de acesso, não comprovação de inexistência.
- **Senatran/RENAVAM aberto:** continua sendo inventário de frota. Compilações de terceiros que calculam novos registros por diferença entre estoques não foram incorporadas como contagem direta.

Há dois pedidos de orientação sobre publicações gratuitas redigidos localmente para Fenabrave e Senatran, sem solicitação de serviço pago. Ainda não foram enviados; dependem de autorização do usuário para mensagens externas.
