/**
 * Export interfaces
 */

export type { AnsiOptionInterface, FormatCodeInterface } from '@components/interfaces/formatter-component.interface';

/**
 * Import will remove at compile time
 */

import type { PositionWithCodeInterface } from '@services/interfaces/source-service.interface';
import type { AnsiOptionInterface, FormatCodeInterface } from '@components/interfaces/formatter-component.interface';

/**
 * Formats a code snippet with optional line padding and custom actions.
 *
 * This function takes a code string and an options object to format the code snippet.
 * It applies padding to line numbers and can trigger custom actions for specific lines.
 *
 * @param code - The source code | stack to be formatted.
 * @param options - Configuration options for formatting the code.
 *   - `padding` (number, optional): Number of characters for line number padding. Defaults to 10.
 *   - `startLine` (number, optional): The starting line number for formatting. Defaults to 1.
 *   - `action` (object, optional): Custom actions to apply to specific lines.
 *     - `triggerLine` (number): The line number where the action should be triggered.
 *     - `callback` (function): A callback function to format the line string when `triggerLine` is matched.
 *       The callback receives the formatted line string, the padding value, and the current line number as arguments.
 *
 * @returns A formatted string of the code snippet with applied padding and custom actions.
 *
 * @example
 * ```typescript
 * const formattedCode = formatCode(code, {
 *     padding: 8,
 *     startLine: 5,
 *     action: {
 *         triggerLine: 7,
 *         callback: (lineString, padding, lineNumber) => {
 *             return `Custom formatting for line ${lineNumber}: ${lineString}`;
 *         }
 *     }
 * });
 * console.log(formattedCode);
 * ```
 */

export function formatCode(code: string, options: FormatCodeInterface = {}): string {
    const lines = code.split('\n');
    const padding = options.padding ?? 10;
    const startLine = options.startLine ?? 0;

    return lines.map((lineContent, index) => {
        const currentLineNumber = index + startLine + 1;
        const prefix = `${ currentLineNumber} | `;
        const string = `${ prefix.padStart(padding) }${ lineContent }`;

        if (options.action && currentLineNumber === options.action.triggerLine) {
            return options.action.callback(string, padding, currentLineNumber);
        }

        return string;
    }).join('\n');
}

/**
 * Formats a code snippet around an error location with special highlighting.
 *
 * This function takes a `sourcePosition` object containing information about the source code
 * and error location, then uses `formatCode` to format and highlight the relevant code snippet.
 *
 * @param sourcePosition - An object containing information about the source code and error location.
 *   - `code` (string): The entire source code content.
 *   - `line` (number): The line number where the error occurred (1-based indexing).
 *   - `column` (number): The column number within the line where the error occurred (1-based indexing).
 *   - `startLine` (number, optional): The starting line number of the code snippet (defaults to 1).
 * @param ansiOption - Optional configuration for ANSI color codes.
 *   - `color` (string): The ANSI escape sequence to colorize the error marker and prefix (e.g., `'\x1b[38;5;160m'`).
 *   - `reset` (string): The ANSI escape sequence to reset the color (e.g., `'\x1b[0m'`).
 *
 * @throws Error - If the provided `sourcePosition` object has invalid line or column numbers,
 *                  or if the error line is outside the boundaries of the provided code content.
 *
 * @returns A formatted string representing the relevant code snippet around the error location,
 *          including special highlighting for the error line and column.
 *
 * @example
 * ```typescript
 * const formattedErrorCode = formatErrorCode(sourcePosition);
 * console.log(formattedErrorCode);
 * ```
 */

export function formatErrorCode(sourcePosition: PositionWithCodeInterface, ansiOption?: AnsiOptionInterface): string {
    const { code, line: errorLine, column: errorColumn, startLine } = sourcePosition;

    // Validate line and column numbers
    if (errorLine < startLine || errorColumn < 1) {
        throw new Error('Invalid line or column number.');
    }

    return formatCode(code, {
        startLine,
        action: {
            triggerLine: errorLine,
            callback: (lineString, padding, line) => {
                let pointer = '^';
                let ansiPadding = padding - 1; // 1 size of the char we added
                let prefixPointer = '>';

                if (ansiOption) {
                    pointer = `${ ansiOption.color }${ pointer }${ ansiOption.reset }`;
                    ansiPadding += (ansiOption.color.length + ansiOption.reset.length);
                    prefixPointer = `${ ansiOption.color }>${ ansiOption.reset }`;
                }

                const errorMarker = ' | '.padStart(padding) + ' '.repeat(errorColumn - 1) + `${ pointer }`;
                lineString = `${ prefixPointer } ${ line } |`.padStart(ansiPadding) + lineString.split('|')[1];

                return lineString + `\n${ errorMarker }`;
            }
        }
    });
}
