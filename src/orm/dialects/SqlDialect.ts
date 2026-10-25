export type SqlDialectName = "mysql" | "postgresql";

export interface SqlDialect {
    name: SqlDialectName;
    quoteIdentifier(identifier: string): string;
    tableReference(table: string, alias?: string): string;
    defaultLimit(): string;
    pagination(limit: number, page: number): string;
    selectFrom(table: string): string;
    updateTable(table: string): string;
    deleteFrom(table: string, hasJoin: boolean): string;
    insertInto(verb: string, table: string): string;
    columnList(columns: string[]): string;
    assignmentColumn(column: string): string;
    upsertUpdateClause(columns: string[], conflictColumns?: string[]): string;
    insertReturningClause(): string;
    indexHintClause(kind: string, indexes: string[]): string;
    formatDerivedTableAlias(alias: string): string;
    formatJoinedTable(table: string, alias?: string, hintClause?: string): string;
    positionalPlaceholder(position: number): string;
}

const escapeBacktick = (identifier: string): string => identifier.replace(/`/g, "``");
const escapeDoubleQuote = (identifier: string): string => identifier.replace(/"/g, "\"\"");

export const mysqlDialect: SqlDialect = {
    name: "mysql",
    quoteIdentifier(identifier: string): string {
        return `\`${escapeBacktick(identifier)}\``;
    },
    tableReference(table: string, alias?: string): string {
        return alias
            ? `${this.quoteIdentifier(table)} AS ${this.quoteIdentifier(alias)}`
            : this.quoteIdentifier(table);
    },
    defaultLimit(): string {
        return " LIMIT 100";
    },
    pagination(limit: number, page: number): string {
        if (page === 1) return ` LIMIT ${limit}`;
        return ` LIMIT ${(page - 1) * limit}, ${limit}`;
    },
    selectFrom(table: string): string {
        return `FROM ${this.quoteIdentifier(table)}`;
    },
    updateTable(table: string): string {
        return `UPDATE ${this.quoteIdentifier(table)}`;
    },
    deleteFrom(table: string): string {
        return `DELETE ${this.quoteIdentifier(table)} FROM ${this.quoteIdentifier(table)}`;
    },
    insertInto(verb: string, table: string): string {
        return `${verb} INTO ${this.quoteIdentifier(table)}`;
    },
    columnList(columns: string[]): string {
        return columns.map(column => this.quoteIdentifier(column)).join(", ");
    },
    assignmentColumn(column: string): string {
        return this.quoteIdentifier(column);
    },
    upsertUpdateClause(columns: string[]): string {
        return ` ON DUPLICATE KEY UPDATE ${columns
            .map(column => `${this.quoteIdentifier(column)} = VALUES(${this.quoteIdentifier(column)})`)
            .join(", ")}`;
    },
    insertReturningClause(): string {
        return "";
    },
    indexHintClause(kind: string, indexes: string[]): string {
        if (!indexes.length) return "";
        return `${kind} (${indexes.map(index => this.quoteIdentifier(index)).join(", ")})`;
    },
    formatDerivedTableAlias(alias: string): string {
        return `AS ${this.quoteIdentifier(alias)}`;
    },
    formatJoinedTable(table: string, alias?: string, hintClause?: string): string {
        const base = this.tableReference(table, alias);
        return hintClause ? `${base} ${hintClause}` : base;
    },
    positionalPlaceholder(): string {
        return "?";
    },
};

export const postgresqlDialect: SqlDialect = {
    name: "postgresql",
    quoteIdentifier(identifier: string): string {
        return `"${escapeDoubleQuote(identifier)}"`;
    },
    tableReference(table: string, alias?: string): string {
        return alias
            ? `${this.quoteIdentifier(table)} AS ${this.quoteIdentifier(alias)}`
            : this.quoteIdentifier(table);
    },
    defaultLimit(): string {
        return " LIMIT 100";
    },
    pagination(limit: number, page: number): string {
        if (page === 1) return ` LIMIT ${limit}`;
        return ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    },
    selectFrom(table: string): string {
        return `FROM ${this.quoteIdentifier(table)}`;
    },
    updateTable(table: string): string {
        return `UPDATE ${this.quoteIdentifier(table)}`;
    },
    deleteFrom(table: string, _hasJoin: boolean): string {
        return `DELETE FROM ${this.quoteIdentifier(table)}`;
    },
    insertInto(verb: string, table: string): string {
        if (verb.toUpperCase() === "REPLACE") {
            throw new Error("PostgreSQL does not support REPLACE. Use INSERT with ON CONFLICT support.");
        }
        return `INSERT INTO ${this.quoteIdentifier(table)}`;
    },
    columnList(columns: string[]): string {
        return columns.map(column => this.quoteIdentifier(column)).join(", ");
    },
    assignmentColumn(column: string): string {
        return this.quoteIdentifier(column);
    },
    upsertUpdateClause(columns: string[], conflictColumns: string[] = []): string {
        if (conflictColumns.length === 0) {
            throw new Error("PostgreSQL ON CONFLICT support requires primary key metadata for the conflict target.");
        }
        if (columns.length === 0) {
            return ` ON CONFLICT (${conflictColumns.map(column => this.quoteIdentifier(column)).join(", ")}) DO NOTHING`;
        }

        return ` ON CONFLICT (${conflictColumns.map(column => this.quoteIdentifier(column)).join(", ")}) DO UPDATE SET ${columns
            .map(column => `${this.quoteIdentifier(column)} = EXCLUDED.${this.quoteIdentifier(column)}`)
            .join(", ")}`;
    },
    insertReturningClause(): string {
        return " RETURNING *";
    },
    indexHintClause(): string {
        return "";
    },
    formatDerivedTableAlias(alias: string): string {
        return `AS ${this.quoteIdentifier(alias)}`;
    },
    formatJoinedTable(table: string, alias?: string): string {
        return this.tableReference(table, alias);
    },
    positionalPlaceholder(position: number): string {
        return `$${position}`;
    },
};

export const resolveSqlDialect = (dialect?: SqlDialectName | SqlDialect): SqlDialect => {
    if (!dialect) return mysqlDialect;
    if (typeof dialect === "object") return dialect;
    if (dialect === "postgresql") return postgresqlDialect;
    return mysqlDialect;
};
