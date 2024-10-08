/**
 * Interface representing a Source Map v3 object.
 */

export interface SourceMapInterface {

    /**
     * The version of the source map specification.
     * This field is a required number that indicates which version of the source map format is used.
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

    sourcesContent?: Array<string>;

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
     */

    nameIndex: number | null;

    /**
     * The index in the `sources` array that refers to the file in which the original code is located.
     */

    fileIndex: number;

    /**
     * The line number in the original source code (1-based index).
     */

    sourceLine: number;

    /**
     * The column number in the original source code (0-based index).
     */

    sourceColumn: number;

    /**
     * The line number in the generated (compiled/transpiled) code (1-based index).
     */

    generatedLine: number;

    /**
     * The column number in the generated (compiled/transpiled) code (0-based index).
     */

    generatedColumn: number;
}
