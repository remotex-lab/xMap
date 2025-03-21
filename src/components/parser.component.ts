/**
 * Export interfaces
 */

export { ParsedStackTrace, StackFrame } from '@components/interfaces/parse.interface';

/**
 * Import will remove at compile time
 */

import type { ParsedStackTrace, StackFrame } from '@components/interfaces/parse.interface';

/**
 * Regular expression patterns for different JavaScript engines' stack traces
 *
 * @since 2.1.0
 */

const PATTERNS = {
    V8: {
        STANDARD: /at\s+(?:([^(]+?)\s+)?\(?(?:(.+?):(\d+):(\d+)|(native))\)?/,
        EVAL: /^at\s(.+?)\s\(eval\sat\s(.+?)\s?\((.*):(\d+):(\d+)\),\s(.+?):(\d+):(\d+)\)$/
    },
    SPIDERMONKEY: {
        EVAL: /^(.*)@(.+?):(\d+):(\d+),\s(.+?)@(.+?):(\d+):(\d+)$/,
        STANDARD: /^(.*)@(.*?)(?:(\[native code\])|:(\d+):(\d+))$/
    },
    JAVASCRIPT_CORE: {
        STANDARD: /^(?:(global|eval)\s)?(.*)@(.*?)(?::(\d+)(?::(\d+))?)?$/
    }
};

/**
 * Enumeration of JavaScript engines that can be detected from stack traces
 *
 * @since 2.1.0
 */

export const enum JSEngines {
    V8,
    SPIDERMONKEY,
    JAVASCRIPT_CORE,
    UNKNOWN
}

/**
 * Detects the JavaScript engine based on the format of a stack trace line
 *
 * @param stack - The stack trace to analyze
 * @returns The identified JavaScript engine type
 *
 * @example
 * ```ts
 * const engine = detectJSEngine("at functionName (/path/to/file.js:10:15)");
 * if (engine === JSEngines.V8) {
 *   // Handle V8 specific logic
 * }
 * ```
 *
 * @since 2.1.0
 */

export function detectJSEngine(stack: string): JSEngines {
    if (stack.startsWith('    at ') || stack.startsWith('at '))
        return JSEngines.V8;

    if (stack.includes('@'))
        return /(?:global|eval) code@/.test(stack)
            ? JSEngines.JAVASCRIPT_CORE : JSEngines.SPIDERMONKEY;

    return JSEngines.UNKNOWN;
}

/**
 * Normalizes file paths from various formats to a standard format
 *
 * @param filePath - The file path to normalize, which may include protocol prefixes
 * @returns A normalized file path with consistent separators and without protocol prefixes
 *
 * @remarks
 * Handles both Windows and Unix-style paths, as well as file:// protocol URLs.
 * Converts all backslashes to forward slashes for consistency.
 *
 * @example
 * ```ts
 * // Windows file URL to a normal path
 * normalizePath("file:///C:/path/to/file.js"); // "C:/path/to/file.js"
 *
 * // Unix file URL to a normal path
 * normalizePath("file:///path/to/file.js"); // "/path/to/file.js"
 *
 * // Windows backslashes to forward slashes
 * normalizePath("C:\\path\\to\\file.js"); // "C:/path/to/file.js"
 * ```
 *
 * @since 2.1.0
 */

export function normalizePath(filePath: string): string {
    // Handle file:// protocol URLs
    if (filePath.startsWith('file://')) {
        // Handle Windows file:/// format
        if (filePath.startsWith('file:///') && /^file:\/\/\/[A-Za-z]:/.test(filePath)) {
            // Windows absolute path: file:///C:/path/to/file.js
            return filePath.substring(8);
        }

        // Handle *nix file:// format
        return filePath.substring(7);
    }

    // Handle Windows-style paths with backward slashes
    filePath = filePath.replace(/\\/g, '/');

    return filePath;
}

/**
 * Creates a default stack frame object with initial values
 *
 * @param source - The original source line from the stack trace
 * @returns A new StackFrame object with default null values
 *
 * @see ParsedStackTrace
 * @see StackFrame
 *
 * @since 2.1.0
 */

export function createDefaultFrame(source: string): StackFrame {
    return {
        source,
        isEval: false,
        fileName: null,
        lineNumber: null,
        columnNumber: null,
        functionName: null
    };
}

/**
 * Safely parses a string value to an integer, handling undefined and null cases
 *
 * @param value - The string value to parse
 * @returns The parsed integer or null if the input is undefined/null
 *
 * @example
 * ```ts
 * safeParseInt("42"); // 42
 * safeParseInt(undefined); // null
 * safeParseInt(null); // null
 * ```
 *
 * @since 2.1.0
 */

export function safeParseInt(value: string | undefined | null): number | null {
    return value && value.trim() !== '' ? parseInt(value, 10) : null;
}

/**
 * Parses a V8 JavaScript engine stack trace line into a structured StackFrame object
 *
 * @param line - The stack trace line to parse
 * @returns A StackFrame object containing the parsed information
 *
 * @remarks
 * Handles both standard V8 stack frames and eval-generated stack frames which
 * have a more complex structure with nested origin information.
 *
 * @example
 * ```ts
 * // Standard frame
 * parseV8StackLine("at functionName (/path/to/file.js:10:15)");
 *
 * // Eval frame
 * parseV8StackLine("at eval (eval at evalFn (/source.js:5:10), <anonymous>:1:5)");
 * ```
 *
 * @throws Error - If the line format doesn't match any known V8 pattern
 *
 * @see StackFrame
 * @see createDefaultFrame
 *
 * @since 2.1.0
 */

export function parseV8StackLine(line: string): StackFrame {
    const frame = createDefaultFrame(line);

    // Check for eval format first
    const evalMatch = line.match(PATTERNS.V8.EVAL);
    if (evalMatch) {
        frame.isEval = true;
        frame.functionName = evalMatch[1] || '<anonymous>';

        // Add eval origin information
        frame.evalOrigin = {
            fileName: normalizePath(evalMatch[3]) || null,
            lineNumber: safeParseInt(evalMatch[4]),
            columnNumber: safeParseInt(evalMatch[5]),
            functionName: evalMatch[2] || '<anonymous>'
        };

        // Position inside evaluated code
        frame.fileName = normalizePath(evalMatch[6]) || '<anonymous>';
        frame.lineNumber = safeParseInt(evalMatch[7]);
        frame.columnNumber = safeParseInt(evalMatch[8]);

        return frame;
    }

    // Standard V8 format
    const match = line.match(PATTERNS.V8.STANDARD);
    if (match) {
        frame.functionName = match[1] ? match[1].trim() : null;

        if (match[5] === 'native') {
            frame.fileName = '[native code]';
        } else {
            frame.fileName = normalizePath(match[2]) || null;
            frame.lineNumber = safeParseInt(match[3]);
            frame.columnNumber = safeParseInt(match[4]);
        }
    }

    return frame;
}

/**
 * Parses a SpiderMonkey JavaScript engine stack trace line into a structured StackFrame object
 *
 * @param line - The stack trace line to parse
 * @returns A StackFrame object containing the parsed information
 *
 * @remarks
 * Handles both standard SpiderMonkey stack frames and eval/Function-generated stack frames
 * which contain additional evaluation context information.
 *
 * @example
 * ```ts
 * // Standard frame
 * parseSpiderMonkeyStackLine("functionName@/path/to/file.js:10:15");
 *
 * // Eval frame
 * parseSpiderMonkeyStackLine("evalFn@/source.js line 5 > eval:1:5");
 * ```
 *
 * @see StackFrame
 * @see createDefaultFrame
 *
 * @since 2.1.0
 */

export function parseSpiderMonkeyStackLine(line: string): StackFrame {
    const frame = createDefaultFrame(line);

    // Check for eval/Function format
    const evalMatch = line.match(PATTERNS.SPIDERMONKEY.EVAL);
    if (evalMatch) {
        frame.isEval = true;
        frame.functionName = evalMatch[1] || null;

        // Add eval origin information
        frame.evalOrigin = {
            fileName: normalizePath(evalMatch[6]) || null,
            lineNumber: safeParseInt(evalMatch[7]),
            columnNumber: safeParseInt(evalMatch[8]),
            functionName: evalMatch[5]
        };

        // Position inside evaluated code
        frame.lineNumber = safeParseInt(evalMatch[3]);
        frame.columnNumber = safeParseInt(evalMatch[4]);

        return frame;
    }

    // Standard SpiderMonkey format
    const match = line.match(PATTERNS.SPIDERMONKEY.STANDARD);
    if (match) {
        frame.functionName = match[1] || null;
        frame.fileName = normalizePath(match[2]) || null;

        if (match[3] === '[native code]') {
            frame.fileName = '[native code]';
        } else {
            frame.lineNumber = safeParseInt(match[4]);
            frame.columnNumber = safeParseInt(match[5]);
        }
    }

    return frame;
}

/**
 * Parses a JavaScriptCore engine stack trace line into a structured StackFrame object
 *
 * @param line - The stack trace line to parse
 * @returns A StackFrame object containing the parsed information
 *
 * @remarks
 * Handles both standard JavaScriptCore stack frames and eval-generated stack frames.
 * Special handling is provided for "global code" references and native code.
 *
 * @example
 * ```ts
 * // Standard frame
 * parseJavaScriptCoreStackLine("functionName@/path/to/file.js:10:15");
 *
 * // Eval frame
 * parseJavaScriptCoreStackLine("eval code@");
 * ```
 *
 * @see StackFrame
 * @see createDefaultFrame
 *
 * @since 2.1.0
 */

export function parseJavaScriptCoreStackLine(line: string): StackFrame {
    const frame = createDefaultFrame(line);

    // Standard JavaScriptCore format
    const match = line.match(PATTERNS.JAVASCRIPT_CORE.STANDARD);
    if (match) {
        const funcName = match[2];

        // Handle "global code" as a special case
        frame.functionName = (funcName && funcName !== 'global code') ? funcName : null;
        frame.isEval = (match[1] === 'eval' || match[3] === 'eval');

        if (match[3] === '[native code]') {
            frame.fileName = '[native code]';
        } else {
            frame.fileName = normalizePath(match[3]) || null;
            frame.lineNumber = safeParseInt(match[4]);
            frame.columnNumber = safeParseInt(match[5]);
        }
    }

    return frame;
}

/**
 * Parses a stack trace line based on the detected JavaScript engine
 *
 * @param line - The stack trace line to parse
 * @param engine - The JavaScript engine type that generated the stack trace
 * @returns A StackFrame object containing the parsed information
 *
 * @remarks
 * Delegates to the appropriate parsing function based on the JavaScript engine.
 * Defaults to V8 parsing if the engine is unknown.
 *
 * @example
 * ```ts
 * const engine = detectJSEngine(stackLine);
 * const frame = parseStackLine(stackLine, engine);
 * ```
 *
 * @see JSEngines
 * @see parseV8StackLine
 * @see parseSpiderMonkeyStackLine
 * @see parseJavaScriptCoreStackLine
 *
 * @since 2.1.0
 */

export function parseStackLine(line: string, engine: JSEngines): StackFrame {
    switch (engine) {
        case JSEngines.SPIDERMONKEY:
            return parseSpiderMonkeyStackLine(line);
        case JSEngines.JAVASCRIPT_CORE:
            return parseJavaScriptCoreStackLine(line);
        case JSEngines.V8:
        default:
            return parseV8StackLine(line);
    }
}

/**
 * Parses a complete error stack trace into a structured format
 *
 * @param error - Error object or error message string to parse
 * @returns A ParsedStackTrace object containing structured stack trace information
 *
 * @remarks
 * Automatically detects the JavaScript engine from the stack format.
 * Filters out redundant information like the error name/message line.
 * Handles both Error objects and string error messages.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error ("Something went wrong");
 * } catch (error) {
 *   const parsedStack = parseErrorStack(error);
 *   console.log(parsedStack.name); // "Error"
 *   console.log(parsedStack.message); // "Something went wrong"
 *   console.log(parsedStack.stack); // Array of StackFrame objects
 * }
 * ```
 *
 * @see ParsedStackTrace
 * @see StackFrame
 * @see parseStackLine
 * @see detectJSEngine
 *
 * @since 2.1.0
 */

export function parseErrorStack(error: Error | string): ParsedStackTrace {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const stack = errorObj.stack || '';
    const message = errorObj.message || '';
    const name = errorObj.name || 'Error';

    const engine = detectJSEngine(stack);
    const stackLines = stack.split('\n')
        .map(line => line.trim())
        .filter(line => !line.includes(`${name}: ${message}`))
        .filter(line => line.trim() !== '');

    return {
        name,
        message,
        stack: stackLines.map(line => parseStackLine(line, engine)),
        rawStack: stack
    };
}
