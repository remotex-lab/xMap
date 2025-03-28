/**
 * Import will remove at compile time
 */

import type {
    PositionInterface,
    SourceMapInterface,
    SourceOptionsInterface,
    PositionWithCodeInterface,
    PositionWithContentInterface
} from '@services/interfaces/source-service.interface';

/**
 * Imports
 */

import { MappingProvider } from '@providers/mapping.provider';
import { Bias } from '@providers/interfaces/mapping-provider.interface';

/**
 * A service for validating and processing source maps that provides functionality for parsing,
 * position mapping, concatenation, and code snippet extraction.
 *
 * @param source - Source map data (SourceService, SourceMapInterface object, or JSON string)
 * @param file - Optional file name for the generated bundle
 * @returns A new SourceService instance
 *
 * @example
 * ```ts
 * const sourceMapJSON = '{"version": 3, "file": "bundle.js", "sources": ["foo.ts"], "names": [], "mappings": "AAAA"}';
 * const sourceService = new SourceService(sourceMapJSON);
 * console.log(sourceService.file); // 'bundle.js'
 * ```
 *
 * @since 1.0.0
 */

export class SourceService {
    /**
     * The name of the generated file this source map applies to.
     *
     * @since 1.0.0
     */

    readonly file: string | null;

    /**
     * Provider for accessing and manipulating the base64 VLQ-encoded mappings.
     *
     * @since 1.0.0
     */

    readonly mappings: MappingProvider;

    /**
     * The root URL for resolving relative paths in the source files.
     * @since 1.0.0
     */

    readonly sourceRoot: string | null;

    /**
     * List of symbol names referenced by the mappings.
     * @since 1.0.0
     */

    readonly names: Array<string>;

    /**
     * Array of source file paths.
     * @since 1.0.0
     */

    readonly sources: Array<string>;

    /**
     * Array of source file contents.
     * @since 1.0.0
     */

    readonly sourcesContent: Array<string>;

    /**
     * Creates a new SourceService instance.
     *
     * @param source - Source map data (SourceService, SourceMapInterface object, or JSON string)
     * @param file - Optional file name for the generated bundle
     *
     * @throws Error - When a source map has an invalid format or missing required properties
     *
     * @since 1.0.0
     */

    constructor(source: SourceService);
    constructor(source: SourceMapInterface | string, file?: string | null);
    constructor(source: SourceService | SourceMapInterface | string, file: string | null = null) {
        if (typeof source === 'string') {
            source = <SourceMapInterface> JSON.parse(source);
        }

        source = <SourceMapInterface> source;
        this.validateSourceMap(source);
        this.file = source.file ?? file;
        this.names =  [ ...source.names ?? [] ];
        this.sources = [ ...source.sources ?? [] ];
        this.sourceRoot = source.sourceRoot ?? null;
        this.sourcesContent = source.sourcesContent ? [ ...source.sourcesContent ] : [];
        this.mappings = new MappingProvider(source.mappings);
    }

    /**
     * Converts the source map data to a plain object.
     *
     * @returns A SourceMapInterface object representing the current state
     *
     * @example
     * ```ts
     * const mapObject = sourceService.getMapObject();
     * console.log(mapObject.file); // 'bundle.js'
     * ```
     *
     * @since 1.0.0
     */

    getMapObject(): SourceMapInterface {
        const sourceMap: SourceMapInterface = {
            version: 3,
            names: this.names,
            sources: this.sources,
            mappings: this.mappings.encode(),
            sourcesContent: this.sourcesContent
        };

        if (this.file)
            sourceMap.file = this.file;

        if (this.sourceRoot)
            sourceMap.sourceRoot = this.sourceRoot;

        return sourceMap;
    }

    /**
     * Concatenates additional source maps into the current instance.
     *
     * @param maps - Source maps to concatenate with the current map
     *
     * @example
     * ```ts
     * sourceService.concat(anotherSourceMap);
     * console.log(sourceService.sources); // Updated source paths
     * ```
     *
     * @throws Error - When no maps are provided
     *
     * @since 1.0.0
     */

    concat(...maps: Array<SourceMapInterface | SourceService>): void {
        if (maps.length < 1)
            throw new Error('At least one map must be provided for concatenation.');

        for (const map of (maps as Array<SourceMapInterface>)) {
            this.mappings.decode(map.mappings, this.names.length, this.sources.length);
            this.names.push(...map.names);
            this.sources.push(...map.sources);
            this.sourcesContent.push(...map.sourcesContent ?? []);
        }
    }

    /**
     * Creates a new SourceService instance with concatenated source maps.
     *
     * @param maps - Source maps to concatenate with a copy of the current map
     * @returns A new SourceService instance with the combined maps
     *
     * @example
     * ```ts
     * const newService = sourceService.concatNewMap(anotherSourceMap);
     * console.log(newService.sources); // Combined sources array
     * ```
     *
     * @throws Error - When no maps are provided
     *
     * @since 1.0.0
     */

    concatNewMap(...maps: Array<SourceMapInterface | SourceService>): SourceService {
        if (maps.length < 1)
            throw new Error('At least one map must be provided for concatenation.');

        const sourceService = new SourceService(this);
        for (const map of (maps as Array<SourceMapInterface>)) {
            sourceService.mappings.decode(map.mappings, sourceService.names.length, sourceService.sources.length);
            sourceService.names.push(...map.names);
            sourceService.sources.push(...map.sources);
            sourceService.sourcesContent.push(...map.sourcesContent ?? []);
        }

        return sourceService;
    }

