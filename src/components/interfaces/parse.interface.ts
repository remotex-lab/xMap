/**
 * Represents a parsed stack frame from an error stack trace
 *
 * @see ParsedStackTrace
 * @since 2.1.0
 */

export interface StackFrame {
    source: string;              // Original stack line
    fileName: string | null;     // Source file path/name
    lineNumber: number | null;   // Line number
    columnNumber: number | null; // Column number
    functionName: string | null; // Function name (if available)
    isEval: boolean;             // Whether this frame is from evaluated code
    evalOrigin?: {               // If isEval is true, information about the eval context
        fileName: string | null;
        lineNumber: number | null;
        columnNumber: number | null;
        functionName: string | null;
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
