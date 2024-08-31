/**
 * Imports
 */

import { formatCode } from '@components/formatter.component';

describe('formatCode', () => {
    test('should format code with default options', () => {
        const code = 'line1\nline2\nline3';
        const result = formatCode(code);

        expect(result).toBe('      1 | line1\n      2 | line2\n      3 | line3');
    });

    test('should format code with custom padding and start line', () => {
        const code = 'line1\nline2\nline3';
        const options = { padding: 5, startLine: 2 };
        const result = formatCode(code, options);

        expect(result).toBe(' 3 | line1\n 4 | line2\n 5 | line3');
    });

    test('should apply custom action to specific line', () => {
        const code = 'line1\nline2\nline3';
        const options = {
            padding: 5,
            startLine: 2,
            action: {
                triggerLine: 4,
                callback: (lineString: string, padding: number, line: number) => `* ${ line } | ${ lineString }`
            }
        };
        const result = formatCode(code, options);

        expect(result).toBe(' 3 | line1\n* 4 |  4 | line2\n 5 | line3');
    });
});
