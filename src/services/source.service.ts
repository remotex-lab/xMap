/**
 * Import will remove at compile time
 */

import type {
    MappingInterface,
    PositionInterface,
    SourceMapInterface,
    ShiftSegmentInterface,
    SourceOptionsInterface,
    PositionSourceInterface,
    ThresholdSegmentInterface
} from '@services/interfaces/source.interface';

/**
 * Imports
 */

import { Bias } from '@services/interfaces/source.interface';
import { decodeVLQ, encodeArrayVLQ } from '@components/base64.component';

/**
 * A service for validating and processing source maps.
 */

export class SourceService {
    /**
     * The name of the generated file (bundle) that this source map applies to.
     */

    private readonly file: string | null;

    /**
     * A list of symbol names used by the “mappings” entry.
     */

    private readonly names: Array<string>;

    /**
     * An array of source file paths.
     */

    private readonly sources: Array<string>;

    /**
     * A string of base64 VLQ-encoded mappings.
     */

    private readonly mappings: Array<MappingInterface>;

    /**
     * An array of source files contents.
     */

    private readonly sourcesContent: Array<string>;

    /**
     * The root URL for the sources, if present in the source map.
     */

    private readonly sourceRoot: string | null;

    /**
     * Creates a new instance of the SourceService class.
     *
     * This constructor initializes a `SourceService` instance using the provided source map object.
     * It performs validation to ensure that the source map contains all required properties.
     *
     * @param source - An object conforming to the `SourceMapInterface` representing the source map to be validated and processed.
     * @throws Error If any required property is missing from the source map object.
     */

    constructor(source: SourceMapInterface) {
        this.validateSourceMap(source);

        this.file = source.file ?? null;
        this.names = source.names ?? [];
        this.sources = source.sources ?? [];
        this.mappings = [];
        this.sourceRoot = source.sourceRoot ?? null;
        this.sourcesContent = source.sourcesContent ?? [];
        this.decodeMappings(source.mappings);
    }

    /**
     * Returns a plain object representation of the source map data.
     *
     * This method constructs and returns an object that includes key properties of the source map:
     * - `version`: The version of the source map specification (typically 3).
     * - `file`: The name of the generated file (optional).
     * - `names`: An array of function or variable names extracted from the original source code.
     * - `sources`: An array of file paths for the source files referenced in the mappings.
     * - `sourceRoot`: An optional root URL for resolving source file paths.
     * - `mappings`: A base64 VLQ-encoded string representing the source map mappings, generated by `encodeMappings`.
     * - `sourcesContent`: An optional array containing the content of the source files. This property may not be present in all source maps.
     *
     * @returns A plain object conforming to the `SourceMapInterface` structure,
     *                               representing the source map data.
     */

    getMapObject(): SourceMapInterface {
        const sourceMap: SourceMapInterface = {
            version: 3,
            names: this.names,
            sources: this.sources,
            mappings: this.encodeMappings(this.mappings),
            sourcesContent: this.sourcesContent
        };

        if(this.file)
            sourceMap.file = this.file;

        if (this.sourceRoot)
            sourceMap.sourceRoot = this.sourceRoot;

        return sourceMap;
    }

    /**
     * Retrieves information about the original source code for a given line and column in the generated code.
     *
     * This method looks up the source code mappings to find the corresponding source location and provides additional context based on the provided options.
     *
     * @param line - The line number in the generated code.
     * @param column - The column number in the generated code.
     * @param options - Optional configuration for retrieving source information.
     *   - `linesBefore` (default: 3): Number of lines before the matching source line to include in the context.
     *   - `linesAfter` (default: 4): Number of lines after the matching source line to include in the context.
     *   - `includeSourceContent` (default: false): Flag indicating whether to include the relevant source code snippet.
     * @returns An object containing source location information including:
     *   - `line`: The line number in the original source code.
     *   - `column`: The column number in the original source code.
     *   - `endLine`: The end line number of the included source code snippet.
     *   - `startLine`: The start line number of the included source code snippet.
     *   - `name`: The function or variable name at the source position, or null if not available.
     *   - `source`: The file name of the source code.
     *   - `code` (if `includeSourceContent` is true): A snippet of the source code surrounding the specified line.
     *
     * @returns Null if no matching mapping is found.
     */

