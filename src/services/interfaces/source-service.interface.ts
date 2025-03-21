/**
 * Represents a source map structure used for mapping code within a file
 * to its original source. Source maps are essential for debugging minified
 * or transpiled code, as they allow developers to trace back to the
 * original source files and understand the context of the code execution.
 *
 * @interface SourceMapInterface
 * @property file - The generated file's name that the source map is associated with.
 * This property is optional and may be null if not specified.
 * @property names - An array of variable/function names that are present in the original source.
 * These names help in mapping the original code context during debugging.
 * @property version - The version of the source map specification.
 * This should be set to `3` for the standard source map version.
 * @property sources - An array of URLs or paths to the original source files.
 * These sources are used to locate the original code that corresponds to the generated code.
 * @property mappings - A VLQ (Variable-Length Quantity) encoded string that describes how to map the
 * generated code back to the original source code. This property is crucial for the correct functioning of the source map.
 * @property sourceRoot - An optional root URL for the sources.
 * It can be used to specify a base path for resolving the sources, which may be null if not applicable.
 * @property sourcesContent - An optional array containing the content of the original source files.
 * This property can be useful when the original files are not available at runtime.
 */

export interface SourceMapInterface {
    file?: string | null;
    names: Array<string>;
    version: number;
    sources: Array<string>;
    mappings: string;
    sourceRoot?: string | null;
    sourcesContent?: Array<string>;
}


export interface PositionInterface {
    name: string | null;
    line: number;
    column: number;
    source: string;
    sourceRoot: string | null;
    sourceIndex: number;
    generatedLine: number;
    generatedColumn: number;
}

export interface PositionWithContentInterface extends PositionInterface {
    sourcesContent: string,
}

export interface PositionWithCodeInterface extends PositionInterface {
    code: string,
    endLine: number,
    startLine: number,
}

export interface SourceOptionsInterface {
    linesAfter?: number;
    linesBefore?: number;
}
