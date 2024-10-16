/**
 * Import will remove at compile time
 */

import type { xBuildConfig } from '@remotex-labs/xbuild';

/**
 * Imports
 */

import { version } from 'process';
import pkg from './package.json' with { type: 'json' };

/**
 * Config build
 */

const config: xBuildConfig = {
    declaration: true,
    esbuild: {
        bundle: true,
        minify: true,
        format: 'esm',
        outdir: 'dist/esm',
        target: [ `node${ version.slice(1) }` ],
        platform: 'node',
        packages: 'external',
        sourcemap: 'external',
        sourceRoot: `https://github.com/remotex-lab/xmap/tree/${ pkg.version }/`,
        entryPoints: [ 'src/index.ts' ]
    }
};

export default config;