    getSourcePosition(line: number, column: number, options?: SourceOptionsInterface): PositionSourceInterface | null {
        const settings = Object.assign({
            bias: Bias.LOWER_BOUND,
            linesAfter: 4,
            linesBefore: 3
        }, options);

        const map = this.findMapping(line, column, settings.bias);
        if (!map || isNaN(map.fileIndex)) {
            return null;
        }

        const code = this.sourcesContent[map.fileIndex].split('\n');
        const endLine = (map.sourceLine ?? 1) + settings.linesAfter;
        const startLine = Math.max((map.sourceLine ?? 1) - settings.linesBefore, 0);
        const relevantCode = code.slice(startLine, Math.min(endLine + 1, code.length)).join('\n');

        return {
            code: relevantCode,
            line: map.sourceLine,
            column: map.sourceColumn,
            endLine: endLine,
            startLine: startLine,
            name:this.names[map.nameIndex ?? -1] ?? null,
            source: this.sources[map.fileIndex]
        };
    }

    /**
     * Retrieves the position information in the original source code for a given line and column in the generated code.
     *
     * This method locates the corresponding source code position based on the provided line and column in the generated code.
     * It uses the specified bias to determine the best match when multiple mappings are possible.
     *
     * @param line - The line number in the generated code.
     * @param column - The column number in the generated code.
     * @param bias - Optional parameter specifying how to handle cases where only the line number matches:
     *   - `Bias.LOWER_BOUND` (default): If the line number matches but the column is less, returns the closest mapping with a lower column.
     *   - `Bias.UPPER_BOUND`: If the line number matches but the column is greater, returns the closest mapping with a higher column.
     *   - `Bias.BOUND`: If the line number matches but the column doesn't, returns null (default behavior).
     * @returns A `PositionInterface` object representing the position in the original source code, or `null` if no matching position is found.
     */

    getPosition(line: number, column: number, bias: Bias = Bias.LOWER_BOUND): PositionInterface | null {
        const map = this.findMapping(line, column, bias);
        if (!map) {
            return map;
        }

        return {
            line: map.sourceLine,
            column: map.sourceColumn,
            name: this.names[map.nameIndex ?? -1] ?? null,
            source: this.sources[map.fileIndex]
        };
    }

    /**
     * Merges multiple source maps into this source map object.
     * The order of the provided source maps must correspond to the order in which the source files were concatenated.
     *
     * This method appends the names, sources, and source contents from each provided source map to the current source map.
     * It also adjusts the mappings to account for the concatenation of the source files.
     *
     * @param maps - An array of `SourceMapInterface` instances representing the source maps to be merged.
     * @throws Error If no source maps are provided for concatenation.
     *
     * @example
     * // Merging two source maps
     * const map1: SourceMapInterface = { /* ... *\/ };
     * const map2: SourceMapInterface = { /* ... *\/ };
     * sourceMapService.concat(map1, map2);
     */

    concat(...maps: Array<SourceMapInterface>): void {
        if (maps.length < 1) {
            throw new Error('At least one map must be provided for concatenation.');
        }

        for (const map of maps) {
            this.names.push(...map.names);
            this.sources.push(...map.sources);
            this.sourcesContent.push(...map.sourcesContent);

            const lastSegment = this.mappings[this.mappings.length - 1];
            const lines = this.sourcesContent[lastSegment.fileIndex].split('\n').length;

            this.decodeMappings(maps[0].mappings, {
                nameIndex: this.names.length - 1,
                fileIndex: this.sources.length - 1,
                generatedLine: lines < 2 ? 2 : lines
            });
        }
    }

