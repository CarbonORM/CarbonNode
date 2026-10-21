import {describe, expect, it} from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {spawnSync} from 'child_process';

describe('package security', () => {
    it('loads the CommonJS export in Node', () => {
        const result = spawnSync(process.execPath, ['-e', "const api = require('@carbonorm/carbonnode'); if (typeof api.restOrm !== 'function') process.exit(1)"], {cwd: process.cwd(), encoding: 'utf8'});
        expect(result.status, result.stderr).toBe(0);
    });
    it('does not overwrite a consumer repository hook configuration during install', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carbonnode-hooks-'));
        try {
            const git = (args: string[]) => spawnSync('git', args, {cwd: dir, encoding: 'utf8'});
            expect(git(['init']).status).toBe(0);
            expect(git(['config', 'core.hooksPath', 'consumer-security-hooks']).status).toBe(0);
            const pkg = path.join(dir, 'node_modules', 'test-carbonnode');
            fs.mkdirSync(path.join(pkg, 'scripts'), {recursive: true});
            fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({type: 'module'}));
            fs.copyFileSync('scripts/setup-git-hooks.mjs', path.join(pkg, 'scripts/setup-git-hooks.mjs'));
            fs.symlinkSync(path.resolve('node_modules'), path.join(pkg, 'node_modules'));
            const result = spawnSync(process.execPath, ['scripts/setup-git-hooks.mjs'], {cwd: pkg, encoding: 'utf8'});
            expect(result.status, result.stderr).toBe(0);
            expect(git(['config', 'core.hooksPath']).stdout.trim()).toBe('consumer-security-hooks');
        } finally {fs.rmSync(dir, {recursive: true, force: true});}
    });
});
