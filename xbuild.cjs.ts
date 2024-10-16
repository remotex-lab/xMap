/**
 * Import will remove at compile time
 */

import type { xBuildConfig } from '@remotex-labs/xbuild';

/**
 * Imports
 */

import esmConfig from './xbuild.config';

/**
 * Config build
 */

const config: xBuildConfig = {
    ...esmConfig,
    esbuild: {
        ...esmConfig.esbuild,
        format: 'cjs',
        outdir: 'dist/cjs'
    }
};

export default config;