    /**
     * Converts the source map object to a JSON string representation.
     *
     * This method performs the following steps:
     * 1. Creates a plain object representation of the source map using the `getMapObject` method.
     * 2. Converts the plain object to a JSON string using `JSON.stringify`.
     *
     * @returns A JSON string representation of the source map.
     *
     * @example
     * const sourceMapString = sourceMapService.toString();
     * // sourceMapString contains the JSON string representation of the source map.
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
        const requiredKeys: (keyof SourceMapInterface)[] = [ 'version', 'sources', 'sourcesContent', 'mappings', 'names' ];
        if (!requiredKeys.every(key => key in input)) {
            throw new Error('Missing required keys in SourceMap.');
        }
    }

    /**
     * Decodes and processes the base64 VLQ-encoded mappings from a source map.
     *
     * This method interprets the encoded mappings from the `mappings` property of a source map. It adjusts
     * the shift state for both generated and original positions in the source code, and processes each
     * decoded mapping segment using the `decodedSegment` method.
     *
     * The decoding process involves:
     * 1. Parsing the base64 VLQ-encoded mappings.
     * 2. Adjusting the shift state based on the provided `thresholdSegment` or default values.
     * 3. Handling each decoded mapping segment with the `decodedSegment` method.
     *
     * @param encodedMappings - A string representing the encoded mappings in base64 VLQ format. This string
     *                          is typically found in the `mappings` property of a source map.
     * @param thresholdSegment - Optional. An object containing offset information that adjusts the starting
     *                           point for decoding. This can include offsets for line, column, or file index.
     *                           If not provided, default values are used.
     * @throws Error - Throws an error if the decoding process encounters an issue, such as an invalid
     *                 encoding or unexpected format.
     *
     * @example
     * const encodedMappings = 'AAAA,CAAC,CAAC,CAAC,CAAC;AAAA,CAAC,CAAC,CAAC,CAAC';
     * const threshold = {
     *     fileIndex: 0,
     *     nameIndex: 0,
     *     sourceLine: 1,
     *     sourceColumn: 1,
     *     generatedLine: 1,
     *     generatedColumn: 1
     * };
     * try {
     *     decodeMappings(encodedMappings, threshold);
     * } catch (error) {
     *     console.error('Failed to decode mappings:', error.message);
     * }
     */

    private decodeMappings(encodedMappings: string, thresholdSegment?: ThresholdSegmentInterface): void {
        // Note: Line and column numbers in source maps start at 1,
        // unlike arrays which start at 0. Therefore, the initial shift for lines is set to 1.
        const shift = Object.assign({
            fileIndex: 0,
            nameIndex: 0,
            sourceLine: 1,
            sourceColumn: 1,
            generatedLine: 1,
            generatedColumn: 1
        }, thresholdSegment);

        try {
            for (const [ generatedLine, stringSegments ] of encodedMappings.split(';').entries()) {
                if (!stringSegments) continue;
                shift.generatedColumn = 1;
                const segments = stringSegments.split(',');

                for (const segment of segments) {
                    if (segment.length < 4) continue;
                    const decodedSegment = decodeVLQ(segment);

                    this.decodedSegment(shift, decodedSegment, generatedLine + shift.generatedLine);
                }
            }
        } catch (error) {
            throw new Error(`Error decoding mappings: ${ (<Error>error).message }`);
        }
    }

    /**
     * Processes a decoded VLQ segment and updates the mapping information.
     *
     * This method adjusts the current mapping state based on the decoded VLQ segment and the current
     * line in the generated code. It then updates the internal mappings list with the new information.
     *
     * The decoding process involves:
     * 1. Extracting the mapping details from the `decodedSegment` array.
     * 2. Updating the shift values for file index, name index, source line, source column, and generated column.
     * 3. Adding the processed mapping to the internal `mappings` array.
     *
     * @param shift - The current state of mapping information. This object tracks the cumulative state
     *                of file index, name index, source line, source column, and generated column.
     * @param decodedSegment - An array representing the decoded VLQ segment, containing:
     *   - `generatedColumn`: The column number in the generated code.
     *   - `fileIndex`: The index in the sources array.
     *   - `sourceLine`: The line number in the original source code.
     *   - `sourceColumn`: The column number in the original source code.
     *   - `nameIndex`: The index in the names array.
     * @param generatedLine - The line index in the generated code where this segment applies.
     *
     * @example
     * const shift = {
     *     fileIndex: 0,
     *     nameIndex: 0,
     *     sourceLine: 1,
     *     sourceColumn: 1,
     *     generatedLine: 1,
     *     generatedColumn: 1
     * };
     * const decodedSegment = [2, 1, 3, 4, 5];
     * const generatedLine = 1;
     * this.decodedSegment(shift, decodedSegment, generatedLine);
     *
     * @see ShiftSegmentInterface for details on the `shift` parameter.
     * @see SourceMapInterface for details on the mapping properties.
     */

