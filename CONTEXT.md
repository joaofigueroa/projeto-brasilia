# Domínio do Projeto Brasília

## Linguagem

| Termo | Identificador | Significado |
| --- | --- | --- |
| Espaço | workspace | Instância única do Brasília; não existe segregação por organização nesta etapa. |
| Pessoa | user | Identidade autenticável com nome, e-mail, foto e função profissional. |
| Papel de acesso | role | `admin` ou `collaborator`, configurado por um administrador. |
| Função profissional | jobTitle | Texto de apresentação do trabalho da pessoa; não concede permissões. |
| Projeto | project | Iniciativa à qual uma tarefa obrigatoriamente pertence. |
| Tarefa / card | task | Unidade de trabalho planejada em uma semana. |
| Responsável | assignee | Pessoa vinculada à execução de uma tarefa; pode movimentá-la. |
| Administrador do card | administrator | Pessoa que pode editar os dados e os responsáveis daquele card, independentemente do papel global. |
| Semana | weekStart | Segunda-feira que identifica o período de planejamento; não é a data de criação. |
| Prazo | dueDate | Data opcional de entrega; não determina automaticamente a semana. |
| Histórico | taskEvent | Registro imutável de uma criação, edição ou movimentação, com autor e instante. |

## Inteligência de mercado

**Território**: Recorte de análise: Brasil, grande região, unidade da federação ou município identificado pelo código do IBGE. Brasília é o município de referência do Distrito Federal; o DF não se divide em municípios.

**Período de análise**: Conjunto explícito de um a dez anos, consecutivos ou não. Registros mantêm seu ano de referência. Fluxos de modelos podem ser somados ou apresentados pela média dos anos disponíveis; lacunas ficam indicadas. Estoques anuais são comparados ou têm média, nunca somados como vendas.

**Modelo de automóvel**: Marca e modelo classificados pela fonte como automóvel. A visão de modelos exclui comerciais leves, motocicletas, caminhões e demais tipos. Uma observação conserva indicador, ano, unidade, fonte e território exato; fontes ou níveis geográficos diferentes não são somados.

**Aba de análise**: Visão de um projeto com finalidade própria, como mercado endereçável, possíveis clientes, veículos, editais ou abordagem comercial. Cada projeto possui suas próprias abas e categorias.

**Registro de inteligência**: Informação de um projeto e uma aba, associada a um território, ano de referência e fonte. Pode representar um indicador quantitativo, potencial cliente ou anotação de análise.

**Mercado endereçável**: Estimativa de demanda compatível com a oferta do negócio, com premissas, unidade e fonte. População, frota ou número de registros não são automaticamente o mercado endereçável.

**Frota registrada**: Estoque de veículos registrados em uma data. Ano de fabricação ou modelo é uma característica do veículo, distinta do ano de referência da medição.

**Vendas**: Fluxo de veículos vendidos durante um período, distinto do estoque registrado e dos emplacamentos.

**Emplacamentos**: Fluxo de veículos emplacados durante um período, identificado pela fonte que o apurou.

**Possível cliente**: Organização mapeada para prospecção, com segmento, fonte e situação de abordagem. Não significa cliente ativo ou demanda confirmada.

**Edital**: Publicação de contratação pública; a menção a um termo no objeto não confirma compatibilidade comercial ou elegibilidade para participar.
