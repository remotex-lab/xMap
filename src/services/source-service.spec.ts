/**
 * Import will remove at compile time
 */

import type { PositionInterface, SourceMapInterface } from '@services/interfaces/source-service.interface';

/**
 * Imports
 */

import { SourceService } from '@services/source.service';
import { Bias } from '@providers/interfaces/mapping-provider.interface';

describe('SourceService', () => {
    describe('constructor', () => {

        test('should validate the source map', () => {
            const invalidSourceMap: any = {}; // Invalid object

            expect(() => new SourceService(invalidSourceMap)).toThrowError(
                'Missing required keys in SourceMap.'
            );
        });

        test('should assign empty arrays for missing optional properties', () => {
            const sourceMap: any = {
                version: 3,
                mappings: 'AAAA',
                names: null,
                sources: null,
                sourcesContent: null
            };

            const service: any = new SourceService(sourceMap);

            expect(service.names).toEqual([]);
            expect(service.sources).toEqual([]);
            expect(service.mappings).toEqual({
                'mapping': [
                    [
                        {
                            'line': 1,
                            'column': 1,
                            'nameIndex': null,
                            'sourceIndex': 0,
                            'generatedLine': 1,
                            'generatedColumn': 1
                        }
                    ]
                ]
            });
            expect(service.sourcesContent).toEqual([]);
        });

        test('should assign properties from valid source map', () => {
            const sourceMap: SourceMapInterface = {
                version: 3,
                names: [ 'name1', 'name2' ],
                sources: [ 'source1.js', 'source2.js' ],
                mappings: 'AAAA',
                sourcesContent: [ '// content 1', '// content 2' ]
            };

            const service: any = new SourceService(sourceMap);

            expect(service.names).toEqual(sourceMap.names);
            expect(service.sources).toEqual(sourceMap.sources);
            expect(service.sourcesContent).toEqual(sourceMap.sourcesContent);
        });
    });

    describe('decodeMappings', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should throw an error if decoding fails', () => {
            expect(() => {
                const sourceMap: SourceMapInterface = {
                    version: 3,
                    names: [],
                    sources: [],
                    sourcesContent: [],
                    mappings: 'AAAA,CAAC;AACA\n\r\d;;AACA'
                };

                new SourceService(sourceMap);
            }).toThrow(/Invalid Mappings string format: the provided string does not conform to expected VLQ format./);
        });
    });

    describe('getSourcePosition', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should return source code in right position of and error', () => {
            const sourceMap: SourceMapInterface = {
                'version': 3,
                'sources': [ 'src/x.spec.ts' ],
                'sourcesContent': [ 'function name(data: string) {\n    console.log(\'name\' + data);\n    throw new Error(\'xxxxxxxxxx\');\n}\n\nname(\'x\');\n' ],
                'mappings': ';;;AAAA,SAAS,KAAK,MAAc;AACxB,UAAQ,IAAI,SAAS,IAAI;AACzB,QAAM,IAAI,MAAM,YAAY;AAChC;AAEA,KAAK,GAAG;',
                'names': []
            };

            const service = new SourceService(sourceMap);
            const mockGetSegment = jest.spyOn(service.mappings, 'getOriginalSegment');
            const position = service.getPositionByOriginal(3, 11, 'x.spec.ts');

            expect(mockGetSegment).toHaveBeenCalledWith(3, 11, 0, Bias.BOUND);
            expect(position).toEqual({
                line: 3,
                column: 11,
                name: null,
                source: 'src/x.spec.ts',
                sourceRoot: null,
                sourceIndex: 0,
                generatedLine: 6,
                generatedColumn: 9
            });
        });

        test('should return source code for source line and column of an error', () => {
            const sourceMap: SourceMapInterface = {
                'version': 3,
                'sources': [ 'src/x.spec.ts' ],
                'sourcesContent': [ 'function name(data: string) {\n    console.log(\'name\' + data);\n    throw new Error(\'xxxxxxxxxx\');\n}\n\nname(\'x\');\n' ],
                'mappings': ';;;AAAA,SAAS,KAAK,MAAc;AACxB,UAAQ,IAAI,SAAS,IAAI;AACzB,QAAM,IAAI,MAAM,YAAY;AAChC;AAEA,KAAK,GAAG;',
                'names': []
            };

            const service = new SourceService(sourceMap);
            const mockGetSegment = jest.spyOn(service.mappings, 'getSegment');
            const position = service.getPositionWithCode(5, 1, 0, {});

            expect(mockGetSegment).toHaveBeenCalledWith(5, 1, 0);
            expect(position?.code.trim()).toContain('throw new Error(\'xxxxxxxxxx\')');
            expect(position).toEqual({
                code: expect.any(String),
                line: 2,
                column: 5,
                endLine: 6,
                startLine: 0,
                name: null,
                source: 'src/x.spec.ts',
                sourceRoot: null,
                sourceIndex: 0,
                generatedLine: 5,
                generatedColumn: 1
            });
        });

        test('should return null if no mapping is found', () => {
            const sourceMap: SourceMapInterface = {
                version: 3,
                names: [],
                sources: [],
                sourcesContent: [],
                mappings: 'AAAA,CAAC;AACA;;AACA'
            };

            const service = new SourceService(sourceMap);
            const mockGetSegment = jest.spyOn(service.mappings, 'getSegment');
            const position = service.getPositionWithContent(10, 5);

            expect(position).toBeNull();
            expect(mockGetSegment).toHaveBeenCalledWith(10, 5, Bias.BOUND);
        });
    });

    describe('getPosition', () => {
        afterEach(() => {
            jest.resetAllMocks();
            jest.restoreAllMocks();
        });

        let mockSourceMap;
        let sourceService: SourceService;

        beforeEach(() => {
            mockSourceMap = {
                version: 3,
                names: [ 'name1', 'name2' ],
                sources: [ 'source1.js', 'source2.js' ],
                mappings: 'AAAA;AACA;AACA',
                sourcesContent: [ 'console.log("source1");', 'console.log("source2");' ]
            };
            sourceService = new SourceService(mockSourceMap);
        });

        test('should return null if no mapping is found', () => {
            const position = sourceService.getPosition(99, 99);

            expect(position).toBeNull();
        });

        test('should use specified bias when provided', () => {
            const retrieveMappingSpy = jest.spyOn(sourceService.mappings, 'getSegment').mockReturnValue({
                line: 1,
                column: 2,
                nameIndex: 0,
                sourceIndex: 0,
                generatedLine: 1,
                generatedColumn: 2
            });

            const position = sourceService.getPosition(1, 2, Bias.UPPER_BOUND);

            expect(retrieveMappingSpy).toHaveBeenCalledWith(1, 2, Bias.UPPER_BOUND);
            expect(position).toEqual<PositionInterface>({
                line: 1,
                column: 2,
                name: 'name1',
                source: 'source1.js',
                sourceRoot: null,
                sourceIndex: 0,
                generatedLine: 1,
                generatedColumn: 2
            });
        });


        test('should use specified bias when provided with original line and column', () => {
            const retrieveMappingSpy = jest.spyOn(sourceService.mappings, 'getSegment').mockReturnValue({
                line: 1,
                column: 2,
                nameIndex: 0,
                sourceIndex: 0,
                generatedLine: 1,
                generatedColumn: 2
            });

            const position = sourceService.getPosition(1, 2, Bias.LOWER_BOUND);

            expect(retrieveMappingSpy).toHaveBeenCalledWith(1, 2, Bias.LOWER_BOUND);
            expect(position).toEqual<PositionInterface>({
                line: 1,
                column: 2,
                name: 'name1',
                source: 'source1.js',
                sourceRoot: null,
                sourceIndex: 0,
                generatedLine: 1,
                generatedColumn: 2
            });
        });
    });

    describe('concat', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should merge multiple source maps into the current source map object', () => {
            const sourceMap1: SourceMapInterface = {
                version: 3,
                names: [ 'name1' ],
                sources: [ 'source1.js' ],
                sourcesContent: [ 'console.log("source1");' ],
                mappings: 'AAAA'
            };

            const sourceMap2: SourceMapInterface = {
                version: 3,
                names: [ 'name2' ],
                sources: [ 'source2.js' ],
                sourcesContent: [ 'console.log("source2");' ],
                mappings: 'AAAA,AAAA'
            };

            const sourceService = new SourceService(sourceMap1);
            sourceService.concat(sourceMap2);

            // Check if the names, sources, and sourcesContent have been correctly concatenated
            expect(sourceService['names']).toEqual([ 'name1', 'name2' ]);
            expect(sourceService['sources']).toEqual([ 'source1.js', 'source2.js' ]);
            expect(sourceService['sourcesContent']).toEqual([ 'console.log("source1");', 'console.log("source2");' ]);
            expect(sourceService.mappings.encode()).toEqual('AAAA;ACAA,AAAA');
        });

        test('should merge multiple source maps into new source map object', () => {
            const sourceMap1: SourceMapInterface = {
                version: 3,
                names: [ 'name1' ],
                sources: [ 'source1.js' ],
                sourcesContent: [ 'console.log("source1");' ],
                mappings: 'AAAA'
            };

            const sourceMap2: SourceMapInterface = {
                version: 3,
                names: [ 'name2' ],
                sources: [ 'source2.js' ],
                sourcesContent: [ 'console.log("source2");' ],
                mappings: 'AAAA,AAAA'
            };

            const sourceService = new SourceService(sourceMap1);
            const res = sourceService.concatNewMap(sourceMap2);

            // Check if the names, sources, and sourcesContent have been correctly concatenated
            expect(res['names']).toEqual([ 'name1', 'name2' ]);
            expect(res['sources']).toEqual([ 'source1.js', 'source2.js' ]);
            expect(res['sourcesContent']).toEqual([ 'console.log("source1");', 'console.log("source2");' ]);
            expect(res.mappings.encode()).toEqual('AAAA;ACAA,AAAA');
        });

        test('should throw an error if no source maps are provided', () => {
            const sourceMap: SourceMapInterface = {
                version: 3,
                names: [],
                sources: [],
                sourcesContent: [],
                mappings: 'AAAA'
            };

            const sourceService = new SourceService(sourceMap);

            // Check if the method throws an error when called without arguments
            expect(() => sourceService.concat()).toThrow('At least one map must be provided for concatenation.');
            expect(() => sourceService.concatNewMap()).toThrow('At least one map must be provided for concatenation.');
        });

        test('should merge multiple source maps into the current source map object2', () => {
            const map1 = {
                version: 3,
                sources: [ 'src/testx.ts' ],
                sourcesContent: [
                    '\n' +
                    '\n' +
                    'function ts() {\n' +
                    '    console.log(\'ts\');\n' +
                    '}\n' +
                    '\n' +
                    'function name22(data: string) {\n' +
                    '    console.log(\'name\' + data);\n' +
                    '}\n' +
                    '\n' +
                    'ts();\n' +
                    'name22(\'x\');\n'
                ],
                mappings: ';;;AAAO,IAAO,IAAI',
                names: []
            };

            const map2 = {
                version: 3,
                sources: [ 'src/x.spec.ts' ],
                sourcesContent: [
                    'function name(data: string) {\n' +
                    '    console.log(\'name\' + data);\n' +
                    '    throw new Error(\'xxxxxxxxxx\');\n' +
                    '}\n' +
                    '\n' +
                    'name(\'x\');\n'
                ],
                mappings: ';;;AAAA;AAAA;AAAA;AAAA;AAAA;AAAO,IAAO,IAAI;',
                names: []
            };

            const sourceService = new SourceService(map1);
            sourceService.concat(map2);

            expect(sourceService.toString()).toBe(
                // eslint-disable-next-line max-len
                '{"version":3,"names":[],"sources":["src/testx.ts","src/x.spec.ts"],"mappings":";;;AAAO,IAAO,IAAI;;;;ACAlB;AAAA;AAAA;AAAA;AAAA;AAAO,IAAO,IAAI;","sourcesContent":["\\n\\nfunction ts() {\\n    console.log(\'ts\');\\n}\\n\\nfunction name22(data: string) {\\n    console.log(\'name\' + data);\\n}\\n\\nts();\\nname22(\'x\');\\n","function name(data: string) {\\n    console.log(\'name\' + data);\\n    throw new Error(\'xxxxxxxxxx\');\\n}\\n\\nname(\'x\');\\n"]}'
            );
        });
    });

    describe('getMapObject', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should return a SourceMapInterface object', () => {
            const mapOriginalObject = {
                version: 3,
                sources: [ 'src/testx.ts' ],
                sourcesContent: [
                    '\n' +
                    '\n' +
                    'function ts() {\n' +
                    '    console.log(\'ts\');\n' +
                    '}\n' +
                    '\n' +
                    'function name22(data: string) {\n' +
                    '    console.log(\'name\' + data);\n' +
                    '}\n' +
                    '\n' +
                    'ts();\n' +
                    'name22(\'x\');\n'
                ],
                mappings: ';;;AAEA,SAAS,KAAK;AACV,UAAQ,IAAI,IAAI;AACpB;AAEA,SAAS,OAAO,MAAc;AAC1B,UAAQ,IAAI,SAAS,IAAI;AAC7B;AAEA,GAAG;AACH,OAAO,GAAG;',
                names: []
            };

            const service = new SourceService(mapOriginalObject);
            const mapObject = service.getMapObject();

            expect(mapObject).toEqual(mapOriginalObject);
        });

        test('should return a SourceMapInterface object with file and sourceRoot', () => {
            const mapOriginalObject = {
                version: 3,
                file: 'bundle.js',
                sources: [ 'src/testx.ts' ],
                sourcesContent: [ '\n' ],
                mappings: ';;;AAEA,SAAS,KAAK;',
                names: [],
                sourceRoot: 'test'
            };

            const service = new SourceService(mapOriginalObject);
            const mapObject = service.getMapObject();

            expect(mapObject).toEqual(mapOriginalObject);
        });
    });
});
