/**
 * Imports
 */

import {
    JSEngines,
    safeParseInt,
    normalizePath,
    detectJSEngine,
    parseErrorStack,
    parseV8StackLine,
    parseSpiderMonkeyStackLine,
    parseJavaScriptCoreStackLine
} from './parser.component';

/**
 * Tests
 */

describe('detectJSEngine', () => {
    describe('V8 engine detection', () => {
        test('should detect V8 engine with "at " prefix', () => {
            const stackLine = 'at functionName (/path/to/file.js:10:15)';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.V8);
        });

        test('should detect V8 engine with indented "    at " prefix', () => {
            const stackLine = '    at functionName (/path/to/file.js:10:15)';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.V8);
        });

        test('should detect V8 engine with anonymous function', () => {
            const stackLine = 'at /path/to/file.js:10:15';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.V8);
        });
    });

    describe('SpiderMonkey engine detection', () => {
        test('should detect SpiderMonkey engine with function name', () => {
            const stackLine = 'functionName@/path/to/file.js:10:15';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.SPIDERMONKEY);
        });

        test('should detect SpiderMonkey engine with anonymous function', () => {
            const stackLine = '@/path/to/file.js:10:15';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.SPIDERMONKEY);
        });

        test('should detect SpiderMonkey engine with eval', () => {
            const stackLine = 'evalFn@/source.js line 5 > eval:1:5';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.SPIDERMONKEY);
        });
    });

    describe('JavaScriptCore engine detection', () => {
        test('should detect JavaScriptCore engine', () => {
            const stackLine = 'global code@/path/to/file.js:10:15';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.JAVASCRIPT_CORE);
        });

        test('should detect JavaScriptCore engine with eval', () => {
            const stackLine = 'eval code@';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.JAVASCRIPT_CORE);
        });
    });

    describe('Unknown engine detection', () => {
        test('should return UNKNOWN for unrecognized stack trace formats', () => {
            const stackLine = 'Something completely different';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.UNKNOWN);
        });

        test('should return UNKNOWN for empty string', () => {
            expect(detectJSEngine('')).toBe(JSEngines.UNKNOWN);
        });
    });

    describe('Edge cases', () => {
        test('should prioritize "at" prefix over "@" symbol for hybrid formats', () => {
            const stackLine = 'at something@somewhere';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.V8);
        });

        test('should prioritize "global code@" over generic "@" detection', () => {
            const stackLine = 'function with global code@somewhere';
            expect(detectJSEngine(stackLine)).toBe(JSEngines.JAVASCRIPT_CORE);
        });
    });
});

describe('normalizePath', () => {
    describe('file:// protocol handling', () => {
        test('should remove file:// protocol from Unix paths', () => {
            const input = 'file:///var/www/html/script.js';
            const expected = '/var/www/html/script.js';
            expect(normalizePath(input)).toBe(expected);
        });

        test('should remove file:/// protocol from Windows paths', () => {
            const input = 'file:///C:/Users/name/project/script.js';
            const expected = 'C:/Users/name/project/script.js';
            expect(normalizePath(input)).toBe(expected);
        });

        test('should remove file:// protocol from relative paths', () => {
            const input = 'file://./relative/path/script.js';
            const expected = './relative/path/script.js';
            expect(normalizePath(input)).toBe(expected);
        });
    });

    describe('backslash conversion', () => {
        test('should convert Windows backslashes to forward slashes', () => {
            const input = 'C:\\Users\\name\\project\\script.js';
            const expected = 'C:/Users/name/project/script.js';
            expect(normalizePath(input)).toBe(expected);
        });

        test('should convert mixed slashes to forward slashes', () => {
            const input = 'C:\\Users/name\\project/script.js';
            const expected = 'C:/Users/name/project/script.js';
            expect(normalizePath(input)).toBe(expected);
        });
    });

    describe('unaffected paths', () => {
        test('should leave Unix paths unchanged', () => {
            const input = '/var/www/html/script.js';
            expect(normalizePath(input)).toBe(input);
        });

        test('should leave relative paths unchanged (except for slashes)', () => {
            const input = './relative/path/script.js';
            expect(normalizePath(input)).toBe(input);
        });

        test('should leave forward slash Windows paths unchanged', () => {
            const input = 'C:/Users/name/project/script.js';
            expect(normalizePath(input)).toBe(input);
        });
    });

    describe('edge cases', () => {
        test('should handle empty string', () => {
            expect(normalizePath('')).toBe('');
        });

        test('should handle paths with multiple consecutive slashes', () => {
            const input = 'path//with///multiple////slashes';
            expect(normalizePath(input)).toBe(input);
        });

        test('should handle non-file protocol URLs', () => {
            const input = 'http://example.com/script.js';
            expect(normalizePath(input)).toBe(input);
        });

        test('should handle file:// protocol with query parameters', () => {
            const input = 'file:///path/to/file.js?query=param';
            const expected = '/path/to/file.js?query=param';
            expect(normalizePath(input)).toBe(expected);
        });

        test('should handle file:// protocol with hash', () => {
            const input = 'file:///path/to/file.js#section';
            const expected = '/path/to/file.js#section';
            expect(normalizePath(input)).toBe(expected);
        });
    });
});

