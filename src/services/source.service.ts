/**
 * Import will remove at compile time
 */

import type { SourceMapInterface } from '@services/interfaces/source.interface';

/**
 * A service for validating and processing source maps.
 */

export class SourceService {
    /**
     * The name of the generated file (bundle) that this source map applies to.
     */

    readonly file: string | null;

    /**
     * Creates a new instance of the SourceService class.
     *
     * This constructor initializes a `SourceService` instance using the provided source map object.
     * It performs validation to ensure that the source map contains all required properties.
     * If the provided source is a JSON string, it parses the string into an object that conforms to the `SourceMapInterface`.
     *
     * @param source - An object conforming to the `SourceMapInterface` representing the source map to be validated and processed.
     *                 If a JSON string is provided, it will be parsed into an object of type `SourceMapInterface`.
     * @param file - An optional string representing the file associated with the source map (`bundle.js`). Defaults to null.
     * @throws Error If any required property is missing from the source map object.
     */

    constructor(source: SourceMapInterface | string, file: string | null = null) {
        if (typeof source === 'string') {
            source = <SourceMapInterface> JSON.parse(source);
        }

        this.validateSourceMap(source);
        this.file = file;
    }

    /**
     * Validates the provided source map object.
     *
     * This method checks whether all required keys are present in the source map object.
     * It throws an error if any required keys are missing.
     *
     * @private
     * @param input - The source map object to be validated.
     * @throws Error If any required key is missing from the source map.
     *
     * @example
     * const sourceMap = {
     *     version: 3,
     *     file: 'example.js',
     *     names: ['src', 'maps', 'example', 'function', 'line', 'column'],
     *     sources: ['source1.js', 'source2.js'],
     *     mappings: 'AAAA,SAASA,CAAC,CAAC,CAAC;AAAA,CAAC,CAAC;AAAC,CAAC',
     *     sourcesContent: ['console.log("Hello world");', 'console.log("Another file");']
     * };
     *
     * try {
     *     validateSourceMap(sourceMap);
     *     console.log('Source map is valid.');
     * } catch (error) {
     *     console.error('Invalid source map:', error.message);
     * }
     */

    private validateSourceMap(input: SourceMapInterface): void {
        const requiredKeys: (keyof SourceMapInterface)[] = [ 'version', 'sources', 'mappings', 'names' ];
        if (!requiredKeys.every(key => key in input)) {
            throw new Error('Missing required keys in SourceMap.');
        }
    }
}
