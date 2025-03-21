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
 * Formats a code snippet with optional line padding and custom actions
 *
 * @param code - The source code | stack to be formatted
 * @param options - Configuration options for formatting the code
 * @returns A formatted string of the code snippet with applied padding and custom actions
 *
 * @remarks
 * This function takes a code string and an options object to format the code snippet.
 * It applies padding to line numbers and can trigger custom actions for specific lines.
 * Options include padding (default 10), startLine (default 0), and custom actions for specific lines.
 *
 * @example
 * ```ts
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
 * ```
 *
 * @since 1.0.0
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
 * Formats a code snippet around an error location with special highlighting
 *
 * @param sourcePosition - An object containing information about the source code and error location
 * @param ansiOption - Optional configuration for ANSI color codes
 * @returns A formatted string representing the relevant code snippet with error highlighting
 *
 * @throws Error - If the provided sourcePosition object has invalid line or column numbers
 *
 * @remarks
 * This function takes a sourcePosition object with code content and error location information,
 * then uses formatCode to format and highlight the relevant code snippet around the error.
 * The sourcePosition object should contain code (string), line (number), column (number),
 * and optional startLine (number, defaults to 1).
 *
 * @example
 * ```ts
 * const formattedErrorCode = formatErrorCode({
 *     code: "const x = 1;\nconst y = x.undefined;\n",
 *     line: 2,
 *     column: 15,
 *     startLine: 1
 * });
 * ```
 *
 * @see formatCode - The underlying function used for basic code formatting
 *
 * @since 1.0.0
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
