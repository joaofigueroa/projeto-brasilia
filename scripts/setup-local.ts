import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

if (existsSync(".env.local")) {
  const existing = await readFile(".env.local", "utf8");
  if (!existing.includes("BRASILIA_LOCAL_DATABASE="))
    throw new Error(
      "Existe uma configuração de ambiente. Preserve-a; o setup local não sobrescreve conexões existentes.",
    );
} else {
  await writeFile(
    ".env.local",
    `BRASILIA_LOCAL_DATABASE=.local/postgres\nBETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}\nBETTER_AUTH_URL=http://localhost:3000\n`,
    { mode: 0o600 },
  );
}

await import("./environment");
const { hashPassword } = await import("better-auth/crypto");
const { v7 } = await import("uuid");
const { migrateDatabase } = await import("./migrate");
const { closeDatabase } = await import("../src/server/db/client");
const { listUsers, insertUser } = await import("../src/server/repositories/users");
const { listProjects } = await import("../src/server/repositories/projects");
const { insertTask } = await import("../src/server/repositories/tasks");
const { todayInSaoPaulo, mondayOf, addDays } = await import("../src/libs/calendar");

try {
  await mkdir(".local", { recursive: true });
  await migrateDatabase();
  if ((await listUsers()).length) {
    console.log("Banco local já preparado. Acesso em .local/access.txt.");
  } else {
    const password = randomBytes(18).toString("base64url");
    const collaboratorPassword = randomBytes(18).toString("base64url");
    const people = [
      {
        name: "João Figueroa",
        email: "admin@brasilia.local",
        jobTitle: "Gestão de projetos",
        role: "admin" as const,
        image: "/avatars/joao.svg",
      },
      {
        name: "Ana Martins",
        email: "ana@brasilia.local",
        jobTitle: "Marketing e conteúdo",
        role: "collaborator" as const,
        image: "/avatars/ana.svg",
      },
      {
        name: "Lucas Almeida",
        email: "lucas@brasilia.local",
        jobTitle: "Operações",
        role: "collaborator" as const,
        image: "/avatars/lucas.svg",
      },
      {
        name: "Beatriz Costa",
        email: "bia@brasilia.local",
        jobTitle: "Comercial",
        role: "collaborator" as const,
        image: "/avatars/bia.svg",
      },
    ];
    const passwordHash = await hashPassword(password);
    const collaboratorHash = await hashPassword(collaboratorPassword);
    const users: Awaited<ReturnType<typeof insertUser>>[] = [];
    for (const person of people)
      users.push(
        await insertUser({
          ...person,
          id: v7(),
          passwordHash: person.role === "admin" ? passwordHash : collaboratorHash,
        }),
      );
    const projects = await listProjects();
    const weekStart = mondayOf(todayInSaoPaulo());
    const examples = [
      {
        title: "Planejar a campanha de fim de ano",
        description:
          "Organizar os temas, canais e próximos passos da campanha. Alinhar o calendário com a equipe antes de iniciar a produção.",
        project: 0,
        assignees: [1, 0],
        status: "open" as const,
        priority: "high" as const,
        day: 4,
      },
      {
        title: "Selecionar os rótulos da nova coleção",
        description:
          "Consolidar uma seleção inicial de vinhos para a próxima temporada e avaliar disponibilidade com os fornecedores.",
        project: 1,
        assignees: [3],
        status: "open" as const,
        priority: "medium" as const,
        day: 3,
      },
      {
        title: "Revisar o catálogo de peças",
        description: "Conferir códigos, descrições e fotos dos itens que entrarão no catálogo.",
        project: 2,
        assignees: [2],
        status: "open" as const,
        priority: "low" as const,
        day: 4,
      },
      {
        title: "Criar a nova experiência de agendamento",
        description:
          "Desenhar um fluxo simples de agendamento, do primeiro contato à confirmação do horário.",
        project: 0,
        assignees: [1, 2],
        status: "in_progress" as const,
        priority: "high" as const,
        day: 3,
      },
      {
        title: "Organizar a degustação de novembro",
        description:
          "Confirmar os convidados e preparar a seleção de rótulos para a experiência de degustação.",
        project: 1,
        assignees: [3, 0],
        status: "in_progress" as const,
        priority: "medium" as const,
        day: 4,
      },
      {
        title: "Alinhar a operação com fornecedores",
        description: "Reunir os prazos e as condições comerciais para o próximo ciclo de compras.",
        project: 2,
        assignees: [2],
        status: "in_progress" as const,
        priority: "medium" as const,
        day: 2,
      },
      {
        title: "Definir os serviços do novo portfólio",
        description:
          "Organizar os serviços, suas descrições e diferenciais para a atualização do portfólio da clínica.",
        project: 0,
        assignees: [1],
        status: "done" as const,
        priority: "medium" as const,
        day: 1,
      },
      {
        title: "Mapear os parceiros de distribuição",
        description: "Consolidar contatos e regiões de atendimento dos parceiros comerciais.",
        project: 2,
        assignees: [2, 3],
        status: "done" as const,
        priority: "low" as const,
        day: 0,
      },
    ];
    for (const example of examples)
      await insertTask({
        id: v7(),
        title: example.title,
        description: example.description,
        projectId: projects[example.project].id,
        administratorId: users[0].id,
        actorId: users[0].id,
        assigneeIds: example.assignees.map((index) => users[index].id),
        weekStart,
        dueDate: addDays(weekStart, example.day),
        status: example.status,
        priority: example.priority,
        changes: [],
      });
    await writeFile(
      ".local/access.txt",
      `AMBIENTE LOCAL ISOLADO — dados de demonstração\n\nAdministrador\nE-mail: admin@brasilia.local\nSenha: ${password}\n\nColaboradora\nE-mail: ana@brasilia.local\nSenha: ${collaboratorPassword}\n\nCredenciais apenas para este banco local. Não versionar.\n`,
      { mode: 0o600 },
    );
    console.log(
      "Ambiente local preparado com 3 projetos e 8 tarefas. Credenciais em .local/access.txt.",
    );
  }
} finally {
  await closeDatabase();
}
