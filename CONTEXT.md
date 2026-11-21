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

## Invariantes

1. Cada tarefa pertence a exatamente um projeto e uma semana e tem pelo menos um responsável.
2. As tarefas são visualizadas transversalmente; selecionar um projeto restringe a visão, sem mudar as permissões.
3. Os status são `open`, `in_progress` e `done`. Movimentações em ambas as direções são permitidas e auditadas.
4. Um administrador global pode editar todos os cards. Um colaborador pode editar somente os cards que administra e mover também os cards pelos quais é responsável.
5. Um colaborador que cria uma tarefa deve ser o administrador inicial daquele card.
6. Histórico e estado da tarefa são gravados atomicamente. Conflitos de versão não produzem alteração nem evento extra.
7. Nome, foto, e-mail e função profissional não alteram o papel de acesso.
8. Pessoas autenticadas podem consultar as tarefas, as pessoas e o histórico do espaço. Não há fronteira de autorização por projeto nesta etapa.

## Próxima etapa confirmada

Permitir configurar os projetos no produto. A entrega inicial cadastra Clínica estética, Vinhos e Peças automotivas nas migrations e oferece alternância rápida na lateral, identificação nos cards e filtro transversal. Não existem ainda telas de criação, edição ou exclusão de projetos.