    /**
     * Finds position in generated code based on original source position.
     *
     * @param line - Line number in the original source
     * @param column - Column number in the original source
     * @param sourceIndex - Index or file path of the original source
     * @param bias - Position matching strategy (default: Bias.BOUND)
     * @returns Position information or null if not found
     *
     * @example
     * ```ts
     * const position = sourceService.getPositionByOriginal(1, 10, 'foo.ts');
     * console.log(position?.generatedLine); // Line in generated code
     * ```
     *
     * @since 1.0.0
     */

    getPositionByOriginal(line: number, column: number, sourceIndex: number | string, bias: Bias = Bias.BOUND): PositionInterface | null {
        let index = <number> sourceIndex;
        if (typeof sourceIndex === 'string')
            index = this.sources.findIndex(str => str.includes(sourceIndex));

        if (index < 0)
            return null;

        const segment = this.mappings.getOriginalSegment(line, column, index, bias);
        if (!segment)
            return null;

        return {
            name: this.names[segment.nameIndex ?? -1] ?? null,
            line: segment.line,
            column: segment.column,
            source: this.sources[segment.sourceIndex],
            sourceRoot: this.sourceRoot,
            sourceIndex: segment.sourceIndex,
            generatedLine: segment.generatedLine,
            generatedColumn: segment.generatedColumn
        };
    }

    /**
     * Finds position in an original source based on generated code position.
     *
     * @param line - Line number in the generated code
     * @param column - Column number in the generated code
     * @param bias - Position matching strategy (default: Bias.BOUND)
     * @returns Position information or null if not found
     *
     * @example
     * ```ts
     * const position = sourceService.getPosition(2, 15);
     * console.log(position?.source); // Original source file
     * ```
     *
     * @since 1.0.0
     */

    getPosition(line: number, column: number, bias: Bias = Bias.BOUND): PositionInterface | null {
        const segment = this.mappings.getSegment(line, column, bias);
        if (!segment)
            return null;

        return {
            name: this.names[segment.nameIndex ?? -1] ?? null,
            line: segment.line,
            column: segment.column,
            source: this.sources[segment.sourceIndex],
            sourceRoot: this.sourceRoot,
            sourceIndex: segment.sourceIndex,
            generatedLine: segment.generatedLine,
            generatedColumn: segment.generatedColumn
        };
    }

    /**
     * Retrieves position with source content for a location in generated code.
     *
     * @param line - Line number in the generated code
     * @param column - Column number in the generated code
     * @param bias - Position matching strategy (default: Bias.BOUND)
     * @returns Position with content information or null if not found
     *
     * @example
     * ```ts
     * const posWithContent = sourceService.getPositionWithContent(3, 5);
     * console.log(posWithContent?.sourcesContent); // Original source content
     * ```
     *
     * @since 1.0.0
     */

    getPositionWithContent(line: number, column: number, bias: Bias = Bias.BOUND): PositionWithContentInterface | null {
        const position = this.getPosition(line, column, bias);
        if (!position)
            return null;

        return {
            ...position,
            sourcesContent: this.sourcesContent[position.sourceIndex]
        };
    }

    /**
     * Retrieves position with a code snippet from the original source.
     *
     * @param line - Line number in the generated code
     * @param column - Column number in the generated code
     * @param bias - Position matching strategy (default: Bias.BOUND)
     * @param options - Configuration for the amount of surrounding lines
     * @returns Position with code snippet or null if not found
     *
     * @example
     * ```ts
     * const posWithCode = sourceService.getPositionWithCode(4, 8, Bias.BOUND, {
     *   linesBefore: 2,
     *   linesAfter: 2
     * });
     * console.log(posWithCode?.code); // Code snippet with context
     * ```
     *
     * @since 1.0.0
     */

    getPositionWithCode(line: number, column: number, bias: Bias = Bias.BOUND, options?: SourceOptionsInterface): PositionWithCodeInterface | null {
        const position = this.getPosition(line, column, bias);
        if (!position || !this.sourcesContent[position.sourceIndex])
            return null;

        const settings = Object.assign({
            linesAfter: 4,
            linesBefore: 3
        }, options);

        const code = this.sourcesContent[position.sourceIndex].split('\n');
        const endLine = Math.min( (position.line ?? 1) + settings.linesAfter, code.length);
        const startLine = Math.max((position.line ?? 1) - settings.linesBefore, 0);
        const relevantCode = code.slice(startLine, Math.min(endLine + 1, code.length)).join('\n');

        return {
            ...position,
            code: relevantCode,
            endLine: endLine,
            startLine: startLine
        };
    }

    /**
     * Serializes the source map to a JSON string.
     *
     * @returns JSON string representation of the source map
     *
     * @example
     * ```ts
     * const jsonString = sourceService.toString();
     * console.log(jsonString); // '{"version":3,"file":"bundle.js",...}'
     * ```
     *
     * @since 1.0.0
     */

    toString(): string {
        return JSON.stringify(this.getMapObject());
    }

    /**
     * Validates a source map object has all required properties.
     *
     * @param input - Source map object to validate
     *
     * @throws Error - When required properties are missing
     *
     * @since 1.0.0
     */

    private validateSourceMap(input: SourceMapInterface): void {
        const requiredKeys: (keyof SourceMapInterface)[] = [ 'sources', 'mappings', 'names' ];
        if (!requiredKeys.every(key => key in input)) {
            throw new Error('Missing required keys in SourceMap.');
        }
    }
}
