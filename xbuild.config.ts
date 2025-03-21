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

const config: Array<xBuildConfig> = [
    {
        declaration: true,
        esbuild: {
            bundle: true,
            minify: true,
            format: 'esm',
            outdir: 'dist/esm',
            target: [ `node${ version.slice(1) }` ],
            platform: 'node',
            packages: 'external',
            sourcemap: true,
            sourceRoot: `https://github.com/remotex-lab/xmap/tree/v${ pkg.version }/`,
            entryPoints: {
                'index': 'src/index.ts',
                'parser.component': 'src/components/parser.component.ts',
                'formatter.component': 'src/components/formatter.component.ts',
                'highlighter.component': 'src/components/highlighter.component.ts'
            }
        }
    },
    {
        declaration: false,
        noTypeChecker: true,
        esbuild: {
            bundle: true,
            format: 'cjs',
            outdir: 'dist/cjs'
        }
    }
];

export default config;