    private decodedSegment(shift: ShiftSegmentInterface, decodedSegment: Array<number>, generatedLine: number): void {
        const [ generatedColumn, fileIndex, sourceLine, sourceColumn, nameIndex ] = decodedSegment;
        shift.fileIndex += fileIndex;
        shift.nameIndex += nameIndex ?? 0;
        shift.sourceLine += sourceLine;
        shift.sourceColumn += sourceColumn;
        shift.generatedColumn += generatedColumn;

        this.mappings.push({
            nameIndex: (nameIndex !== undefined) ? shift.nameIndex : null,
            fileIndex: shift.fileIndex,
            sourceLine: shift.sourceLine,
            sourceColumn: shift.sourceColumn,
            generatedLine: generatedLine,
            generatedColumn: shift.generatedColumn
        });
    }

    /**
     * Encodes an array of mappings into a VLQ-encoded string representation.
     *
     * This method converts an array of `MappingInterface` objects into a base64 VLQ-encoded string,
     * which is used in source maps to represent the mapping between generated and original source code positions.
     *
     * The encoding process involves:
     * 1. Initializing the shift state to track the current line and column in the generated code.
     * 2. Iterating through the mappings to group them by line number and encode each segment.
     * 3. Concatenating encoded segments with the appropriate separator characters (`,` and `;`).
     *
     * @param mappings - An array of `MappingInterface` objects representing the mappings to encode. Each mapping object contains:
     *   - `nameIndex`: The index in the names array.
     *   - `fileIndex`: The index in the sources array.
     *   - `sourceLine`: The line number in the original source code.
     *   - `sourceColumn`: The column number in the original source code.
     *   - `generatedLine`: The line number in the generated code.
     *   - `generatedColumn`: The column number in the generated code.
     * @returns A VLQ-encoded string representing the mappings, with segments separated by commas and lines by semicolons.
     *
     * @example
     * const mappings = [
     *     { nameIndex: 0, fileIndex: 1, sourceLine: 2, sourceColumn: 3, generatedLine: 1, generatedColumn: 4 },
     *     { nameIndex: 1, fileIndex: 1, sourceLine: 3, sourceColumn: 4, generatedLine: 2, generatedColumn: 5 }
     * ];
     * const encodedMappings = this.encodeMappings(mappings);
     * console.log(encodedMappings); // Outputs the VLQ-encoded string
     *
     * @see MappingInterface for details on the mapping properties.
     */

    private encodeMappings(mappings: Array<MappingInterface>): string {
        let resultMapping = '';
        let segments: Array<string> = [];

        const shift = {
            fileIndex: 0,
            nameIndex: 0,
            sourceLine: 1,
            sourceColumn: 1,
            generatedLine: 1,
            generatedColumn: 1
        };

        shift.generatedLine = mappings[0].generatedLine;
        resultMapping += ';'.repeat(shift.generatedLine - 1);

        for (const map of mappings) {
            if (map.generatedLine !== shift.generatedLine) {
                resultMapping += segments.join(',');
                resultMapping += ';'.repeat(Math.max(1, map.generatedLine - shift.generatedLine));

                segments = [];
                shift.generatedLine = map.generatedLine;
                shift.generatedColumn = 1;
            }

            this.encodeSegment(map, segments, shift);
        }

        return resultMapping + segments.join(',') + ';';
    }

    /**
     * Encodes a single segment of the mappings into VLQ format.
     *
     * This method processes a `MappingInterface` object and updates the list of encoded segments. It calculates the differences
     * between the current and previous mapping states, then encodes these differences using VLQ (Variable-Length Quantity) encoding.
     * The encoded segment is added to the provided `segments` array.
     *
     * The encoding process involves:
     * 1. Calculating the delta values for the file index, source line, source column, and generated column.
     * 2. Updating the `shift` state to reflect the current mapping information.
     * 3. Encoding the segment using VLQ and adding it to the `segments` array.
     *
     * @param map - The `MappingInterface` object representing a single mapping to encode. This object contains:
     *   - `nameIndex`: The index in the names array.
     *   - `fileIndex`: The index in the sources array.
     *   - `sourceLine`: The line number in the original source code.
     *   - `sourceColumn`: The column number in the original source code.
     *   - `generatedColumn`: The column number in the generated code.
     * @param segments - An array of encoded segments that will be updated with the new encoded segment.
     * @param shift - The current state of the mapping information, including the latest file index, name index, source line,
     *                source column, and generated column. This state is updated as new mappings are processed.
     *
     * @example
     * const map: MappingInterface = { nameIndex: 0, fileIndex: 1, sourceLine: 2, sourceColumn: 3, generatedLine: 1, generatedColumn: 4 };
     * const segments: Array<string> = [];
     * const shift: ShiftSegmentInterface = { fileIndex: 0, nameIndex: 0, sourceLine: 1, sourceColumn: 1, generatedLine: 1, generatedColumn: 1 };
     * this.encodeSegment(map, segments, shift);
     * console.log(segments); // Outputs the encoded VLQ segment
     *
     * @see MappingInterface for details on the mapping properties.
     * @see encodeArrayVLQ for the encoding function used.
     */

