/**
 * Export interfaces
 */

export type * from '@components/interfaces/parse-component.interface';

/**
 * Import will remove at compile time
 */

import type { ParsedStackTrace, StackFrame } from '@components/interfaces/parse-component.interface';

/**
 * Regular expression patterns for different JavaScript engines' stack traces
 *
 * @since 2.1.0
 */

const PATTERNS = {
    V8: {
        GLOBAL: /at\s(.*):(\d+):(\d+)/,
        STANDARD: /at\s(.*?)\((?:(.+?):(\d+):(\d+)|(native))\)/,
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
        eval: false,
        async: false,
        native: false,
        constructor: false
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

export function safeParseInt(value: string | undefined | null): number | undefined {
    return value && value.trim() !== '' ? parseInt(value, 10) : undefined;
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

    // Common flags that apply to all formats
    if (line.toLowerCase().includes('new')) frame.constructor = true;
    if (line.toLowerCase().includes('async')) frame.async = true;

    // Try to match against each pattern
    const evalMatch = line.match(PATTERNS.V8.EVAL);
    const globalMatch = line.match(PATTERNS.V8.GLOBAL);
    const standardMatch = !evalMatch && line.match(PATTERNS.V8.STANDARD);

    if (evalMatch) {
        // Handle eval format
        frame.eval = true;
        frame.functionName = evalMatch[1] || undefined;

        // Add eval origin information
        frame.evalOrigin = {
            line: safeParseInt(evalMatch[4]) ?? undefined,
            column: safeParseInt(evalMatch[5]) ?? undefined,
            fileName: evalMatch[3] ? normalizePath(evalMatch[3]) : undefined,
            functionName: evalMatch[2] || '<anonymous>'
        };

        // Position inside evaluated code
        frame.line = safeParseInt(evalMatch[7]) ?? undefined;
        frame.column = safeParseInt(evalMatch[8]) ?? undefined;
        frame.fileName = evalMatch[6] ? normalizePath(evalMatch[6]) : undefined;
    } else if (standardMatch) {
        // Handle standard format
        frame.functionName = standardMatch[1] ? standardMatch[1].trim() : undefined;

        if (standardMatch[5] === 'native') {
            frame.native = true;
            frame.fileName = '[native code]';
        } else {
            frame.line = safeParseInt(standardMatch[3]) ?? undefined;
            frame.column = safeParseInt(standardMatch[4]) ?? undefined;
            frame.fileName = standardMatch[2] ? normalizePath(standardMatch[2]) : undefined;
            if(frame.fileName?.includes('node:')) frame.native = true;
        }
    } else if (globalMatch) {
        frame.fileName = globalMatch[1] ? normalizePath(globalMatch[1]) : undefined;
        frame.line = safeParseInt(globalMatch[2]) ?? undefined;
        frame.column = safeParseInt(globalMatch[3]) ?? undefined;
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
        frame.eval = true;
        frame.functionName = evalMatch[1] ? evalMatch[1] : undefined;

        if (line.toLowerCase().includes('constructor'))
            frame.constructor = true;

        if (line.toLowerCase().includes('async'))
            frame.async = true;

        // Add eval origin information
        frame.evalOrigin = {
            line: safeParseInt(evalMatch[7]) ?? undefined,
            column: safeParseInt(evalMatch[8]) ?? undefined,
            fileName: normalizePath(evalMatch[6]),
            functionName: evalMatch[5] ? evalMatch[5] : undefined
        };

        // Position inside evaluated code
        frame.line = safeParseInt(evalMatch[3]) ?? undefined;
        frame.column = safeParseInt(evalMatch[4]) ?? undefined;

        return frame;
    }

    // Standard SpiderMonkey format
    const match = line.match(PATTERNS.SPIDERMONKEY.STANDARD);
    if (match) {
        frame.functionName = match[1] ? match[1] : undefined;
        frame.fileName = normalizePath(match[2]);

        if (match[3] === '[native code]') {
            frame.fileName = '[native code]';
        } else {
            frame.line = safeParseInt(match[4]) ?? undefined;
            frame.column = safeParseInt(match[5]) ?? undefined;
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
        frame.functionName = match[2];
        frame.eval = (match[1] === 'eval' || match[3] === 'eval');

        if (line.toLowerCase().includes('constructor'))
            frame.constructor = true;

        if (line.toLowerCase().includes('async'))
            frame.async = true;

        if (match[3] === '[native code]') {
            frame.native = true;
            frame.fileName = '[native code]';
        } else {
            frame.line = safeParseInt(match[4]) ?? undefined;
            frame.column = safeParseInt(match[5]) ?? undefined;
            frame.fileName = normalizePath(match[3]);
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
        .filter(line => line.trim() !== '')
        .slice(1);

    return {
        name,
        message,
        stack: stackLines.map(line => parseStackLine(line, engine)),
        rawStack: stack
    };
}
