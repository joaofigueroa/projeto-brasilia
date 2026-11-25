# Domínio do Projeto Brasília

## Linguagem

| Termo | Identificador | Significado |
| --- | --- | --- |
| Espaço | workspace | Instância única do Brasília; não existe segregação por organização nesta etapa. |
| Pessoa | user | Identidade autenticável com nome, e-mail, foto e função profissional. |
| Papel de acesso | role | `admin` ou `collaborator`, configurado por um administrador. |
| Função profissional | jobTitle | Texto de apresentação do trabalho da pessoa; não concede permissões. |
| Projeto | project | Iniciativa à qual uma tarefa obrigatoriamente pertence; tem nome, foto opcional e descrição, geridos por administradores. |
| Tarefa / card | task | Unidade de trabalho planejada em uma semana. |
| Responsável | assignee | Pessoa vinculada à execução de uma tarefa; pode movimentá-la. |
| Administrador do card | administrator | Pessoa que pode editar os dados e os responsáveis daquele card, independentemente do papel global. |
| Exclusão de tarefa | taskDeletion | Retirada de uma tarefa do quadro por um administrador do espaço ou do card, após confirmação, conservando seu histórico. |
| Semana | weekStart | Segunda-feira que identifica o período de planejamento; não é a data de criação. |
| Adiar para a semana seguinte | taskPostponement | Mover a tarefa sete dias a partir de sua semana atual, sem duplicação, preservando prazo, status e responsáveis; permitido aos administradores do espaço ou do card e registrado no histórico. |
| Ação em massa | bulkTaskOperation | Operação confirmada sobre até 200 tarefas explicitamente selecionadas na lista atual: mudar a semana ou excluir. Todas devem manter versão e permissão de edição válidas; caso contrário nenhuma é alterada. Cada tarefa recebe seu evento de histórico, e prazos permanecem independentes da semana. |
| Prazo | dueDate | Data opcional de entrega; não determina automaticamente a semana. |
| Histórico | taskEvent | Registro imutável de uma criação, edição, movimentação ou exclusão, com autor e instante. |

## Inteligência de mercado

**Território**: Recorte de análise: Brasil, grande região, unidade da federação ou município identificado pelo código do IBGE. Brasília é o município de referência do Distrito Federal; o DF não se divide em municípios.

**Período de análise**: Conjunto explícito de um a dez anos, consecutivos ou não. Registros mantêm seu ano de referência. Fluxos de modelos podem ser somados ou apresentados pela média dos anos disponíveis; lacunas ficam indicadas. Estoques anuais são comparados ou têm média, nunca somados como vendas.

**Modelo de automóvel**: Marca e modelo classificados pela fonte como automóvel. A consulta nesta etapa contempla as 27 UFs e as 27 capitais, com cobertura efetivamente carregada identificada por ano. Os demais municípios ficam fora do escopo até definição do usuário. Ter um território no escopo não significa ter dados disponíveis. A visão de modelos exclui comerciais leves, motocicletas, caminhões e demais tipos. Uma observação conserva indicador, ano, unidade, fonte e território exato; fontes ou níveis geográficos diferentes não são somados.

**Aba de análise**: Visão de um projeto com finalidade própria, como mercado endereçável, possíveis clientes, veículos, editais ou abordagem comercial. Cada projeto possui suas próprias abas e categorias.

**Registro de inteligência**: Informação de um projeto e uma aba, associada a um território, ano de referência e fonte. Pode representar um indicador quantitativo, potencial cliente ou anotação de análise.

**Mercado endereçável**: Estimativa de demanda compatível com a oferta do negócio, com premissas, unidade e fonte. População, frota ou número de registros não são automaticamente o mercado endereçável.

**Frota registrada**: Estoque de veículos registrados em uma data. Ano de fabricação ou modelo é uma característica do veículo, distinta do ano de referência da medição.

**Vendas**: Fluxo de veículos vendidos durante um período, distinto do estoque registrado e dos emplacamentos.

**Emplacamentos**: Fluxo de veículos emplacados durante um período, identificado pela fonte que o apurou.