    private encodeSegment(map: MappingInterface, segments: Array<string>, shift: ShiftSegmentInterface): void {
        const segment: Array<number> = [];
        const sourceIndex = map.fileIndex;

        segment[1] = 0;
        segment[2] = map.sourceLine - shift.sourceLine;
        segment[3] = map.sourceColumn - shift.sourceColumn;
        segment[0] = map.generatedColumn - shift.generatedColumn;

        if (sourceIndex !== shift.fileIndex) {
            segment[1] = sourceIndex - shift.fileIndex;
            shift.fileIndex = sourceIndex;
        }

        if (map.nameIndex) {
            const nameIndex = map.nameIndex;
            segment[4] = nameIndex - shift.nameIndex;
            shift.nameIndex = nameIndex;
        }

        shift.sourceLine = map.sourceLine;
        shift.sourceColumn = map.sourceColumn;
        shift.generatedColumn = map.generatedColumn;
        segments.push(encodeArrayVLQ(segment));
    }

    /**
     * Performs a binary search on the internal `mappings` array to locate a mapping based on the line and column information.
     * This method efficiently searches for a mapping that corresponds to a specific line and column in the generated code,
     * using binary search for improved performance.
     *
     * The method handles line and column matches and supports optional biasing to refine the search when an exact match is not found:
     * - **Bias.LOWER_BOUND**: If the line number matches but the column is less, returns the closest mapping with a lower column.
     * - **Bias.UPPER_BOUND**: If the line number matches but the column is greater, returns the closest mapping with a higher column.
     * - **Bias.BOUND**: If the line number matches but the column doesn't, returns null. This is the default behavior.
     *
     * @param targetLine - The line number in the generated code to search for. This is the primary criterion for the search.
     * @param targetColumn - The column number in the generated code to search for. This is used in conjunction with the line number.
     * @param bias - An optional bias value to handle cases where only the line number matches. It influences how the column mismatch is resolved.
     *               - `Bias.LOWER_BOUND`: Return the closest mapping with a lower column if the exact column is not found.
     *               - `Bias.UPPER_BOUND`: Return the closest mapping with a higher column if the exact column is not found.
     *               - `Bias.BOUND`: Return null if no exact column match is found. (Default behavior)
     * @returns A `MappingInterface` object representing the found mapping if an exact or biased match is found, or null if no appropriate mapping is located.
     *
     * @example
     * const targetLine = 10;
     * const targetColumn = 5;
     * const bias = Bias.UPPER_BOUND;
     * const result = this.findMapping(targetLine, targetColumn, bias);
     * console.log(result); // Outputs the found mapping or null if not found
     */

    private findMapping(targetLine: number, targetColumn: number, bias: Bias = Bias.BOUND): MappingInterface | null {
        let startIndex = 0;
        let endIndex = this.mappings.length - 1;
        let closestMapping: MappingInterface | null = null;

        while (startIndex <= endIndex) {
            const middleIndex = Math.floor((startIndex + endIndex) / 2);
            const currentMapping = this.mappings[middleIndex];

            if (currentMapping.generatedLine < targetLine) {
                startIndex = middleIndex + 1;
            } else if (currentMapping.generatedLine > targetLine) {
                endIndex = middleIndex - 1;
            } else {
                // The line matches, now we handle the column bias
                if (currentMapping.generatedColumn < targetColumn) {
                    startIndex = middleIndex + 1;
                    if (bias === Bias.LOWER_BOUND) {
                        closestMapping = currentMapping;
                    }
                } else if (currentMapping.generatedColumn > targetColumn) {
                    endIndex = middleIndex - 1;
                    if (bias === Bias.UPPER_BOUND) {
                        closestMapping = currentMapping;
                    }
                } else {
                    return currentMapping;
                }
            }
        }

        // If the line doesn't match any mapping, return null
        return closestMapping && closestMapping.generatedLine === targetLine ? closestMapping : null;
    }
}
