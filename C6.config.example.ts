type SecretSource = {
    passEnv?: string;
    vaultPath?: string;
};

const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const resolveDbPassword = async (source: SecretSource): Promise<string> => {
    if (source.passEnv) {
        return requireEnv(source.passEnv);
    }

    if (source.vaultPath) {
        // Replace this block with your vault client call.
        // Example:
        // const secret = await vaultClient.read(source.vaultPath);
        // return secret.password;
        throw new Error(
            `Vault lookup not implemented for '${source.vaultPath}'. Wire your vault client in resolveDbPassword().`,
        );
    }

    throw new Error("SecretSource must provide passEnv or vaultPath.");
};

export default async () => ({
    databases: [
        {
            alias: "app",
            host: "127.0.0.1",
            port: 3306,
            user: "root",
            pass: await resolveDbPassword({
                passEnv: "APP_DB_PASS",
                // vaultPath: "kv/data/app/mysql",
            }),
            dbnames: ["app"],
        },
        {
            alias: "billing",
            host: "10.0.0.12",
            port: 3306,
            user: "billing_user",
            pass: await resolveDbPassword({
                passEnv: "BILLING_DB_PASS",
                // vaultPath: "kv/data/billing/mysql",
            }),
            dbnames: ["billing"],
        },
        {
            alias: "analytics",
            host: "analytics-db.internal",
            port: 3306,
            user: "analytics_user",
            pass: await resolveDbPassword({
                passEnv: "ANALYTICS_DB_PASS",
                // vaultPath: "kv/data/analytics/mysql",
            }),
            dbnames: ["analytics", "app"],
        },
    ],
    primaryAlias: "app",
    prefix: "",
    restUrlExpression: "\"/rest/\"",
});
