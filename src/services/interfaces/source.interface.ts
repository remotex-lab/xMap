/**
 * Interface representing a source map object.
 */

export interface SourceMapInterface {

    /**
     * The version of the source map specification.
     */

    version: number;

    /**
     * The bundle filename
     */

    file?: string | null;

    /**
     * A string of base64 VLQ-encoded mappings.
     */

    mappings: string;

    /**
     * A list of symbol names used by the “mappings” entry.
     */

    names: Array<string>;

    /**
     * An array of source file paths.
     */

    sources: Array<string>;

    /**
     * An array of contents of the source files.
     */

    sourcesContent: Array<string>;

    sourceRoot?: string | null;
}

/**
 * Interface representing a mapping between generated and original source code.
 */

export interface MappingInterface {

    /**
     * The index in names array
     */

    nameIndex: number | null;

    /**
     * The file index in sources array
     */

    fileIndex: number;

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
 * Internal interface used to track the current state during decoding and encoding mappings.
 * This interface is not intended for external use.
 */

export interface ShiftSegmentInterface {
    fileIndex: number;
    nameIndex: number;
    sourceLine: number;
    sourceColumn: number;
    generatedLine: number;
    generatedColumn: number;
}

/**
 * Internal interface used to track offsets during source map concatenation.
 * This interface is not intended for external use.
 */

export interface ThresholdSegmentInterface {
    fileIndex?: number;
    nameIndex?: number;
    generatedLine?: number;
}

/**
 * Interface representing a position in the source code.
 */

export interface PositionInterface {
    line: number,
    column: number,
    name: string | null,
    source: string,
}

/**
 * Interface representing a position in the source code with additional context.
 */

export interface PositionSourceInterface extends PositionInterface {
    code: string,
    endLine: number
    startLine: number, // base-0
}

/**
 * Interface representing options for retrieving source positions.
 */

export interface SourceOptionsInterface {
    bias?: Bias
    linesAfter?: number,
    linesBefore?: number
}

/**
 * Enumeration representing bias options for searching in mappings.
 */

export const enum Bias {
    BOUND,
    LOWER_BOUND,
    UPPER_BOUND
}