**Possível cliente**: Organização mapeada para prospecção, com segmento, fonte e situação de abordagem. Não significa cliente ativo ou demanda confirmada.

**Edital**: Publicação de contratação pública; a menção a um termo no objeto não confirma compatibilidade comercial ou elegibilidade para participar.

**Publicação setorial de emplacamentos**: Fonte primária de uma entidade do setor, como Fenabrave ou Sincodiv, distinta de uma publicação governamental. Conserva sua abrangência e classificação anual. Divergências entre meses e total anual ficam sinalizadas e não entram na consolidação até revisão.

**Perfil pesquisado**: Registro versionado de uma organização em uma data de consulta, com identidade cadastral, especialização, fontes e lacunas. É independente dos anos usados nos indicadores históricos e não comprova relacionamento comercial.

**Fundação da marca**: Início da operação declarado pela empresa em uma fonte identificada. É distinto da abertura do estabelecimento no CNPJ, especialmente em filiais ou mudanças de pessoa jurídica.

**Prioridade de abordagem**: Hipótese comercial baseada no ajuste entre oferta, atividade declarada e evidência disponível. Não equivale a cliente qualificado, probabilidade de conversão ou capacidade financeira.

**Análise comercial por IA**: Relatório versionado que separa evidências públicas de sugestões de abordagem, com recorte territorial, data e limites. Administradores podem solicitar novas versões pela plataforma; cada versão conserva modelo, data, totais do cadastro e tamanho da amostra pública enviada à IA. Não implica monitoramento contínuo.


**Levantamento cadastral**: CNPJs ativos no município exato, com CNAEs principal ou secundários selecionados. Não comprova operação atual, especialização, demanda nem adequação à linha leve. A origem é a Receita Federal por espelho público identificado, com competência mensal.

**Perfil cadastral / comercial**: O primeiro conserva fatos da base CNPJ e lacunas explícitas. O segundo agrega evidências comerciais com fonte e data, editáveis por administradores com controle de versão. Abertura do CNPJ e fundação da marca permanecem separadas.

**Consulta manual ao Google**: Nota, contagem e até cinco trechos registrados por administrador, com autoria, link e data da consulta. Não é sincronização pela API nem garantia de atualidade. Registros anteriores são preservados; a página atual não expõe um editor separado de consultas.


**Favorito de prospecção**: Seleção pessoal de uma empresa por usuário autenticado, independente do papel administrativo, prioridade comercial ou situação de abordagem. A mesma empresa pode ser favorita de várias pessoas; nenhuma pessoa altera a seleção das demais.

**Acompanhamento comercial**: Histórico compartilhado da abordagem de uma empresa dentro de um projeto. Remover a empresa dos favoritos pessoais não apaga o acompanhamento da equipe.

**Etapa comercial**: Situação atual da abordagem: Novo Lead, Tentativa de Contato, Em Qualificação, Reunião Agendada, Proposta Enviada, Em Negociação ou Fechamento / Contrato. A última etapa indica aceite em formalização, não venda concluída.

**Comentário de acompanhamento**: Anotação de uma pessoa autenticada sobre a abordagem, com autoria e data preservadas na linha do tempo.

**Anexo de acompanhamento**: Documento ou imagem vinculado a um cliente, com nome, tipo, tamanho, autoria e referência de armazenamento. Cada arquivo tem limite de 20 MB e pertence ao histórico compartilhado do projeto.

**Página do possível cliente**: Endereço próprio do perfil pesquisado, com contexto de projeto, resumo e ficha Google na área principal. Dados cadastrais, oportunidade e fontes são categorias de informação em abas; a ficha Google permanece aberta na área principal. Não existe uma aba redundante de consultas.

**Identificação por montadora**: Especialistas mostram pequenas logos das marcas declaradas. Multimarcas usam logos sobrepostas; quando não há marcas declaradas, os símbolos são apenas ilustrativos. Perfis a confirmar mantêm essa indicação, sem logos que sugiram confirmação.