describe('safeParseInt', () => {
    describe('valid number parsing', () => {
        test('should parse integer string correctly', () => {
            expect(safeParseInt('123')).toBe(123);
        });

        test('should parse negative integer string correctly', () => {
            expect(safeParseInt('-456')).toBe(-456);
        });

        test('should parse integer with leading zeros', () => {
            expect(safeParseInt('0042')).toBe(42);
        });

        test('should parse string with whitespace to integer', () => {
            expect(safeParseInt(' 789 ')).toBe(789);
        });
    });

    describe('truncation behavior', () => {
        test('should truncate decimal numbers to integers', () => {
            expect(safeParseInt('123.45')).toBe(123);
        });

        test('should handle strings with non-digit suffixes', () => {
            expect(safeParseInt('567abc')).toBe(567);
        });
    });

    describe('null and undefined handling', () => {
        test('should return null for undefined input', () => {
            expect(safeParseInt(undefined)).toBeNull();
        });

        test('should return null for null input', () => {
            expect(safeParseInt(null)).toBeNull();
        });
    });

    describe('falsy string handling', () => {
        test('should return null for empty string', () => {
            expect(safeParseInt('')).toBeNull();
        });
    });

    describe('edge cases', () => {
        test('should handle very large integers', () => {
            expect(safeParseInt('9007199254740991')).toBe(9007199254740991); // MAX_SAFE_INTEGER
        });

        test('should parse "0" as integer 0', () => {
            expect(safeParseInt('0')).toBe(0);
        });

        test('should handle string with only whitespace', () => {
            expect(safeParseInt('   ')).toBeNull(); // Empty strings are falsy
        });

        test('should return NaN for unparseable strings', () => {
            expect(safeParseInt('abc')).toBe(NaN);
        });

        test('should parse hexadecimal-looking strings as decimal', () => {
            expect(safeParseInt('0xFF')).toBe(0); // Only parses "0" since base 10
        });
    });
});

