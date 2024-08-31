/**
 * Imports
 */

import { parseErrorStack } from '@components/parser.component';

describe('parseErrorStack', () => {
    test('should parse stack trace with eval names correctly', () => {
        const stack = `Error: x
    at eval (eval at j (file://dist/index.js:5:695), <anonymous>:1:20)
    at j (src\\core\\providers\\configuration.provider.ts:35:9)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at y (src\\core\\providers\\configuration.provider.ts:56:12)`;

        const expectedOutput = [
            {
                at: 'eval', file: '<anonymous>', line: 1, column: 20, executor: {
                    at: 'j', file: 'file://dist/index.js', line: 5, column: 695
                }
            },
            { at: 'j', file: 'src\\core\\providers\\configuration.provider.ts', line: 35, column: 9, executor: null },
            { at: 'process.processTicksAndRejections', file: 'node:internal/process/task_queues', line: 95, column: 5, executor: null },
            { at: 'y', file: 'src\\core\\providers\\configuration.provider.ts', line: 56, column: 12, executor: null }
        ];

        expect(parseErrorStack(stack)).toEqual(expectedOutput);
    });

    test('should parse stack trace with function names correctly', () => {
        const stack = `Error: x
            at evalmachine.<anonymous>:1:20
            at Script.runInContext (node:vm:148:12)
            at b (file://Jet/dist/index.js:1:721)
            at _ (file://Jet/dist/index.js:7:5497)
            at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
            at async O (file:///dist/index.js:7:5651)`;

        const expectedOutput = [
            { at: '<anonymous>', file: 'evalmachine.<anonymous>', line: 1, column: 20, executor: null },
            { at: 'Script.runInContext', file: 'node:vm', line: 148, column: 12, executor: null },
            { at: 'b', file: 'file://Jet/dist/index.js', line: 1, column: 721, executor: null },
            { at: '_', file: 'file://Jet/dist/index.js', line: 7, column: 5497, executor: null },
            { at: 'process.processTicksAndRejections', file: 'node:internal/process/task_queues', line: 95, column: 5, executor: null },
            { at: 'async O', file: 'file:///dist/index.js', line: 7, column: 5651, executor: null }
        ];

        expect(parseErrorStack(stack)).toEqual(expectedOutput);
    });

    test('should parse stack trace without function names correctly', () => {
        const stack = `Error: x
            at providers\\vm.provider.ts:29:15
            at providers\\configuration.provider.ts:32:23
            at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
            at C (providers\\configuration.provider.ts:43:12)`;

        const expectedOutput = [
            { at: '<anonymous>', file: 'providers\\vm.provider.ts', line: 29, column: 15, executor: null },
            { at: '<anonymous>', file: 'providers\\configuration.provider.ts', line: 32, column: 23, executor: null },
            { at: 'process.processTicksAndRejections', file: 'node:internal/process/task_queues', line: 95, column: 5, executor: null },
            { at: 'C', file: 'providers\\configuration.provider.ts', line: 43, column: 12, executor: null }
        ];

        const result = parseErrorStack(stack);
        expect(result).toEqual(expectedOutput);
    });

    test('should return an empty array for an empty stack trace', () => {
        const stack = '';
        const expectedOutput: Array<unknown> = [];
        const result = parseErrorStack(stack);
        expect(result).toEqual(expectedOutput);
    });

    test('should return an empty array for a stack trace with only an error message', () => {
        const stack = 'Error: x';
        const expectedOutput: Array<unknown> = [];
        const result = parseErrorStack(stack);
        expect(result).toEqual(expectedOutput);
    });
});
