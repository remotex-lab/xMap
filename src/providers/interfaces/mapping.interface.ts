/**
 * Internal interface used to track the current state during decoding and encoding mappings.
 * This interface keeps track of the current mapping segment and is primarily used in the
 * process of transforming source maps. Not intended for external use.
 */

export interface ShiftSegmentInterface {
    /**
     * The index of the source file in the `sources` array.
     */

    fileIndex: number;

    /**
     * The index of the name in the `names` array. May be `null` if there is no associated name.
     */

    nameIndex: number;

    /**
     * The line number in the original source code.
     */

    sourceLine: number;

    /**
     * The column number in the original source code.
     */

    sourceColumn: number;

    /**
     * The line number in the generated code.
     */

    generatedLine: number;

    /**
     * The column number in the generated code.
     */

    generatedColumn: number;
}

/**
 * Internal interface used to track offsets during source map concatenation.
 * This interface helps handle transitions between different source maps
 * and offsets. Not intended for external use.
 */

export interface ThresholdSegmentInterface {
    /**
     * Optional index of the source file in the `sources` array, used for tracking offsets.
     */

    fileIndex?: number;

    /**
     * Optional index of the name in the `names` array, used for tracking name offsets.
     */

    nameIndex?: number;
}