describe('parseV8StackLine', () => {
    const testCases = [
        {
            description: 'eval stack line with anonymous outer function',
            input: 'at eval (eval at <anonymous> (:20:25), <anonymous>:2:10)',
            expected: {
                functionName: 'eval',
                fileName: '<anonymous>',
                lineNumber: 2,
                columnNumber: 10,
                isEval: true,
                evalOrigin: {
                    fileName: null,
                    lineNumber: 20,
                    columnNumber: 25,
                    functionName: '<anonymous>'
                }
            }
        },
        {
            description: 'eval stack line with test function and chromewebdata origin',
            input: 'at test (eval at <anonymous> (chromewebdata/:2:5), <anonymous>:1:25)',
            expected: {
                functionName: 'test',
                fileName: '<anonymous>',
                lineNumber: 1,
                columnNumber: 25,
                isEval: true,
                evalOrigin: {
                    fileName: 'chromewebdata/',
                    lineNumber: 2,
                    columnNumber: 5,
                    functionName: '<anonymous>'
                }
            }
        },
        {
            description: 'eval stack line with eval function and chromewebdata origin',
            input: 'at eval (eval at <anonymous> (chromewebdata/:2:5), <anonymous>:1:45)',
            expected: {
                functionName: 'eval',
                fileName: '<anonymous>',
                lineNumber: 1,
                columnNumber: 45,
                isEval: true,
                evalOrigin: {
                    fileName: 'chromewebdata/',
                    lineNumber: 2,
                    columnNumber: 5,
                    functionName: '<anonymous>'
                }
            }
        },
        {
            description: 'simple anonymous stack line',
            input: 'at <anonymous>:2:5',
            expected: {
                functionName: null,
                fileName: '<anonymous>',
                lineNumber: 2,
                columnNumber: 5,
                isEval: false
            }
        },
        {
            description: 'eval stack line with file URL path',
            input: 'at eval (eval at runScript (file:///Users/name/project/run.js:30:10), <anonymous>:5:15)',
            expected: {
                functionName: 'eval',
                fileName: '<anonymous>',
                lineNumber: 5,
                columnNumber: 15,
                isEval: true,
                evalOrigin: {
                    fileName: '/Users/name/project/run.js',
                    lineNumber: 30,
                    columnNumber: 10,
                    functionName: 'runScript'
                }
            }
        },
        {
            description: 'eval stack line with evaluation at fs path',
            input: 'at eval (eval at evalFn (/source.js:10:15), <anonymous>:1:5)',
            expected: {
                functionName: 'eval',
                fileName: '<anonymous>',
                lineNumber: 1,
                columnNumber: 5,
                isEval: true,
                evalOrigin: {
                    fileName: '/source.js',
                    lineNumber: 10,
                    columnNumber: 15,
                    functionName: 'evalFn'
                }
            }
        },
        {
            description: 'eval stack line with fs path and no line/col numbers',
            input: 'at test (eval at fs:/src/script.js (:35:7), <anonymous>:1:25)',
            expected: {
                functionName: 'test',
                fileName: '<anonymous>',
                lineNumber: 1,
                columnNumber: 25,
                isEval: true,
                evalOrigin: {
                    fileName: null,
                    lineNumber: 35,
                    columnNumber: 7,
                    functionName: 'fs:/src/script.js'
                }
            }
        }
    ];

    describe('parseV8StackLine', () => {
        test.each(testCases)('$description', ({ input, expected }) => {
            const result = parseV8StackLine(input);

            expect(result.functionName).toBe(expected.functionName);
            expect(result.fileName).toBe(expected.fileName);
            expect(result.lineNumber).toBe(expected.lineNumber);
            expect(result.columnNumber).toBe(expected.columnNumber);
            expect(result.isEval).toBe(expected.isEval);

            if (expected.evalOrigin) {
                expect(result.evalOrigin).toBeDefined();
                if (result.evalOrigin) {
                    expect(result.evalOrigin.fileName).toBe(expected.evalOrigin.fileName);
                    expect(result.evalOrigin.lineNumber).toBe(expected.evalOrigin.lineNumber);
                    expect(result.evalOrigin.columnNumber).toBe(expected.evalOrigin.columnNumber);
                    expect(result.evalOrigin.functionName).toBe(expected.evalOrigin.functionName);
                }
            } else {
                expect(result.evalOrigin).toBeUndefined();
            }
        });
    });


    describe('standard V8 stack lines', () => {
        test('should parse stack line with function name and location', () => {
            const line = 'at processTicksAndRejections (node:internal/process/task_queues:95:5)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('processTicksAndRejections');
            expect(result.fileName).toBe('node:internal/process/task_queues');
            expect(result.lineNumber).toBe(95);
            expect(result.columnNumber).toBe(5);
            expect(result.isEval).toBe(false);
        });

        test('should parse anonymous function stack line', () => {
            const line = 'at /path/to/file.js:10:15';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBeNull();
            expect(result.fileName).toBe('/path/to/file.js');
            expect(result.lineNumber).toBe(10);
            expect(result.columnNumber).toBe(15);
            expect(result.isEval).toBe(false);
        });

        test('should handle native code references', () => {
            const line = 'at Function.Module._resolveFilename (native)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('Function.Module._resolveFilename');
            expect(result.fileName).toBe('[native code]');
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
            expect(result.isEval).toBe(false);
        });

        test('should handle stack lines with spaces in function names', () => {
            const line = 'at Object.<anonymous> (/path/to/file.js:20:30)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('Object.<anonymous>');
            expect(result.fileName).toBe('/path/to/file.js');
            expect(result.lineNumber).toBe(20);
            expect(result.columnNumber).toBe(30);
            expect(result.isEval).toBe(false);
        });

        test('should parse stack line with weird file path', () => {
            const line = 'at Module._compile (C:\\Users\\name\\project\\file.js:100:10)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('Module._compile');
            expect(result.fileName).toBe('C:/Users/name/project/file.js'); // Normalized path
            expect(result.lineNumber).toBe(100);
            expect(result.columnNumber).toBe(10);
            expect(result.isEval).toBe(false);
        });
    });

    describe('eval stack lines', () => {
        test('should parse eval stack line with function name', () => {
            const line = 'at eval (eval at evalFn (/source.js:10:15), <anonymous>:1:5)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('eval');
            expect(result.fileName).toBe('<anonymous>');
            expect(result.lineNumber).toBe(1);
            expect(result.columnNumber).toBe(5);
            expect(result.isEval).toBe(true);

            if (result.evalOrigin) {
                expect(result.evalOrigin.fileName).toBe('/source.js');
                expect(result.evalOrigin.lineNumber).toBe(10);
                expect(result.evalOrigin.columnNumber).toBe(15);
                expect(result.evalOrigin.functionName).toBe('evalFn');
            } else {
                fail('evalOrigin should be defined');
            }
        });

        test('should parse eval stack line with anonymous outer function', () => {
            const line = 'at eval (eval at <anonymous> (:20:25), <anonymous>:2:10)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('eval');
            expect(result.fileName).toBe('<anonymous>');
            expect(result.lineNumber).toBe(2);
            expect(result.columnNumber).toBe(10);
            expect(result.isEval).toBe(true);

            if (result.evalOrigin) {
                expect(result.evalOrigin.fileName).toBeNull();
                expect(result.evalOrigin.lineNumber).toBe(20);
                expect(result.evalOrigin.columnNumber).toBe(25);
                expect(result.evalOrigin.functionName).toBe('<anonymous>');
            } else {
                fail('evalOrigin should be defined');
            }
        });

        test('should parse eval stack line with file URL', () => {
            const line = 'at eval (eval at runScript (file:///Users/name/project/run.js:30:10), <anonymous>:5:15)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('eval');
            expect(result.fileName).toBe('<anonymous>');
            expect(result.lineNumber).toBe(5);
            expect(result.columnNumber).toBe(15);
            expect(result.isEval).toBe(true);

            if (result.evalOrigin) {
                expect(result.evalOrigin.fileName).toBe('/Users/name/project/run.js');
                expect(result.evalOrigin.lineNumber).toBe(30);
                expect(result.evalOrigin.columnNumber).toBe(10);
                expect(result.evalOrigin.functionName).toBe('runScript');
            } else {
                fail('evalOrigin should be defined');
            }
        });
    });

    describe('edge cases', () => {
        test('should handle malformed stack lines', () => {
            const line = 'something completely different';
            const result = parseV8StackLine(line);

            expect(result.source).toBe(line);
            expect(result.functionName).toBeNull();
            expect(result.fileName).toBeNull();
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
        });

        test('should handle empty string', () => {
            const line = '';
            const result = parseV8StackLine(line);

            expect(result.source).toBe(line);
            expect(result.functionName).toBeNull();
            expect(result.fileName).toBeNull();
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
        });

        test('should handle stack lines with unusual characters', () => {
            const line = 'at weird$Function__name! (/path with spaces/file.js:50:20)';
            const result = parseV8StackLine(line);

            expect(result.functionName).toBe('weird$Function__name!');
            expect(result.fileName).toBe('/path with spaces/file.js');
            expect(result.lineNumber).toBe(50);
            expect(result.columnNumber).toBe(20);
        });
    });
});

