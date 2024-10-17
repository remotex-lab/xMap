/**
 * Import will remove at compile time
 */

import {
    Bias,
    type MapType,
    type FrameType,
    type SegmentInterface,
    type SegmentOffsetInterface
} from './interfaces/mapping.interface';

/**
 * Imports
 */

import { decodeVLQ, encodeArrayVLQ } from '@components/base64.component';

/**
 * The `MappingProvider` class provides methods to encode and decode mappings
 * from a source map or mapping string to an internal structured representation.
 */

export class MappingProvider {
    /**
     * The internal mapping representation, where each index represents a frame of segments.
     */

    private mapping: MapType = [];

    /**
     * Constructor to initialize the `MappingProvider` with a mapping.
     * Can be initialized with either a mapping string or a structured mapping array.
     *
     * @param mapping - The mapping data, either as a string or structured array.
     * @param namesOffset - Optional offset for the names index.
     * @param sourceOffset - Optional offset for the sources index.
     *
     * @example
     * ```ts
     * const provider = new MappingProvider(";;;AAiBO,SAAS,OAAO;AACnB,UAAQ,IAAI,MAAM;AACtB;;;ACjBA,QAAQ,IAAI,GAAG;AACf,KAAK;", 0, 0);
     * const provider2 = new MappingProvider([
     *   null,
     *   [
     *     {
     *       line: 1,
     *       column: 1,
     *       nameIndex: null,
     *       sourceIndex: 0,
     *       generatedLine: 2,
     *       generatedColumn: 1
     *     }
     *   ],
     *   null
     * ], 0, 0);
     * ```
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
     * Encodes the internal mapping array back into a mapping string.
     *
     * @returns {string} - The encoded mapping string.
     * @example
     * ```ts
     * const encoded = provider.encode();
     * console.log(encoded); // Outputs encoded mapping string
     * ```
     */

    encode(): string {
        return this.encodeMappings(this.mapping);
    }

    /**
     * Decodes a mapping from either a string or structured array into the internal mapping.
     *
     * @param mapping - The mapping data to decode.
     * @param namesOffset - Offset for the names index.
     * @param sourcesOffset - Offset for the sources index.
     * @example
     * ```ts
     * provider.decode(";;;AAiBO,SAAS,OAAO;AACnB,UAAQ,IAAI,MAAM;AACtB;;;ACjBA,QAAQ,IAAI,GAAG;AACf,KAAK;", 0, 0);
     * provider.decode([
     *   null,
     *   [
     *     {
     *       line: 1,
     *       column: 1,
     *       nameIndex: null,
     *       sourceIndex: 0,
     *       generatedLine: 2,
     *       generatedColumn: 1
     *     }
     *   ],
     *   null
     * ], 0, 0);
     * ```
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
     * Retrieves a segment based on the provided generated line and column,
     * applying the specified bias when the exact match is not found.
     *
     * This method performs a binary search on the segments of the specified
     * generated line to efficiently locate the segment corresponding to
     * the provided generated column. If an exact match is not found,
     * the method returns the closest segment based on the specified bias:
     * - `Bias.BOUND`: No preference for column matching (returns the closest segment).
     * - `Bias.LOWER_BOUND`: Prefers the closest mapping with a lower column value.
     * - `Bias.UPPER_BOUND`: Prefers the closest mapping with a higher column value.
     *
     * @param generatedLine - The line number of the generated code (1-based index).
     * @param generatedColumn - The column number of the generated code (0-based index).
     * @param bias - The bias to use when the line matches, can be one of:
     *   - `Bias.BOUND` (default): No preference for column matching.
     *   - `Bias.LOWER_BOUND`: Prefer the closest mapping with a lower column value.
     *   - `Bias.UPPER_BOUND`: Prefer the closest mapping with a higher column value.
     * @returns The matching segment if found;
     * returns null if no segments exist for the specified generated line
     * or if the generated line is out of bounds.
     *
     * @throws { Error } - Throws an error if the generated line is invalid
     * (out of bounds).
     *
     * @example
     * ```ts
     * const segment = sourceMap.getSegment(5, 10, Bias.UPPER_BOUND);
     * if (segment) {
     *     console.log(`Found segment: line ${segment.line}, column ${segment.column}`);
     * } else {
     *     console.log('No matching segment found.');
     * }
     * ```
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
     * Retrieves the original segment based on the provided line, column, and source index.
     *
     * This method searches for the original segment that corresponds to the specified
     * line, column, and source index. It uses binary search to find the closest segment
     * based on the provided bias.
     *
     * @param line - The line number of the original code (1-based index).
     * @param column - The column number of the original code (0-based index).
     * @param sourceIndex - The index of the source file in the source map.
     * @param bias - The bias to apply when multiple segments match; defaults to `Bias.BOUND`.
     * @returns {SegmentInterface | null} - The matching original segment if found;
     * returns null if no segments exist for the specified line and source index.
     *
     * @example
     * ```ts
     * const originalSegment = sourceMap.getOriginalSegment(3, 5, 0, Bias.LOWER_BOUND);
     * if (originalSegment) {
     *     console.log(`Found original segment: line ${originalSegment.line}, column ${originalSegment.column}`);
     * } else {
     *     console.log('No matching original segment found.');
     * }
     * ```
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
     * Initializes the segment offsets used to track the current decoding position.
     *
     * @param namesOffset - The offset for the names index.
     * @param sourceIndex - The offset for the source index.
     * @returns { SegmentOffsetInterface } - The initialized segment offset.
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
     * @param encodedSourceMap - The encoded source map string to validate.
     * @returns Returns `true` if the format is valid, otherwise `false`.
     */

