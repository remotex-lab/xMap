/**
 * Interface representing a source map object, which is used to map
 * transformed or compiled code back to its original source.
 * This is typically used in debugging to trace errors or logs in the
 * compiled code back to the original source code.
 */

export interface SourceMapInterface {

    /**
     * The version of the source map specification.
     * This field is a required number that indicates which version of the source map format is used.
     *
     * @example
     * 3
     */

    version: number;

    /**
     * The name of the generated file (bundle) that this source map applies to.
     * This field is optional, and it might not always be present in the source map.
     *
     * @example
     * "bundle.js"
     */

    file?: string | null;

    /**
     * A VLQ (Variable-Length Quantity) encoded string representing the mapping information
     * between the transformed code and the original source code. This field is mandatory
     * and stores the actual mapping data in a compact format.
     *
     * @example
     * "AAAA,QAASA,IAAIC;..."
     */

    mappings: string;

    /**
     * A list of variable or function names used in the transformed code,
     * corresponding to their references in the source code.
     *
     * @example
     * ["myFunction", "myVariable", "otherSymbol"]
     */

    names: Array<string>;

    /**
     * An array of source file paths. Each path corresponds to a source file that was part of the original code,
     * allowing for a reverse mapping to the source files.
     *
     * @example
     * ["src/file1.ts", "src/file2.ts"]
     */

    sources: Array<string>;

    /**
     * An array of the contents of the source files, corresponding to the paths in the `sources` array.
     * If available, this field allows viewing the original source code within the source map file.
     *
     * @example
     * ["function myFunction() {...}", "const myVariable = 10;"]
     */

    sourcesContent: Array<string>;

    /**
     * An optional prefix that is added to the source file paths in the `sources` array.
     * This is useful when the paths in the `sources` field are relative and need to be resolved
     * against a common root directory. It helps organize and locate the original source files.
     *
     * @example
     * "/source/root"
     */

    sourceRoot?: string | null;
}

/**
 * Interface representing a mapping between generated and original source code.
 * This is used to connect positions in the compiled/generated code to their
 * corresponding positions in the original source code, allowing for debugging
 * and error tracking.
 */

export interface MappingInterface {

    /**
     * The index in the `names` array that refers to a symbol (such as a function or variable name)
     * in the original source. If there is no corresponding name, this will be `null`.
     *
     * @example
     * 3
     */

    nameIndex: number | null;

    /**
     * The index in the `sources` array that refers to the file in which the original code is located.
     *
     * @example
     * 1
     */

    fileIndex: number;

    /**
     * The line number in the original source code (1-based index).
     *
     * @example
     * 25
     */

    sourceLine: number;

    /**
     * The column number in the original source code (0-based index).
     *
     * @example
     * 12
     */

    sourceColumn: number;

    /**
     * The line number in the generated (compiled/transpiled) code (1-based index).
     *
     * @example
     * 32
     */

    generatedLine: number;

    /**
     * The column number in the generated (compiled/transpiled) code (0-based index).
     *
     * @example
     * 8
     */
    generatedColumn: number;
}

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

    /**
     * Optional line number in the generated code, used for tracking line offsets.
     */

    generatedLine?: number;
}

/**
 * Interface representing a position in the source code.
 * This is used to pinpoint an exact location in the source code (line, column),
 * along with the name and the file path (source) where the position occurs.
 */

export interface PositionInterface {
    /**
     * The line number in the source code (1-based index).
     */

    line: number;

    /**
     * The column number in the source code (0-based index).
     */

    column: number;

    /**
     * The name associated with this position, if any.
     * If no name is associated, this will be `null`.
     */

    name: string | null;

    /**
     * The path or name of the source file.
     */

    source: string;

    /**
     * The root URL for the sources, if present in the source map.
     */

    sourceRoot: string | null;
}

/**
 * Interface representing a position in the source code with additional context.
 * Extends `PositionInterface` by adding the actual code snippet and range information.
 */

export interface PositionSourceInterface extends PositionInterface {
    /**
     * A snippet of the actual code at this position.
     */

    code: string;

    /**
     * The ending line number (1-based index) of the code range.
     */

    endLine: number;

    /**
     * The starting line number (0-based index) of the code range.
     */

    startLine: number;
}

/**
 * Interface representing options for retrieving source positions.
 * This interface defines options that can modify how source positions
 * are retrieved, including bias settings and surrounding line context.
 */

export interface SourceOptionsInterface {
    /**
     * The bias option for controlling how mappings are searched.
     * This determines how to handle ambiguities in the source map (e.g., when multiple mappings exist).
     */

    bias?: Bias;

    /**
     * The number of lines after the target position to include for additional context.
     */

    linesAfter?: number;

    /**
     * The number of lines before the target position to include for additional context.
     */

    linesBefore?: number;
}

/**
 * Enumeration representing bias options for searching in mappings.
 * This can control whether the search favors the closest lower-bound or upper-bound
 * mapping when looking for a corresponding position in the source map.
 */

export const enum Bias {
    /**
     * No specific bias is applied when searching for a mapping.
     */

    BOUND,

    /**
     * Search for the closest lower-bound mapping.
     */

    LOWER_BOUND,

    /**
     * Search for the closest upper-bound mapping.
     */

    UPPER_BOUND
}