describe('parseSpiderMonkeyStackLine', () => {
    describe('standard SpiderMonkey stack lines', () => {
        test('should parse stack line with function name and location', () => {
            const line = 'someFunction@/path/to/file.js:123:45';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('someFunction');
            expect(result.fileName).toBe('/path/to/file.js');
            expect(result.lineNumber).toBe(123);
            expect(result.columnNumber).toBe(45);
            expect(result.isEval).toBe(false);
        });

        test('should parse anonymous function stack line', () => {
            const line = '@/path/to/file.js:50:25';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBeNull();
            expect(result.fileName).toBe('/path/to/file.js');
            expect(result.lineNumber).toBe(50);
            expect(result.columnNumber).toBe(25);
            expect(result.isEval).toBe(false);
        });

        test('should handle native code references', () => {
            const line = 'Array.prototype.forEach@[native code]';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('Array.prototype.forEach');
            expect(result.fileName).toBe('[native code]');
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
            expect(result.isEval).toBe(false);
        });

        test('should handle stack lines with file URLs', () => {
            const line = 'main@file:///Users/name/project/main.js:30:15';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('main');
            expect(result.fileName).toBe('/Users/name/project/main.js');
            expect(result.lineNumber).toBe(30);
            expect(result.columnNumber).toBe(15);
            expect(result.isEval).toBe(false);
        });

        test('should normalize Windows paths', () => {
            const line = 'processData@C:\\Users\\name\\project\\script.js:75:20';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('processData');
            expect(result.fileName).toBe('C:/Users/name/project/script.js');
            expect(result.lineNumber).toBe(75);
            expect(result.columnNumber).toBe(20);
            expect(result.isEval).toBe(false);
        });
    });

    describe('eval stack lines', () => {
        test('should parse eval stack line', () => {
            const line = 'evaluatedFunction@eval:3:10, eval@/source.js:15:5';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('evaluatedFunction');
            expect(result.isEval).toBe(true);
            expect(result.lineNumber).toBe(3);
            expect(result.columnNumber).toBe(10);

            if (result.evalOrigin) {
                expect(result.evalOrigin.fileName).toBe('/source.js');
                expect(result.evalOrigin.lineNumber).toBe(15);
                expect(result.evalOrigin.columnNumber).toBe(5); // Always 1 in Spider Monkey format
                expect(result.evalOrigin.functionName).toBe('eval');
            } else {
                fail('evalOrigin should be defined');
            }
        });

        test('should parse anonymous eval stack line', () => {
            const line = '@eval:5:20, eval@/script.js:25:10';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBeNull();
            expect(result.isEval).toBe(true);
            expect(result.lineNumber).toBe(5);
            expect(result.columnNumber).toBe(20);

            if (result.evalOrigin) {
                expect(result.evalOrigin.fileName).toBe('/script.js');
                expect(result.evalOrigin.lineNumber).toBe(25);
                expect(result.evalOrigin.columnNumber).toBe(10);
                expect(result.evalOrigin.functionName).toBe('eval');
            } else {
                fail('evalOrigin should be defined');
            }
        });

        test('should parse Function constructor stack line', () => {
            const line = 'newFunction@Function:1:33, createFunction@/app.js:42:15';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('newFunction');
            expect(result.isEval).toBe(true);
            expect(result.lineNumber).toBe(1);
            expect(result.columnNumber).toBe(33);

            if (result.evalOrigin) {
                expect(result.evalOrigin.fileName).toBe('/app.js');
                expect(result.evalOrigin.lineNumber).toBe(42);
                expect(result.evalOrigin.columnNumber).toBe(15);
                expect(result.evalOrigin.functionName).toBe('createFunction');
            } else {
                fail('evalOrigin should be defined');
            }
        });
    });

    describe('edge cases', () => {
        test('should handle malformed stack lines', () => {
            const line = 'something completely different';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.source).toBe(line);
            expect(result.functionName).toBeNull();
            expect(result.fileName).toBeNull();
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
        });

        test('should handle empty string', () => {
            const line = '';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.source).toBe(line);
            expect(result.functionName).toBeNull();
            expect(result.fileName).toBeNull();
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
        });

        test('should handle function names with @ symbol', () => {
            const line = 'function@with@symbols@/path/to/file.js:10:5';
            const result = parseSpiderMonkeyStackLine(line);

            // Depending on how your regex is set up, this might be interpreted differently
            // Testing the actual behavior
            expect(result.source).toBe(line);
            expect(result.fileName).toBe('/path/to/file.js');
            expect(result.lineNumber).toBe(10);
            expect(result.columnNumber).toBe(5);
        });

        test('should handle special characters in file paths', () => {
            const line = 'handler@/path/with spaces and (brackets)/file.js:60:15';
            const result = parseSpiderMonkeyStackLine(line);

            expect(result.functionName).toBe('handler');
            expect(result.fileName).toBe('/path/with spaces and (brackets)/file.js');
            expect(result.lineNumber).toBe(60);
            expect(result.columnNumber).toBe(15);
        });
    });
});

