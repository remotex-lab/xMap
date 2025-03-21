/**
 * Import will remove at compile time
 */

import type { MapType, FrameType, SegmentInterface, SegmentOffsetInterface } from './interfaces/mapping-provider.interface';

/**
 * Imports
 */

import { Bias } from './interfaces/mapping-provider.interface';
import { decodeVLQ, encodeArrayVLQ } from '@components/base64.component';

/**
 * Provides functionality for encoding and decoding source map mappings.
 *
 * The MappingProvider class handles the conversion between various mapping representations:
 * - String format (VLQ-encoded mappings)
 * - Structured array format (MapType)
 * - Internal structured representation
 *
 * It also provides methods to query and retrieve source map segments based on
 * generated or original source positions.
 *
 * @example
 * ```ts
 * // Create from VLQ-encoded mapping string
 * const provider = new MappingProvider(mappingString);
 *
 * // Get a segment by generated position
 * const segment = provider.getSegment(10, 15);
 *
 * // Convert back to mapping string
 * const encoded = provider.encode();
 * ```
 *
 * @since 1.0.0
 */

export class MappingProvider {

    private mapping: MapType = [];

    /**
     * Creates a new MappingProvider instance.
     *
     * @param mapping - Source map mapping data in one of three formats:
     *                 - VLQ-encoded string
     *                 - Structured array (MapType)
     *                 - Another MappingProvider instance (copy constructor)
     * @param namesOffset - Optional offset to apply to name indices (default: 0)
     * @param sourceOffset - Optional offset to apply to source indices (default: 0)
     *
     * @remarks
     * The constructor automatically detects the mapping format and decodes it accordingly.
     * When providing offsets, these values will be added to the corresponding indices
     * in the decoded mapping data, which is useful when concatenating multiple source maps.
     *
     * @since 1.0.0
     */

    constructor(mapping: string, namesOffset?: number, sourceOffset?: number);
    constructor(mapping: MapType, namesOffset?: number, sourceOffset?: number);
    constructor(mapping: MappingProvider, namesOffset?: number, sourceOffset?: number);
    constructor(mapping: MappingProvider| MapType | string, namesOffset = 0, sourcesOffset = 0) {
        mapping = mapping instanceof MappingProvider ? mapping.mapping : mapping;
        if (Array.isArray(mapping)) {
            this.decodeMappingArray(mapping, namesOffset, sourcesOffset);
        } else {
            this.decodeMappingString(mapping, namesOffset, sourcesOffset);
        }
    }

    /**
     * Encodes the internal mapping representation to a VLQ-encoded mapping string.
     *
     * @returns VLQ-encoded mapping string compatible with the source map format specification
     *
     * @remarks
     * This method converts the internal structured mapping representation into a compact
     * string format using Variable Length Quantity (VLQ) encoding.
     * The resulting string follows the source map v3 format for the 'mappings' field.
     *
     * @see https://sourcemaps.info/spec.html
     *
     * @since 1.0.0
     */

    encode(): string {
        return this.encodeMappings(this.mapping);
    }

    /**
     * Decodes mapping data into the internal representation.
     *
     * @param mapping - Mapping data to decode in one of three formats:
     *                 - VLQ-encoded string
     *                 - Structured array (MapType)
     *                 - Another MappingProvider instance
     * @param namesOffset - Optional offset for name indices (default: 0)
     * @param sourcesOffset - Optional offset for source indices (default: 0)
     *
     * @remarks
     * This method replaces the current internal mapping data with the newly decoded mapping.
     * The format of the input mapping is automatically detected and processed accordingly.
     *
     * @see MapType
     * @see MappingProvider
     *
     * @since 1.0.0
     */

    decode(mapping: MappingProvider| MapType | string, namesOffset = 0, sourcesOffset = 0): void {
        mapping = mapping instanceof MappingProvider ? mapping.mapping : mapping;
        if (Array.isArray(mapping)) {
            this.decodeMappingArray(mapping, namesOffset, sourcesOffset);
        } else {
            this.decodeMappingString(mapping, namesOffset, sourcesOffset);
        }
    }

