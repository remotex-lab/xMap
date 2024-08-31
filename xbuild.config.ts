/**
 * Import will remove at compile time
 */

import type { xBuildConfig } from '@remotex-labs/xbuild';

/**
 * Imports
 */

import { version } from 'process';
import pkg from './package.json' with  { type: 'json' };

const externals = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {})
];

const config: xBuildConfig = {
    declaration: true,
    esbuild: {
        bundle: true,
        minify: true,
        format: 'esm',
        target: [ `node${ version.slice(1) }` ],
        platform: 'node',
        external: externals,
        sourcemap: true,
        entryPoints: [ 'src/index.ts' ]
    }
};

export default config;
