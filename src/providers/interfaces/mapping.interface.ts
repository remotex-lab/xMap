/**
 * Represents a mapping segment that corresponds to a position in the source map.
 *
 * @property line - The original line number in the source file.
 * @property column - The original column number in the source file.
 * @property nameIndex - The index of the symbol name in the source map, or `null` if there is no associated name.
 * @property sourceIndex - The index of the source file in the source map.
 * @property generatedLine - The line number in the generated code.
 * @property generatedColumn - The column number in the generated code.
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
 * Extends the `SegmentInterface` to represent an offset segment used during mapping calculations.
 * The main difference is that `nameIndex` is always a number.
 *
 * @augments { SegmentInterface }
 * @property nameIndex - The index of the symbol name in the source map (cannot be null in this context).
 */

export interface SegmentOffsetInterface extends SegmentInterface {
    nameIndex: number;
}

/**
 * Represents the bias used when searching for segments in the source map.
 * This enum is useful for determining the preferred matching behavior
 * when the exact line and column cannot be found.
 *
 * @property BOUND - No preference for column matching; returns the first match found.
 * @property LOWER_BOUND - Prefer the closest mapping with a lower column value.
 * @property UPPER_BOUND - Prefer the closest mapping with a higher column value.
 */

export const enum Bias {
    BOUND,
    LOWER_BOUND,
    UPPER_BOUND
}

/**
 * A type alias for a frame in the source map, representing an array of segments.
 * Each frame consists of multiple mapping segments for a given line in the generated code.
 */

export type FrameType = Array<SegmentInterface>;

/**
 * A type alias for the source map, where each entry represents a frame of mappings.
 * A frame can either be an array of segments (frame) or `null` if the line has no mappings (represented by a semicolon in the mapping string).
 */

export type MapType = Array<null | FrameType>;
