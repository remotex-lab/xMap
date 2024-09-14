/**
 * Import will remove at compile time
 */

import type { xBuildConfig } from '@remotex-labs/xbuild';

/**
 * Imports
 */

import { version } from 'process';

const config: xBuildConfig = {
    declaration: true,
    esbuild: {
        bundle: true,
        minify: true,
        format: 'cjs',
        target: [ `node${ version.slice(1) }` ],
        platform: 'node',
        packages: 'external',
        sourcemap: true,
        entryPoints: [ 'src/index.ts' ]
    }
};

export default config;
