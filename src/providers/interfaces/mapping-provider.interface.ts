/**
 * Represents a source map mapping segment that links positions between original and generated code.
 *
 * @interface SegmentInterface
 *
 * @property line - Original line number in the source file
 * @property column - Original column number in the source file
 * @property nameIndex - Index of the symbol name in the source map's names array (null if no associated name)
 * @property sourceIndex - Index of the source file in the source map's sources array
 * @property generatedLine - Line number in the generated output code
 * @property generatedColumn - Column number in the generated output code
 *
 * @remarks
 * These segments form the core data structure of source maps, providing the necessary
 * information to trace locations between original source code and generated output code.
 * Each segment represents a single mapping point in the transformation process.
 *
 * @example
 * ```ts
 * const segment: SegmentInterface = {
 *   line: 42,
 *   column: 10,
 *   nameIndex: 5,
 *   sourceIndex: 0,
 *   generatedLine: 100,
 *   generatedColumn: 15
 * };
 * ```
 *
 * @since 1.0.0
 */

export interface SegmentInterface {
    line: number;
    column: number;
    nameIndex: number | null;
    sourceIndex: number;
    generatedLine: number;
    generatedColumn: number;
}

/**
 * A specialized segment interface used during source map offset calculations.
 *
 * @property nameIndex - Index of the symbol name in the source map's names array (always numeric)
 *
 * @remarks
 * Unlike the base SegmentInterface where nameIndex can be null,
 * in offset calculations this value must always be a concrete numeric index.
 * This specialized interface ensures type safety during mapping offset operations.
 *
 * @example
 * ```ts
 * const offsetSegment: SegmentOffsetInterface = {
 *   line: 42,
 *   column: 10,
 *   nameIndex: 5, // Must be a number, not null
 *   sourceIndex: 0,
 *   generatedLine: 100,
 *   generatedColumn: 15
 * };
 * ```
 *
 * @see SegmentInterface
 *
 * @since 1.0.0
 */

export interface SegmentOffsetInterface extends SegmentInterface {
    nameIndex: number;
}

/**
 * Determines the matching behavior when searching for segments in a source map.
 *
 * @property BOUND - No directional preference; returns the first matching segment found
 * @property LOWER_BOUND - Prefers segments with column values lower than or equal to the target
 * @property UPPER_BOUND - Prefers segments with column values greater than or equal to the target
 *
 * @remarks
 * The bias affects how segment lookups behave when an exact position match cannot be found.
 * This provides flexibility in determining which nearby mapping should be preferred when
 * working with source map data that might not have exact matches for every position.
 *
 * @example
 * ```ts
 * // When searching for a position not exactly in the map:
 * findSegmentForPosition(line, column, Bias.LOWER_BOUND); // Prefers the position just before
 * findSegmentForPosition(line, column, Bias.UPPER_BOUND); // Prefers the position just after
 * ```
 *
 * @since 1.0.0
 */

export const enum Bias {
    BOUND,
    LOWER_BOUND,
    UPPER_BOUND
}

/**
 * Represents a collection of mapping segments for a single line in generated code.
 *
 * @remarks
 * A frame contains all the segments that map to a particular line of generated code.
 * Each segment within the frame provides mapping information for a specific range
 * of columns within that line.
 *
 * @example
 * ```ts
 * const lineFrame: FrameType = [
 *   { line: 10, column: 0, nameIndex: null, sourceIndex: 0, generatedLine: 5, generatedColumn: 0 },
 *   { line: 10, column: 5, nameIndex: 3, sourceIndex: 0, generatedLine: 5, generatedColumn: 10 }
 * ];
 * ```
 *
 * @see SegmentInterface
 *
 * @since 1.0.0
 */

export type FrameType = Array<SegmentInterface>;

/**
 * Represents the complete mapping structure of a source map.
 *
 * @remarks
 * A source map contains an array where each index corresponds to a line in the generated code.
 * Each entry is either:
 * - A frame (array of segments) containing mappings for that line
 * - Null, indicating the line has no mappings (represented by a semicolon in the source map)
 *
 * The array index corresponds directly to the line number in generated code (0-based).
 *
 * @example
 * ```ts
 * const sourceMap: MapType = [
 *   [{ line: 1, column: 0, nameIndex: null, sourceIndex: 0, generatedLine: 0, generatedColumn: 0 }], // Line 0
 *   null, // Line 1 has no mappings
 *   [{ line: 2, column: 0, nameIndex: 1, sourceIndex: 0, generatedLine: 2, generatedColumn: 0 }]  // Line 2
 * ];
 * ```
 *
 * @see FrameType
 * @see SegmentInterface
 *
 * @since 1.0.0
 */

export type MapType = Array<null | FrameType>;
