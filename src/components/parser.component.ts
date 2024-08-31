/**
 * Import will remove at compile time
 */

import type { StackEntryInterface } from '@components/interfaces/parse.interface';

/**
 * Parses an error stack trace and returns an object with a message and an array of stack entries.
 *
 * @param stackString - The error stack trace.
 * @returns The parsed stack trace object.
 */

export function parseErrorStack(stackString: string): Array<StackEntryInterface> {
    const lines = stackString.split('\n').slice(1);
    const regex = /^\s*at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$|^\s*at\s+(.*?):(\d+):(\d+)$/;
    const evalRegex = /eval\s+at\s+([^\s(]+).+\((.+):(\d+):(\d+)\),\s(.+)/;
    const stack: Array<StackEntryInterface> = [];

    lines.forEach((line) => {
        const match = line.match(regex);
        if (!match) return;

        let args: Array<string> = match.slice(1);
        if(!match[2]) {
            args = match.slice(4);
        }

        const [ at, file, lineNum, colNum ] = args;
        const lineNumber = parseInt(lineNum, 10);
        const columnNumber = parseInt(colNum, 10);

        if (line.includes('eval')) {
            const evalMatch = file.match(evalRegex)?.slice(1);
            if (evalMatch) {
                const [ evalAt, evalFile, evalLineNum, evalColNum, evalAnonFile ] = evalMatch;
                stack.push({
                    at,
                    file: evalAnonFile,
                    line: lineNumber,
                    column: columnNumber,
                    executor: {
                        at: evalAt,
                        file: evalFile,
                        line: parseInt(evalLineNum, 10),
                        column: parseInt(evalColNum, 10)
                    }
                });

                return;
            }
        }

        stack.push({
            at: at || '<anonymous>',
            file,
            line: lineNumber,
            column: columnNumber,
            executor: null
        });
    });

    return stack;
}
