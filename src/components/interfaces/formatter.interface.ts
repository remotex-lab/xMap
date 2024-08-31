/**
 * A callback function type used for formatting code lines.
 *
 * @param lineString - The content of the line to be formatted.
 * @param padding - The amount of padding to be applied to the line.
 * @param line - The line number of the line to be formatted.
 * @returns The formatted line string.
 */

export type FormatCodeCallbackType =  (lineString: string, padding: number, line: number) => string;

/**
 * Configuration options for formatting code.
 */

export interface FormatCodeInterface {
    /**
     * The amount of padding to be applied to each line. If not specified, defaults to 0.
     */

    padding?: number;

    /**
     * The starting line number for formatting. If not specified, defaults to 1.
     */

    startLine?: number;

    /**
     * An optional action object specifying a line where a callback function should be triggered.
     */

    action?: {

        /**
         * The line number at which the callback function should be triggered.
         */

        triggerLine: number;

        /**
         * The callback function to be executed when the trigger line is encountered.
         */

        callback: FormatCodeCallbackType;
    };
}

/**
 * Set color to an error pointer
 */

export interface AnsiOptionInterface {
    color: string,
    reset: string
}