    /**
     * Retrieves a segment based on a position in the generated code.
     *
     * @param generatedLine - Line number in generated code (1-based)
     * @param generatedColumn - Column number in generated code (0-based)
     * @param bias - Controls matching behavior when exact position not found:
     *              - BOUND: No preference (default)
     *              - LOWER_BOUND: Prefer segment with lower column
     *              - UPPER_BOUND: Prefer segment with higher column
     * @returns Matching segment or null if not found
     *
     * @remarks
     * Uses binary search to efficiently locate matching segments.
     * When no exact match is found, the bias parameter determines which nearby segment to return.
     *
     * @since 1.0.0
     */

    getSegment(generatedLine: number, generatedColumn: number, bias: Bias = Bias.BOUND): SegmentInterface | null {
        const segments = this.mapping[generatedLine - 1];
        if (!segments || segments.length === 0)
            return null;

        let low = 0;
        let high = segments.length - 1;
        let closestSegment: SegmentInterface | null = null;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const segment = segments[mid];

            if (segment.generatedColumn < generatedColumn) {
                low = mid + 1;
                closestSegment = bias === Bias.LOWER_BOUND ? segment : closestSegment;
            } else if (segment.generatedColumn > generatedColumn) {
                high = mid - 1;
                closestSegment = bias === Bias.UPPER_BOUND ? segment : closestSegment;
            } else {
                return segment;
            }
        }

