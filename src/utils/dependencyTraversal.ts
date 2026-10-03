// Symbols cannot be supplied through JSON/REST payloads.
export const dependencyTraversal = Symbol('dependencyTraversal');
type Traversal = { remaining: number; seen: Set<string> };
type Cursor = { traversal: Traversal; depth: number };

export function reserveDependency(parent: any, table: string, child: any): boolean {
    const cursor: Cursor = parent[dependencyTraversal] ??= {
        traversal: { remaining: 100, seen: new Set<string>() }, depth: 0,
    };
    const key = JSON.stringify([table, child.WHERE]);
    if (cursor.traversal.seen.has(key)) return false;
    if (cursor.depth >= 8 || cursor.traversal.remaining <= 0) {
        throw new Error('Dependency traversal limit exceeded (8 levels / 100 requests).');
    }
    cursor.traversal.seen.add(key);
    cursor.traversal.remaining--;
    child[dependencyTraversal] = { traversal: cursor.traversal, depth: cursor.depth + 1 };
    return true;
}
