/**
 * Import will remove at compile time
 */

import type { MappingInterface } from '@services/interfaces/source.interface';
import type { ShiftSegmentInterface, ThresholdSegmentInterface } from './interfaces/mapping.interface';

/**
 * Imports
 */

import { decodeVLQ, encodeArrayVLQ } from '@components/base64.component';

/**
 * Class `MappingProvider` is responsible for managing and decoding VLQ-encoded source map mappings.
 * It supports both VLQ string and pre-decoded array of `MappingInterface` objects.
 */

export class MappingProvider {
    /**
     * Holds the line number of the last decoded generated line.
     */

    private lastGeneratedLine: number;

    /**
     * An array of decoded mappings that represent segments of source map information.
     */

    private readonly mappings: Array<MappingInterface>;

    /**
     * Constructs a new `MappingProvider` instance.
     *
     * If the input is a string, it will be validated and decoded as base64 VLQ mappings.
     * If the input is an array of `MappingInterface`, it will be assigned directly.
     *
     * @param mapping - A base64 VLQ string or an array of `MappingInterface`.
     * @throws Will throw an error if the input string is not a valid mapping format.
     */

    constructor(mapping: string);
    constructor(mapping: Array<MappingInterface>, lastGeneratedLine?: number);
    constructor(mapping: string | Array<MappingInterface>, lastGeneratedLine: number = 0) {
        this.lastGeneratedLine = lastGeneratedLine;

        if (Array.isArray(mapping)) {
            this.mappings = mapping;
        } else if (this.isValidMappingString(mapping)) {
            this.mappings = this.decodeMappings(mapping);
        } else {
            throw new Error('Invalid Mappings string format.');
        }
    }

    /**
     * Concatenates new mappings (either base64 VLQ strings or arrays of `MappingInterface`)
     * to the current set of mappings.
     *
     * @param mappings - One or more strings or arrays of `MappingInterface` objects to be concatenated.
     * @param thresholdSegment - Optional object to track offset transitions during concatenation
     *                           (e.g., `fileIndex`, `nameIndex`).
     * @returns A new `MappingProvider` instance containing the combined mappings.
     */

    concat(mappings: Array<string | MappingProvider>, thresholdSegment?: ThresholdSegmentInterface): MappingProvider {
        const newMapping = new MappingProvider([ ...this.mappings ], this.lastGeneratedLine);
        mappings.forEach(mapping => {
            if (typeof mapping === 'string') {
                // If the mapping is a string, decode it and add the result
                newMapping.mappings.push(...newMapping.decodeMappings(mapping, thresholdSegment));
            } else {
                // If it's already an array of `MappingInterface`, add it directly
                newMapping.mappings.push(...mapping.mappings);
                newMapping.lastGeneratedLine += mapping.lastGeneratedLine;
            }
        });

        return newMapping;
    }

    toString(): string {
        return this.encodeMappings(this.mappings);
    }

    /**
     * Initializes the shift object with default values and optional threshold segments.
     *
     * @param thresholdSegment - Optional object to track offset transitions during concatenation.
     * @returns An initialized shift object.
     */

    private initializeShift(thresholdSegment?: ThresholdSegmentInterface) {
        return {
            fileIndex: 0,
            nameIndex: 0,
            sourceLine: 0,
            sourceColumn: 0,
            generatedLine: 0,
            generatedColumn: 0,
            ...thresholdSegment
        };
    }

    /**
     * Decodes a base64 VLQ-encoded string into an array of `MappingInterface` objects.
     *
     * @param mapping - A base64 VLQ-encoded string representing source map mappings.
     * @param thresholdSegment - An optional object for tracking offset transitions during the concatenation of source maps,
     * including `fileIndex` and `nameIndex`.
     * @returns An array of decoded `MappingInterface` objects.
     * @throws Will throw an error if the decoding process fails.
     */

    private decodeMappings(mapping: string, thresholdSegment?: ThresholdSegmentInterface): Array<MappingInterface> {
        const mappings = [];
        const groups = mapping.split(';');
        const shift = this.initializeShift(thresholdSegment);

        try {
            let lastGeneratedLine = this.lastGeneratedLine;
            for (let index = 0; index < groups.length; index++) {
                const group = groups[index];
                this.lastGeneratedLine = lastGeneratedLine + index;

                if (!group) continue;
                shift.generatedColumn = 0;
                const segments = group.split(',');

                for (const segment of segments) {
                    const decodedSegment = decodeVLQ(segment);
                    mappings.push(this.decodedSegment(shift, decodedSegment));
                }
            }

            return mappings;
        } catch (error) {
            throw new Error(`Error decoding mappings: ${ (<Error> error).message }`);
        }
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
        const shift = this.initializeShift();

        shift.generatedLine = mappings[0].generatedLine;
        resultMapping += ';'.repeat(shift.generatedLine);

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

        return resultMapping + segments.join(',') + ';'.repeat(this.lastGeneratedLine - shift.generatedLine);
    }

    /**
     * Decodes a single segment from a VLQ-encoded mapping into a `MappingInterface` object.
     *
     * @param shift - The running total of shifts for the mapping segments.
     * @param decodedSegment - The decoded VLQ segment as an array of numbers.
     * @returns A `MappingInterface` object representing the decoded segment.
     */

    private decodedSegment(shift: ShiftSegmentInterface, decodedSegment: Array<number>): MappingInterface {
        const [ generatedColumn, fileIndex, sourceLine, sourceColumn, nameIndex ] = decodedSegment;
        shift.fileIndex += fileIndex;
        shift.nameIndex += nameIndex ?? 0;
        shift.sourceLine += sourceLine;
        shift.sourceColumn += sourceColumn;
        shift.generatedColumn += generatedColumn;

        return {
            nameIndex: (nameIndex !== undefined) ? shift.nameIndex : null,
            fileIndex: shift.fileIndex,
            sourceLine: shift.sourceLine,
            sourceColumn: shift.sourceColumn,
            generatedLine: this.lastGeneratedLine,
            generatedColumn: shift.generatedColumn
        };
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
     * Validates whether the given string is a valid VLQ-encoded string
     * containing groups of 4 or 5 hexadecimal characters, followed by a comma or semicolon,
     * and allowing multiple semicolons.
     *
     * The string can be in the format: AAAA,CAAC,CAAC,CAAC,CAAC;;;AAAA,CAAC,CAAC,CAAC,CAAC;
     *
     * @param input - The string to validate.
     * @returns True if the string is valid, false otherwise.
     */

    private isValidMappingString(input: string): boolean {
        // Regular expression to match groups of 4 or 5 hexadecimal characters followed by a comma or semicolon,
        // allowing for multiple semicolons in between valid segments.
        const vlqPattern = /^(;*([A-Za-z0-9+/]{1,7}(([,]|[;]+)[A-Za-z0-9+/]{1,7})*));*$/;

        // Test the input string against the regular expression
        return vlqPattern.test(input);
    }
}
