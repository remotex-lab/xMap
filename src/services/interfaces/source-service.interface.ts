/**
 * Represents a source map structure used for mapping code within a file to its original source
 * @since 1.0.0
 */

export interface SourceMapInterface {
    /**
     * The generated file's name that the source map is associated with
     * @since 1.0.0
     */

    file?: string | null;

    /**
     * An array of variable/function names present in the original source
     * @since 1.0.0
     */

    names: Array<string>;

    /**
     * The version of the source map specification (standard is 3)
     * @since 1.0.0
     */

    version: number;

    /**
     * An array of URLs or paths to the original source files
     * @since 1.0.0
     */

    sources: Array<string>;

    /**
     * VLQ encoded string that maps generated code back to original source code
     * @since 1.0.0
     */

    mappings: string;

    /**
     * Root URL for resolving the sources
     * @since 1.0.0
     */

    sourceRoot?: string | null;

    /**
     * Array containing the content of the original source files
     * @since 1.0.0
     */

    sourcesContent?: Array<string>;
}

/**
 * Represents a position in source code with mapping information
 * @since 1.0.0
 */

export interface PositionInterface {
    /**
     * Name of the identifier at this position
     * @since 1.0.0
     */

    name: string | null;

    /**
     * Line number in the original source
     * @since 1.0.0
     */

    line: number;

    /**
     * Column number in the original source
     * @since 1.0.0
     */

    column: number;

    /**
     * Path or URL to the original source file
     * @since 1.0.0
     */

    source: string;

    /**
     * Root URL for resolving the source
     * @since 1.0.0
     */

    sourceRoot: string | null;

    /**
     * Index of the source in the sources array
     * @since 1.0.0
     */

    sourceIndex: number;

    /**
     * Line number in the generated code
     * @since 1.0.0
     */

    generatedLine: number;

    /**
     * Column number in the generated code
     * @since 1.0.0
     */

    generatedColumn: number;
}

/**
 * Position in source code including the original source content
 *
 * @see PositionInterface
 * @since 1.0.0
 */

export interface PositionWithContentInterface extends PositionInterface {
    /**
     * Content of the original source file
     * @since 1.0.0
     */

    sourcesContent: string;
}

/**
 * Position in source code including code fragment information
 *
 * @see PositionInterface
 * @since 1.0.0
 */

export interface PositionWithCodeInterface extends PositionInterface {
    /**
     * Code fragment from the original source
     * @since 1.0.0
     */

    code: string;

    /**
     * Ending line number of the code fragment
     * @since 1.0.0
     */

    endLine: number;

    /**
     * Starting line number of the code fragment
     * @since 1.0.0
     */

    startLine: number;
}

/**
 * Options for retrieving source code context
 * @since 1.0.0
 */

export interface SourceOptionsInterface {
    /**
     * Number of lines to include after the target line
     * @since 1.0.0
     */

    linesAfter?: number;

    /**
     * Number of lines to include before the target line
     * @since 1.0.0
     */

    linesBefore?: number;
}