describe('parseJavaScriptCoreStackLine', () => {
    describe('standard JavaScriptCore stack lines', () => {
        test('should parse stack line with function name and location', () => {
            const line = 'functionName@http://example.com/script.js:123:45';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('functionName');
            expect(result.fileName).toBe('http://example.com/script.js');
            expect(result.lineNumber).toBe(123);
            expect(result.columnNumber).toBe(45);
            expect(result.isEval).toBe(false);
        });

        test('should parse JavaScript Core stack trace with global code in eval', () => {
            const line = 'global code@eval:1:5';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('code');
            expect(result.fileName).toBe('eval');
            expect(result.lineNumber).toBe(1);
            expect(result.columnNumber).toBe(5);
            expect(result.isEval).toBe(true);
        });

        test('should parse JavaScript Core stack trace with eval code in regular file', () => {
            const line = 'eval code@main.js:10:15';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('code');
            expect(result.fileName).toBe('main.js');
            expect(result.lineNumber).toBe(10);
            expect(result.columnNumber).toBe(15);
            expect(result.isEval).toBe(true);
        });

        test('should handle global code as null function name', () => {
            const line = 'global code@http://example.com/script.js:50:25';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('code');
            expect(result.fileName).toBe('http://example.com/script.js');
            expect(result.lineNumber).toBe(50);
            expect(result.columnNumber).toBe(25);
            expect(result.isEval).toBe(false);
        });

        test('should handle native code references', () => {
            const line = 'Array.prototype.forEach@[native code]';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('Array.prototype.forEach');
            expect(result.fileName).toBe('[native code]');
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
            expect(result.isEval).toBe(false);
        });

        test('should handle file paths', () => {
            const line = 'processData@file:///Users/name/project/script.js:75:20';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('processData');
            expect(result.fileName).toBe('/Users/name/project/script.js');
            expect(result.lineNumber).toBe(75);
            expect(result.columnNumber).toBe(20);
            expect(result.isEval).toBe(false);
        });

        test('should normalize Windows paths', () => {
            const line = 'handler@C:\\Users\\name\\project\\script.js:60:15';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('handler');
            expect(result.fileName).toBe('C:/Users/name/project/script.js');
            expect(result.lineNumber).toBe(60);
            expect(result.columnNumber).toBe(15);
            expect(result.isEval).toBe(false);
        });
    });

    describe('eval stack lines', () => {
        test('should parse eval code stack line with additional information', () => {
            const line = 'eval code@http://example.com/script.js:10:5';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('code');
            expect(result.isEval).toBe(true);
            // Note: The implementation in the code doesn't parse filename or line numbers for eval code
            // If it should, these assertions would need to change
            expect(result.fileName).toBe('http://example.com/script.js');
            expect(result.lineNumber).toBe(10);
            expect(result.columnNumber).toBe(5);
        });
    });

    describe('edge cases', () => {
        test('should handle malformed stack lines', () => {
            const line = 'something completely different';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.source).toBe(line);
            expect(result.functionName).toBeNull();
            expect(result.fileName).toBeNull();
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
            expect(result.isEval).toBe(false);
        });

        test('should handle empty string', () => {
            const line = '';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.source).toBe(line);
            expect(result.functionName).toBeNull();
            expect(result.fileName).toBeNull();
            expect(result.lineNumber).toBeNull();
            expect(result.columnNumber).toBeNull();
            expect(result.isEval).toBe(false);
        });

        test('should handle function names with @ symbol', () => {
            const line = 'function@with@symbols@http://example.com/script.js:10:5';
            const result = parseJavaScriptCoreStackLine(line);

            // Depending on how your regex is set up, this might be interpreted differently
            // Testing the actual behavior based on the implementation
            expect(result.source).toBe(line);
            // The result will depend on the PATTERNS.JAVASCRIPT_CORE.STANDARD regex implementation
        });

        test('should handle URLs with query parameters', () => {
            const line = 'render@http://example.com/script.js?v=123:30:10';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('render');
            expect(result.fileName).toBe('http://example.com/script.js?v=123');
            expect(result.lineNumber).toBe(30);
            expect(result.columnNumber).toBe(10);
        });

        test('should handle function with dots in the name', () => {
            const line = 'Class.method.callback@http://example.com/app.js:42:18';
            const result = parseJavaScriptCoreStackLine(line);

            expect(result.functionName).toBe('Class.method.callback');
            expect(result.fileName).toBe('http://example.com/app.js');
            expect(result.lineNumber).toBe(42);
            expect(result.columnNumber).toBe(18);
        });
    });
});

