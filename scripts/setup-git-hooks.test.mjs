import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(sourceRoot, 'package.json'), 'utf8'));

async function fixture(t, { nested = false, development = false } = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'carbonnode-install-hook-'));
    await fs.chmod(root, 0o700);
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const packageRoot = nested ? path.join(root, 'node_modules/@carbonorm/carbonnode') : path.join(root, 'package');
    const bin = path.join(root, 'bin');
    const calls = path.join(root, 'git-calls.jsonl');
    await fs.mkdir(path.join(packageRoot, 'scripts'), { recursive: true });
    await fs.mkdir(bin);
    await fs.writeFile(path.join(bin, 'package.json'), '{"type":"module"}\n');
    await fs.writeFile(path.join(bin, 'git'), `#!${process.execPath}\nimport fs from 'node:fs';\nfs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + '\\n');\n`, { mode: 0o700 });
    await fs.copyFile(path.join(sourceRoot, 'scripts/setup-git-hooks.mjs'), path.join(packageRoot, 'scripts/setup-git-hooks.mjs'));
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: manifest.name, type: 'module', scripts: { postinstall: manifest.scripts.postinstall } }));
    if (nested || development) {
        const gitRoot = development ? packageRoot : root;
        await fs.mkdir(path.join(gitRoot, '.git'));
        await fs.writeFile(path.join(gitRoot, '.git/config'), 'consumer config must remain unchanged\n');
    }
    const env = { PATH: bin, HOME: root, LANG: 'C', LC_ALL: 'C', NO_COLOR: '1' };
    function run() {
        assert.equal(manifest.scripts.postinstall, 'node ./scripts/setup-git-hooks.mjs');
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
            import assert from 'node:assert/strict';
            await assert.rejects(import('chalk'), { code: 'ERR_MODULE_NOT_FOUND' });
            await import('./scripts/setup-git-hooks.mjs');
        `], { cwd: packageRoot, env, encoding: 'utf8', timeout: 5000, maxBuffer: 65536 });
        assert.equal(result.error, undefined);
        assert.equal(result.signal, null);
        assert.equal(result.status, 0, result.stderr);
    }
    return { root, packageRoot, calls, run };
}

test('published install hook succeeds without development dependencies or Git', async t => {
    const f = await fixture(t);
    f.run();
    await assert.rejects(fs.stat(f.calls), { code: 'ENOENT' });
    await assert.rejects(fs.stat(path.join(f.packageRoot, 'node_modules')), { code: 'ENOENT' });
});

test('dependency installation does not configure the consumer repository', async t => {
    const f = await fixture(t, { nested: true });
    f.run();
    assert.equal(await fs.readFile(path.join(f.root, '.git/config'), 'utf8'), 'consumer config must remain unchanged\n');
    await assert.rejects(fs.stat(f.calls), { code: 'ENOENT' });
});

test('development checkout still configures and makes its own hooks executable', async t => {
    const f = await fixture(t, { development: true });
    const hooks = path.join(f.packageRoot, '.githooks');
    await fs.mkdir(hooks);
    const hook = path.join(hooks, 'pre-commit');
    await fs.writeFile(hook, '#!/bin/sh\nexit 0\n', { mode: 0o600 });
    f.run();
    const calls = (await fs.readFile(f.calls, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(calls, [['rev-parse', '--git-dir'], ['config', 'core.hooksPath', '.githooks']]);
    assert.equal((await fs.stat(hook)).mode & 0o777, 0o755);
});
