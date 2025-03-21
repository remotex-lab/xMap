/**
 * Interface representing a stack frame in a stack trace.
 *
 * This structure provides detailed information about the location
 * of a specific frame in the stack trace, primarily used in error debugging and stack analysis.
 * It optionally includes information about the line, column, file, function name, and other details
 * about the origin of the code.
 *
 * Properties:
 * - source: The source code relevant to the stack frame.
 * - line: An optional line number in the code associated with this frame.
 * - column: An optional column number in the line associated with this frame.
 * - fileName: The name of the file associated with the frame, if available.
 * - functionName: The name of the function where the stack frame is located, if available.
 * - eval: Indicates if the stack frame originates from an evaluated script.
 * - async: Indicates if the stack frame is part of an asynchronous operation.
 * - native: Indicates if the stack frame is part of native code execution.
 * - constructor: Indicates if the frame is related to an object constructor invocation.
 * - evalOrigin: Optional information about the origin of the code if it resulted from an eval execution,
 * including line number, column number, file name, and function name.
 *
 * @since 3.0.0
 */

export interface StackFrame {
    source: string;
    line?: number;
    column?: number;
    fileName?: string;
    functionName?: string;
    eval: boolean;
    async: boolean;
    native: boolean;
    constructor: boolean;
    evalOrigin?: {
        line?: number;
        column?: number;
        fileName?: string;
        functionName?: string;
    };
}

/**
 * Represents a fully parsed error stack trace with structured information
 *
 * @see StackFrame
 * @since 2.1.0
 */

export interface ParsedStackTrace {
    name: string;               // Error name/type
    message: string;            // Error message
    stack: StackFrame[];        // Parsed frames
    rawStack: string;           // Original stack trace string
}