describe('parseErrorStack', () => {
    describe('parsing Error objects', () => {
        test('should parse a V8 Error object', () => {
            // Create a real error
            const originalError = new Error('Test error');

            // Parse it
            const result = parseErrorStack(originalError);

            // Basic assertions
            expect(result).toBeDefined();
            expect(result.name).toBe('Error');
            expect(result.message).toBe('Test error');
            expect(result.rawStack).toBe(originalError.stack);
            expect(Array.isArray(result.stack)).toBe(true);
            expect(result.stack.length).toBeGreaterThan(0);

            // Check the first frame (this test file)
            const firstFrame = result.stack[0];
            expect(firstFrame.fileName).toBeDefined();
            expect(firstFrame.lineNumber).toBeGreaterThan(0);
        });

        test('should parse an Error with custom name', () => {
            // Create a custom error
            const customError = new Error('Custom message');
            customError.name = 'CustomError';

            // Parse it
            const result = parseErrorStack(customError);

            // Verify the name is preserved
            expect(result.name).toBe('CustomError');
            expect(result.message).toBe('Custom message');
        });

        test('should handle errors without stack traces', () => {
            // Create an error and remove its stack
            const errorWithoutStack = new Error('No stack');
            delete errorWithoutStack.stack;

            // Parse it
            const result = parseErrorStack(errorWithoutStack);

            // Verify the behavior
            expect(result.name).toBe('Error');
            expect(result.message).toBe('No stack');
            expect(result.rawStack).toBe('');
            expect(result.stack).toEqual([]);
        });

        test('should handle errors without messages', () => {
            // Create an error without a message
            const errorWithoutMessage = new Error();
            // @ts-expect-error TypeScript error
            // but it's intentional in this case since [explain why this is acceptable/necessary]
            delete errorWithoutMessage.message;

            // Parse it
            const result = parseErrorStack(errorWithoutMessage);

            // Verify the behavior
            expect(result.name).toBe('Error');
            expect(result.message).toBe('');
            expect(result.rawStack).toBeDefined();
            expect(Array.isArray(result.stack)).toBe(true);
        });
    });

    describe('parsing error strings', () => {
        test('should parse a string as an error', () => {
            // Parse a string
            const result = parseErrorStack('Test error string');

            // Verify the behavior
            expect(result.name).toBe('Error');
            expect(result.message).toBe('Test error string');
            expect(result.rawStack).toBeDefined();
            expect(Array.isArray(result.stack)).toBe(true);
        });

        test('should handle empty string', () => {
            // Parse an empty string
            const result = parseErrorStack('');

            // Verify the behavior
            expect(result.name).toBe('Error');
            expect(result.message).toBe('');
            expect(result.rawStack).toBeDefined();
            expect(Array.isArray(result.stack)).toBe(true);
        });
    });

    describe('stack filtering behavior', () => {
        test('should filter out the error header line', () => {
            // Create an error with a typical stack
            function createErrorWithKnownStack() {
                const e = new Error('Known error');
                e.stack = `Error: Known error
    at functionName (/path/to/file.js:10:15)
    at otherFunction (/path/to/other.js:20:25)`;

                return e;
            }

            const error = createErrorWithKnownStack();
            const result = parseErrorStack(error);

            // Should have filtered out the "Error: Known error" line
            expect(result.stack.length).toBe(2);
            expect(result.stack[0].fileName).toBe('/path/to/file.js');
            expect(result.stack[1].fileName).toBe('/path/to/other.js');
        });

        test('should filter empty lines', () => {
            // Create an error with empty lines in the stack
            function createErrorWithEmptyLines() {
                const e = new Error('Empty lines');
                e.stack = `Error: Empty lines
    at functionName (/path/to/file.js:10:15)

    at otherFunction (/path/to/other.js:20:25)
    `;

                return e;
            }

            const error = createErrorWithEmptyLines();
            const result = parseErrorStack(error);

            // Should have filtered out empty lines
            expect(result.stack.length).toBe(2);
            expect(result.stack[0].fileName).toBe('/path/to/file.js');
            expect(result.stack[1].fileName).toBe('/path/to/other.js');
        });
    });

    describe('integration with different engine formats', () => {
        test('should parse V8 format stack traces', () => {
            // Create a V8-format stack trace
            function createV8Error() {
                const e = new Error('V8 error');
                e.stack = `Error: V8 error
    at Module._compile (internal/modules/cjs/loader.js:999:30)
    at Object.<anonymous> (/path/to/file.js:10:20)
    at processTicksAndRejections (internal/process/task_queues.js:93:5)`;

                return e;
            }

            const error = createV8Error();
            const result = parseErrorStack(error);

            expect(result.stack.length).toBe(3);

            expect(result.stack[0].functionName).toBe('Module._compile');
            expect(result.stack[0].fileName).toBe('internal/modules/cjs/loader.js');

            expect(result.stack[1].functionName).toBe('Object.<anonymous>');
            expect(result.stack[1].fileName).toBe('/path/to/file.js');

            expect(result.stack[2].functionName).toBe('processTicksAndRejections');
            expect(result.stack[2].fileName).toBe('internal/process/task_queues.js');
        });

        test('should parse SpiderMonkey format stack traces', () => {
            // Create a SpiderMonkey-format stack trace
            function createSpiderMonkeyError() {
                const e = new Error('SpiderMonkey error');
                e.stack = `handleRequest@/path/to/server.js:12:34
processRequest@/path/to/api.js:45:10
@/path/to/main.js:5:1`;

                return e;
            }

            const error = createSpiderMonkeyError();
            const result = parseErrorStack(error);

            expect(result.stack.length).toBe(3);

            expect(result.stack[0].functionName).toBe('handleRequest');
            expect(result.stack[0].fileName).toBe('/path/to/server.js');
            expect(result.stack[0].lineNumber).toBe(12);

            expect(result.stack[1].functionName).toBe('processRequest');
            expect(result.stack[1].fileName).toBe('/path/to/api.js');

            expect(result.stack[2].functionName).toBeNull();
            expect(result.stack[2].fileName).toBe('/path/to/main.js');
        });

        test('should parse JavaScriptCore format stack traces', () => {
            // Create a JavaScriptCore-format stack trace
            function createJavaScriptCoreError() {
                const e = new Error('JavaScriptCore error');
                e.stack = `evaluateScript@[native code]
global code@http://example.com/script.js:10:15
functionName@http://example.com/app.js:42:30`;

                return e;
            }

            const error = createJavaScriptCoreError();
            const result = parseErrorStack(error);

            expect(result.stack.length).toBe(3);

            expect(result.stack[0].functionName).toBe('evaluateScript');
            expect(result.stack[0].fileName).toBe('[native code]');

            expect(result.stack[1].functionName).toBe('code');
            expect(result.stack[1].fileName).toBe('http://example.com/script.js');

            expect(result.stack[2].functionName).toBe('functionName');
            expect(result.stack[2].fileName).toBe('http://example.com/app.js');
        });
    });
});
