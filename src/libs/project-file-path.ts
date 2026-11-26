export type ProjectFileFolder = { id: string; name: string; parentId: string | null };

export function projectFilePath(
  folders: ReadonlyMap<string, ProjectFileFolder>,
  folderId: string | null,
) {
  const path: ProjectFileFolder[] = [];
  const visited = new Set<string>();
  for (let current = folderId; current && !visited.has(current); ) {
    const folder = folders.get(current);
    if (!folder) break;
    path.unshift(folder);
    visited.add(folder.id);
    current = folder.parentId;
  }
  return path;
}