    private validateMappingString(encodedSourceMap: string): boolean {
        // /^(;+)?([a-z0-9+/]{1,10}(,|;+)?)+$/
        return /^[a-zA-Z0-9+/,;]+$/.test(encodedSourceMap);
    }

    /**
     * Validates the properties of a segment to ensure they conform to expected types.
     *
     * This method checks that the segment's properties are finite numbers and that
     * the nameIndex, if provided, is either a finite number or null.
     * An error is thrown if any of the properties do not meet the specified criteria.
     *
     * @param segment - The segment object to validate, which must conform to the
     *                  SegmentInterface structure, including:
     *                  - line: number (finite)
     *                  - column: number (finite)
     *                  - nameIndex: number | null (if not null, must be finite)
     *                  - sourceIndex: number (finite)
     *                  - generatedLine: number (finite)
     *                  - generatedColumn: number (finite)
     *
     * @throws {Error} - Throws an error if any property of the segment is invalid.
     *                   The error message will specify which property is invalid
     *                   and the value that was received.
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
     * Encodes a segment into a VLQ-encoded string based on the segment offsets.
     *
     * @param segmentOffset - The current segment offset.
     * @param segmentObject - The segment to encode.
     * @returns The encoded segment string.
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
     * Encodes the entire mapping array into a VLQ-encoded mapping string.
     *
     * @param map - The mapping array to encode.
     * @returns The encoded mapping string.
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
     * Decodes a VLQ-encoded segment into a segment object based on the current offset.
     *
     * @param segmentOffset - The current segment offset.
     * @param decodedSegment - The decoded VLQ segment values.
     * @returns The decoded segment object.
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
     * Decodes a VLQ-encoded mapping string into the internal mapping representation.
     *
     * @param encodedMap - The VLQ-encoded mapping string.
     * @param namesOffset - Offset for the names index.
     * @param sourceOffset - Offset for the sources index.
     * @throws { Error } - Throws an error if the mapping string is invalid.
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
     * Decodes a mapping array into the internal mapping representation, adjusting for offsets.
     *
     * This method processes each frame in the provided structured mapping array,
     * validating each segment within the frame and adjusting the indices based on the
     * specified offsets for names and sources. If a frame is invalid or not an array,
     * an error will be thrown.
     *
     * @param encodedMap - The structured mapping array, which should be an array of frames,
     *                     where each frame is an array of segments. Each segment must conform
     *                     to the SegmentInterface.
     * @param namesOffset - Offset for the names index, which will be added to each segment's nameIndex.
     * @param sourceOffset - Offset for the sources index, which will be added to each segment's sourceIndex.
     * @throws { Error } - Throws an error if:
     *                   - The mapping array is invalid (not an array).
     *                   - Any frame is not an array.
     *                   - Any segment does not conform to the SegmentInterface.
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