        return closestSegment;
    }

    /**
     * Retrieves a segment based on a position in the original source code.
     *
     * @param line - Line number in original source (1-based)
     * @param column - Column number in original source (0-based)
     * @param sourceIndex - Index of source file in the sources array
     * @param bias - Controls matching behavior when exact position not found:
     *              - BOUND: No preference (default)
     *              - LOWER_BOUND: Prefer segment with lower column
     *              - UPPER_BOUND: Prefer segment with higher column
     * @returns Matching segment or null if not found
     *
     * @remarks
     * Searches across all mapping segments to find those matching the specified original source position.
     * When multiple matches are possible, the bias
     * parameter determines which segment to return.
     *
     * This operation is more expensive than getSegment as it must potentially
     * scan the entire mapping structure.
     *
     * @since 1.0.0
     */

    getOriginalSegment(line: number, column: number, sourceIndex: number, bias: Bias = Bias.BOUND): SegmentInterface | null {
        let closestSegment: SegmentInterface | null = null;
        for (const segments of this.mapping) {
            if (!segments)
                continue;

            let low = 0;
            let high = segments.length - 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const midSegment = segments[mid];

                if (midSegment.sourceIndex < sourceIndex || midSegment.line < line) {
                    low = mid + 1;
                } else if (midSegment.sourceIndex > sourceIndex || midSegment.line > line) {
                    high = mid - 1;
                } else if (midSegment.column < column) {
                    low = mid + 1;
                    closestSegment = bias === Bias.LOWER_BOUND ? midSegment : closestSegment;
                } else if (midSegment.column > column) {
                    high = mid - 1;
                    closestSegment = bias === Bias.UPPER_BOUND ? midSegment : closestSegment;
                } else {
                    return midSegment;
                }
            }
        }

        return closestSegment;
    }

    /**
     * Initializes a new segment offset object with default values.
     *
     * @param namesOffset - Initial name index offset value (default: 0)
     * @param sourceIndex - Initial source index offset value (default: 0)
     * @returns A new segment offset object with initialized position tracking values
     *
     * @remarks
     * This method creates an object that tracks position data during mapping operations.
     * All position values (line, column, generatedLine, generatedColumn) are initialized to 0,
     * while the nameIndex and sourceIndex can be initialized with custom offsets.
     *
     * @since 1.0.0
     */

    private initPositionOffsets(namesOffset: number = 0, sourceIndex: number = 0): SegmentOffsetInterface {
        return {
            line: 0,
            column: 0,
            nameIndex: namesOffset,
            sourceIndex: sourceIndex,
            generatedLine: 0,
            generatedColumn: 0
        };
    }

    /**
     * Validates the format of an encoded mapping string.
     *
     * @param encodedSourceMap - The encoded source map string to validate
     * @returns `true` if the string contains only valid VLQ mapping characters, otherwise `false`
     *
     * @remarks
     * Checks if the string contains only characters valid in source map mappings:
     * - Base64 characters (a-z, A-Z, 0-9, +, /)
     * - Separators (commas for segments, semicolons for lines)
     *
     * This is a basic format validation and doesn't verify the semantic correctness
     * of the VLQ encoding itself.
     *
     * @since 1.0.0
     */

    private validateMappingString(encodedSourceMap: string): boolean {
        // /^(;+)?([a-z0-9+/]{1,10}(,|;+)?)+$/
        return /^[a-zA-Z0-9+/,;]+$/.test(encodedSourceMap);
    }

    /**
     * Validates that a segment's properties conform to expected types.
     *
     * @param segment - The segment object to validate
     *
     * @remarks
     * Performs the following validations on the segment properties:
     * - line: Must be a finite number
     * - column: Must be a finite number
     * - nameIndex: Must be either null or a finite number
     * - sourceIndex: Must be a finite number
     * - generatedLine: Must be a finite number
     * - generatedColumn: Must be a finite number
     *
     * This validation ensures that segments can be safely used in mapping operations
     * and prevents potential issues with non-numeric or infinite values.
     *
     * @throws Error - When any property of the segment is invalid, with a message
     *                 indicating which property failed validation and its value
     *
     * @since 1.0.0
     */

    private validateSegment(segment: SegmentInterface): void {
        if (!Number.isFinite(segment.line)) {
            throw new Error(`Invalid segment: line must be a finite number, received ${segment.line}`);
        }
        if (!Number.isFinite(segment.column)) {
            throw new Error(`Invalid segment: column must be a finite number, received ${segment.column}`);
        }
        if (segment.nameIndex !== null && !Number.isFinite(segment.nameIndex)) {
            throw new Error(`Invalid segment: nameIndex must be a number or null, received ${segment.nameIndex}`);
        }
        if (!Number.isFinite(segment.sourceIndex)) {
            throw new Error(`Invalid segment: sourceIndex must be a finite number, received ${segment.sourceIndex}`);
        }
        if (!Number.isFinite(segment.generatedLine)) {
            throw new Error(`Invalid segment: generatedLine must be a finite number, received ${segment.generatedLine}`);
        }
        if (!Number.isFinite(segment.generatedColumn)) {
            throw new Error(`Invalid segment: generatedColumn must be a finite number, received ${segment.generatedColumn}`);
        }
    }

    /**
     * Encodes a segment into a VLQ-encoded string based on relative offsets.
     *
     * @param segmentOffset - The current segment offset tracking state
     * @param segmentObject - The segment to encode
     * @returns A VLQ-encoded string representation of the segment
     *
     * @remarks
     * The encoding process:
     * 1. Adjusts line and column values (subtracts 1 to convert from 1-based to 0-based)
     * 2. Calculates relative differences between current values and previous offsets
     * 3. Creates an array with the following components:
     *    - generatedColumn difference
     *    - sourceIndex difference (0 if unchanged)
     *    - line difference
     *    - column difference
     *    - nameIndex difference (only if nameIndex is present)
     * 4. Updates the segment offset state for the next encoding
     * 5. Returns the array as a VLQ-encoded string
     *
     * This method implements the source map V3 specification's delta encoding scheme
     * where values are stored as differences from previous positions.
     *
     * @since 1.0.0
     */

    private encodeSegment(segmentOffset: SegmentOffsetInterface, segmentObject: SegmentInterface): string {
        const { line, column, generatedColumn, nameIndex, sourceIndex } = segmentObject;
        const adjustedLine = line - 1;
        const adjustedColumn = column - 1;
        const adjustedGeneratedColumn = generatedColumn - 1;

        const segment: Array<number> = [
            adjustedGeneratedColumn - segmentOffset.generatedColumn, // generatedColumn difference
            sourceIndex !== segmentOffset.sourceIndex ? sourceIndex - segmentOffset.sourceIndex : 0, // sourceIndex difference
            adjustedLine - segmentOffset.line, // line difference
            adjustedColumn - segmentOffset.column // column difference
        ];

        if (nameIndex !== null && nameIndex !== undefined) {
            segment[4] = nameIndex - segmentOffset.nameIndex; // nameIndex difference
            segmentOffset.nameIndex = nameIndex;
        }

        segmentOffset.line = adjustedLine;
        segmentOffset.column = adjustedColumn;
        segmentOffset.generatedColumn = adjustedGeneratedColumn;
        segmentOffset.sourceIndex = sourceIndex;

        return encodeArrayVLQ(segment);
    }

    /**
     * Encodes a mapping array into a VLQ-encoded mapping string following the source map V3 spec.
     *
     * @param map - The mapping array to encode, organized by generated lines and segments
     * @returns A complete VLQ-encoded mapping string with line and segment separators
     *
     * @remarks
     * The encoding process:
     * 1. Initializes position offsets to track state across the entire mapping
     * 2. Processes each frame (line) in the mapping array:
     *    - Resets generated column offset to 0 at the start of each line
     *    - Encodes each segment within the line using relative VLQ encoding
     *    - Joins segments with commas (,)
     * 3. Joins lines with semicolons (;)
     *
     * Empty frames are preserved as empty strings in the output to maintain
     * the correct line numbering in the resulting source map.
     *
     * @since 1.0.0
     */

    private encodeMappings(map: MapType): string {
        const positionOffset = this.initPositionOffsets();

        return map.map(frame => {
            if (!frame)
                return '';

            positionOffset.generatedColumn = 0;
            const segments = frame.map(segment => this.encodeSegment(positionOffset, segment));

            return segments.join(',');
        }).join(';');
    }

    /**
     * Converts a VLQ-decoded segment array into a structured segment object.
     *
     * @param segmentOffset - The current positional state tracking offsets
     * @param decodedSegment - Array of VLQ-decoded values representing relative offsets
     * @returns A complete segment object with absolute positions
     *
     * @remarks
     * The decoding process:
     * 1. Extracts position values from the decoded array:
     *    - [0]: generatedColumn delta
     *    - [1]: sourceIndex delta
     *    - [2]: sourceLine delta
     *    - [3]: sourceColumn delta
     *    - [4]: nameIndex delta (optional)
     * 2. Updates the segmentOffset state by adding each delta
     * 3. Constructs a segment object with absolute positions (adding 1 to convert
     *    from 0-based to 1-based coordinates)
     * 4. Handles nameIndex appropriately (null if not present in the input)
     *
     * This method implements the inverse operation of the delta encoding scheme
     * defined in the source map V3 specification.
     *
     * @since 1.0.0
     */

    private decodedSegment(segmentOffset: SegmentOffsetInterface, decodedSegment: Array<number>): SegmentInterface {
        const [ generatedColumn, sourceIndex, sourceLine, sourceColumn, nameIndex ] = decodedSegment;
        segmentOffset.line += sourceLine;
        segmentOffset.column += sourceColumn;
        segmentOffset.nameIndex += nameIndex ?? 0;
        segmentOffset.sourceIndex += sourceIndex;
        segmentOffset.generatedColumn += generatedColumn;

        return {
            line: segmentOffset.line + 1,
            column: segmentOffset.column + 1,
            nameIndex: nameIndex !== undefined ? segmentOffset.nameIndex : null,
            sourceIndex: segmentOffset.sourceIndex,
            generatedLine: segmentOffset.generatedLine + 1,
            generatedColumn: segmentOffset.generatedColumn + 1
        };
    }

    /**
     * Decodes a VLQ-encoded mapping string into the internal mapping data structure.
     *
     * @param encodedMap - The VLQ-encoded mapping string from a source map
     * @param namesOffset - Base offset for name indices in the global names array
     * @param sourceOffset - Base offset for source indices in the global sources array
     *
     * @remarks
     * The decoding process:
     * 1. Validates the mapping string format before processing
     * 2. Splits the string into frames using semicolons (;) as line separators
     * 3. Initializes position offsets with the provided name and source offsets
     * 4. For each frame (line):
     *    - Adds `null` to the mapping array if the frame is empty
     *    - Resets the generated column offset to 0 for each new line
     *    - Sets the generated line index using the offset + current index
     *    - Splits segments using commas (,) and decodes each segment
     *    - Transforms each decoded segment into a segment object
     * 5. Updates the internal mapping array with the decoded data
     *
     * Error handling includes validation checks and descriptive error messages
     * indicating which frame caused a decoding failure.
     *
     * @throws Error - When the mapping string format is invalid or decoding fails
     *
     * @since 1.0.0
     */

    private decodeMappingString(encodedMap: string, namesOffset: number, sourceOffset: number): void {
        if (!this.validateMappingString(encodedMap))
            throw new Error('Invalid Mappings string format: the provided string does not conform to expected VLQ format.');

        const frames = encodedMap.split(';');
        const linesOffset = this.mapping.length;
        const positionOffset = this.initPositionOffsets(namesOffset, sourceOffset);
        try {
            frames.forEach((frame, index) => {
                if (!frame) {
                    this.mapping.push(null);

                    return;
                }

                positionOffset.generatedColumn = 0;
                positionOffset.generatedLine = linesOffset + index;
                const segmentsArray: Array<SegmentInterface> = frame.split(',')
                    .map(segment => this.decodedSegment(positionOffset, decodeVLQ(segment)));

                this.mapping.push(segmentsArray);
            });
        } catch (error) {
            throw new Error(`Error decoding mappings at frame index ${frames.length}: ${(<Error>error).message}`);
        }
    }

    /**
     * Decodes a structured mapping array into the internal mapping representation.
     *
     * @param encodedMap - The structured mapping array (array of frames, with each frame being an array of segments)
     * @param namesOffset - Offset to add to each segment's nameIndex (for merging multiple source maps)
     * @param sourceOffset - Offset to add to each segment's sourceIndex (for merging multiple source maps)
     *
     * @remarks
     * The decoding process:
     * 1. Validates that the input is a properly structured array
     * 2. Tracks the current line offset based on the existing mapping length
     * 3. For each frame (line) in the mapping:
     *    - Preserves null frames as-is (representing empty lines)
     *    - Validates that each frame is an array
     *    - For each segment in a frame:
     *      - Validates the segment structure
     *      - Applies the name and source offsets
     *      - Adjusts the generated line index by the line offset
     *    - Adds the processed frame to the internal mapping array
     *
     * This method is primarily used when combining multiple source maps or
     * importing mapping data from pre-structured arrays rather than VLQ strings.
     * The offsets enable proper indexing when concatenating multiple mappings.
     *
     * @throws Error - When the input format is invalid or segments don't conform to requirements
     *
     * @since 1.0.0
     */

    private decodeMappingArray(encodedMap: MapType, namesOffset: number, sourceOffset: number): void {
        const linesOffset = this.mapping.length;
        if (!Array.isArray(encodedMap))
            throw new Error('Invalid encoded map: expected an array of frames.');

        try {
            encodedMap.forEach((frame, index) => {
                if (!frame) {
                    this.mapping.push(frame);

                    return;
                }

                if (!Array.isArray(frame))
                    throw new Error(`Invalid Mappings array format at frame index ${index}: expected an array, received ${typeof frame}.`);

                const segments: FrameType = frame.map(segment => {
                    this.validateSegment(segment);

                    return {
                        ...segment,
                        nameIndex: (typeof segment.nameIndex === 'number') ? segment.nameIndex + namesOffset : null,
                        sourceIndex: segment.sourceIndex + sourceOffset,
                        generatedLine: segment.generatedLine + linesOffset
                    };
                });

                this.mapping.push(segments);
            });
        } catch (error: unknown) {
            const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
            throw new Error(`Error decoding mappings: ${errorMessage}`);
        }
    }
}
