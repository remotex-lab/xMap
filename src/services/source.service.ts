/**
 * Import will remove at compile time
 */

import type {
    PositionInterface,
    SourceMapInterface,
    SourceOptionsInterface,
    PositionWithCodeInterface,
    PositionWithContentInterface
} from '@services/interfaces/source.interface';

/**
 * Imports
 */

import { MappingProvider } from '@providers/mapping.provider';
import { Bias } from '@providers/interfaces/mapping.interface';

/**
 * A service for validating and processing source maps.
 * This class allows parsing and manipulation of source maps, providing functionality such as
 * retrieving position mappings between original and generated code, concatenating source maps,
 * and getting code snippets based on mappings.
 *
 * @example
 * ```ts
 * const sourceMapJSON = '{"version": 3, "file": "bundle.js", "sources": ["foo.ts"], "names": [], "mappings": "AAAA"}';
 * const sourceService = new SourceService(sourceMapJSON);
 *
 * console.log(sourceService.file); // Outputs: 'bundle.js'
 * ```
 */

export class SourceService {
    /**
     * The name of the generated file (bundle) that this source map applies to.
     *
     * @example
     * ```ts
     * console.log(sourceService.file); // 'bundle.js'
     * ```
     */

    readonly file: string | null;

    /**
     * A MappingProvider instance of base64 VLQ-encoded mappings.
     */

    readonly mappings: MappingProvider;

    /**
     * The root URL for the sources, if present in the source map.
     */

    readonly sourceRoot: string | null;

    /**
     * A list of symbol names used by the “mappings” entry.
     */

    readonly names: Array<string>;

    /**
     * An array of source file paths.
     */

    readonly sources: Array<string>;

    /**
     * An array of source files contents.
     */

    readonly sourcesContent: Array<string>;

    /**
     * Creates a new instance of the `SourceService` class.
     *
     * This constructor initializes the class using either a `SourceMapInterface` object,
     * a JSON string representing the source map, or an existing `SourceService` instance.
     * It validates the source map and populates its properties such as `file`, `sources`, and `mappings`.
     *
     * @param source - Can be one of the following:
     *   - An object conforming to the `SourceMapInterface`.
     *   - A JSON string representing the source map.
     *   - A `SourceService` instance to copy the properties.
     * @param file - (Optional) A string representing the file name of the generated bundle.
     *               Defaults to `null`. It will overwrite any existing `file` property in the source map.
     * @throws {Error} - If the source map does not contain required properties or has an invalid format.
     *
     * @example
     * ```ts
     * const sourceMapJSON = '{"version": 3, "file": "bundle.js", "sources": ["foo.ts"], "names": [], "mappings": "AAAA"}';
     * const sourceService = new SourceService(sourceMapJSON);
     * ```
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
        this.sourcesContent = source.sourcesContent ? [ ...source.sourcesContent ] : [];;
        this.mappings = new MappingProvider(source.mappings);
    }

    /**
     * Converts the current source map data into a plain object format.
     *
     * @returns The source map json object.
     *
     * @example
     * ```ts
     * const mapObject = sourceService.getMapObject();
     * console.log(mapObject.file); // 'bundle.js'
     * ```
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
     * Concatenates one or more source maps to the current source map.
     *
     * This method merges additional source maps into the current source map,
     * updating the `mappings`, `names`, `sources`, and `sourcesContent` arrays.
     *
     * @param maps - An array of `SourceMapInterface` or `SourceService` instances to be concatenated.
     * @throws { Error } If no source maps are provided for concatenation.
     *
     * @example
     * ```ts
     * sourceService.concat(anotherSourceMap);
     * console.log(sourceService.sources); // Updated source paths
     * ```
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
     * Creates a new instance of `SourceService` with concatenated source maps.
     *
     * @param maps - An array of `SourceMapInterface` or `SourceService` instances to be concatenated.
     * @returns { SourceService } A new `SourceService` instance with the concatenated maps.
     * @throws { Error } If no source maps are provided.
     *
     * @example
     * ```ts
     * const newService = sourceService.concatNewMap(anotherSourceMap);
     * console.log(newService.file); // The file from the new source map
     * ```
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
     * Retrieves the position information based on the original source line and column.
     *
     * @param line - The line number in the generated code.
     * @param column - The column number in the generated code.
     * @param sourceIndex - The index or file path of the original source.
     * @param bias - The bias to use when matching positions (`Bias.LOWER_BOUND`, `Bias.UPPER_BOUND`, or `Bias.BOUND`).
     * @returns { PositionInterface | null } The corresponding position in the original source, or `null` if not found.
     *
     * @example
     * ```ts
     * const position = sourceService.getPositionByOriginal(1, 10, 'foo.ts');
     * console.log(position?.line); // The line number in the original source
     * ```
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
     * Retrieves the position in the original source code based on a given line and column
     * in the generated code.
     *
     * @param line - Line number in the generated code.
     * @param column - Column number in the generated code.
     * @param bias - The bias to use for matching positions. Defaults to `Bias.BOUND`.
     * @returns {PositionInterface | null} The position in the original source, or null if not found.
     *
     * @example
     * ```ts
     * const position = sourceService.getPosition(2, 15);
     * console.log(position?.source); // The original source file
     * ```
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
     * Retrieves the position and original source content for a given position in the generated code.
     *
     * @param line - Line number in the generated code.
     * @param column - Column number in the generated code.
     * @param bias - Bias used for position matching.
     * @returns { PositionWithContentInterface | null } The position and its associated content, or `null` if not found.
     *
     * @example
     * ```ts
     * const positionWithContent = sourceService.getPositionWithContent(3, 5);
     * console.log(positionWithContent?.sourcesContent); // The source code content
     * ```
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
     * Retrieves the position and a code snippet from the original source based on the given
     * generated code position, with additional lines of code around the matching line.
     *
     * @param line - Line number in the generated code.
     * @param column - Column number in the generated code.
     * @param bias - Bias used for position matching.
     * @param options - (Optional) Extra options for the amount of surrounding lines to include.
     * @returns { PositionWithCodeInterface | null } The position and code snippet.
     *
     * @example
     * ```ts
     * const positionWithCode = sourceService.getPositionWithCode(4, 8, Bias.BOUND, { linesBefore: 2, linesAfter: 2 });
     * console.log(positionWithCode?.code); // The code snippet from the original source
     * ```
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
     * Converts the current source map object to a JSON string.
     *
     * @returns A stringified version of the source map object.
     *
     * @example
     * ```ts
     * console.log(sourceService.toString()); // JSON string of the source map
     * ```
     */

    toString(): string {
        return JSON.stringify(this.getMapObject());
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
     * ```ts
     * const sourceMap = {
     *     version: 3,
     *     file: 'example.js',
     *     names: ['src', 'maps', 'example', 'function', 'line', 'column'],
     *     sources: ['source1.js', 'source2.js'],
     *     mappings: 'AAAA,SAASA,CAAC,CAAC,CAAC;AAAA,CAAC,CAAC;AAAC,CAAC',
     * };
     * sourceService['validateSource'](sourceMap); // Throws if invalid
     * ```
     */

    private validateSourceMap(input: SourceMapInterface): void {
        const requiredKeys: (keyof SourceMapInterface)[] = [ 'sources', 'mappings', 'names' ];
        if (!requiredKeys.every(key => key in input)) {
            throw new Error('Missing required keys in SourceMap.');
        }
    }
}
