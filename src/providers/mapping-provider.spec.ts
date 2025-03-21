/**
 * Import will remove at compile time
 */

import type { MapType, SegmentInterface, SegmentOffsetInterface } from './interfaces/mapping-provider.interface';

/**
 * Imports
 */

import { MappingProvider } from './mapping.provider';
import { Bias } from './interfaces/mapping-provider.interface';

describe('validateSegment', () => {
    let instance: MappingProvider;

    beforeEach(() => {
        instance = new MappingProvider([]);
    });

    test('should not throw an error for valid segment', () => {
        const validSegment: SegmentInterface = {
            line: 1,
            column: 2,
            nameIndex: null,
            sourceIndex: 0,
            generatedLine: 1,
            generatedColumn: 3
        };

        expect(() => instance.decode([[ validSegment ]], 0, 0)).not.toThrow();
    });

    test('should throw an error if line is not a finite number', () => {
        const invalidSegment = {
            line: Infinity,
            column: 2,
            nameIndex: null,
            sourceIndex: 0,
            generatedLine: 1,
            generatedColumn: 3
        };
        expect(() => instance.decode(<any> [[ invalidSegment ]], 0, 0)).toThrowError('Invalid segment: line must be a finite number, received Infinity');
    });

    test('should throw an error if column is not a finite number', () => {
        const invalidSegment = {
            line: 1,
            column: NaN,
            nameIndex: null,
            sourceIndex: 0,
            generatedLine: 1,
            generatedColumn: 3
        };
        expect(() => instance.decode(<any> [[ invalidSegment ]], 0, 0)).toThrowError('Invalid segment: column must be a finite number, received NaN');
    });

    test('should throw an error if nameIndex is not a finite number or null', () => {
        const invalidSegment = {
            line: 1,
            column: 2,
            nameIndex: undefined,
            sourceIndex: 0,
            generatedLine: 1,
            generatedColumn: 3
        };
        expect(() => instance.decode(<any> [[ invalidSegment ]], 0, 0))
            .toThrowError('Invalid segment: nameIndex must be a number or null, received undefined');
    });

    test('should throw an error if sourceIndex is not a finite number', () => {
        const invalidSegment = {
            line: 1,
            column: 2,
            nameIndex: null,
            sourceIndex: NaN,
            generatedLine: 1,
            generatedColumn: 3
        };
        expect(() => instance.decode(<any> [[ invalidSegment ]], 0, 0))
            .toThrowError('Invalid segment: sourceIndex must be a finite number, received NaN');
    });

    test('should throw an error if generatedLine is not a finite number', () => {
        const invalidSegment = {
            line: 1,
            column: 2,
            nameIndex: null,
            sourceIndex: 0,
            generatedLine: -Infinity,
            generatedColumn: 3
        };
        expect(() => instance.decode(<any> [[ invalidSegment ]], 0, 0))
            .toThrowError('Invalid segment: generatedLine must be a finite number, received -Infinity');
    });

    test('should throw an error if generatedColumn is not a finite number', () => {
        const invalidSegment = {
            line: 1,
            column: 2,
            nameIndex: null,
            sourceIndex: 0,
            generatedLine: 1,
            generatedColumn: null
        };
        expect(() => instance.decode(<any> [[ invalidSegment ]], 0, 0))
            .toThrowError('Invalid segment: generatedColumn must be a finite number, received null');
    });
});

describe('validateMappingString', () => {
    let instance: any;

    beforeEach(() => {
        instance = new MappingProvider([]);
    });

    test('should return true for a valid encoded source map', () => {
        const validMapping = 'AAAA;AACA;AADA;';
        expect(instance.validateMappingString(validMapping)).toBe(true);
    });

    test('should return true for a valid encoded source map with multiple mappings', () => {
        const validMapping = 'AAAA;AACA,AADA;AAGA;';
        expect(instance.validateMappingString(validMapping)).toBe(true);
    });

    test('should return true for a valid encoded source map with varying lengths', () => {
        const validMapping = 'AAAA;AA;AAA;AAAAAAA;';
        expect(instance.validateMappingString(validMapping)).toBe(true);
    });

    test('should return false for an empty string', () => {
        const invalidMapping = '';
        expect(instance.validateMappingString(invalidMapping)).toBe(false);
    });

    test('should return false for a mapping with invalid characters', () => {
        const invalidMapping = 'AAAA;A#A;AADA;';
        expect(instance.validateMappingString(invalidMapping)).toBe(false);
    });

    test('should return false for a mapping with multiple invalid segments', () => {
        const invalidMapping = 'AAAA;AADA;A#GA;';
        expect(instance.validateMappingString(invalidMapping)).toBe(false);
    });
});

describe('decodeMappingString', () => {
    let instance: any;
    const namesOffset = 0;
    const sourceOffset = 0;

    beforeEach(() => {
        instance = new MappingProvider([]);
    });

    test('should decode valid mapping string and populate mapping array', () => {
        const encodedMap = 'AAAA;AACA;AADA;';
        instance['decodeMappingString'](encodedMap, namesOffset, sourceOffset);

        expect(instance.mapping).toHaveLength(4);
        expect(instance.mapping[0]).toEqual(expect.any(Array));
        expect(instance.mapping[1]).toEqual(expect.any(Array));
        expect(instance.mapping[2]).toEqual(expect.any(Array));
        expect(instance.mapping[3]).toEqual(null);
    });

    test('should handle empty frames correctly', () => {
        const encodedMap = 'AAAA;;;AADA;';
        instance['decodeMappingString'](encodedMap, namesOffset, sourceOffset);

        expect(instance.mapping).toHaveLength(5);
        expect(instance.mapping[1]).toBeNull();
    });

    test('should throw an error for invalid mapping string format', () => {
        const invalidEncodedMap = 'INVALID_MAPPING_STRING';

        expect(() => {
            instance['decodeMappingString'](invalidEncodedMap, namesOffset, sourceOffset);
        }).toThrow('Invalid Mappings string format: the provided string does not conform to expected VLQ format.');
    });

    test('should throw an error when decoding fails', () => {
        const encodedMap = 'AAAA;AACA;AADA;';
        jest.spyOn(instance, 'decodedSegment').mockImplementationOnce(() => {
            throw new Error('Decoding error');
        });

        expect(() => {
            instance['decodeMappingString'](encodedMap, namesOffset, sourceOffset);
        }).toThrow('Error decoding mappings at frame index 4: Decoding error');
    });
});

describe('decodeMappingArray', () => {
    let instance: any;

    beforeEach(() => {
        instance = new MappingProvider([]);
        jest.spyOn(instance, <any> 'validateSegment');
    });

    test('should decode and push valid mapping array with offsets', () => {
        const encodedMap: MapType = [
            [
                { line: 1, column: 1, nameIndex: 1, sourceIndex: 2, generatedLine: 3, generatedColumn: 2 },
                { line: 1, column: 1, nameIndex: 4, sourceIndex: 5, generatedLine: 6, generatedColumn: 2 }
            ]
        ];
        const namesOffset = 2;
        const sourceOffset = 3;

        instance.decodeMappingArray(encodedMap, namesOffset, sourceOffset);
        expect(instance.mapping).toEqual([
            [
                { line: 1, column: 1, nameIndex: 3, sourceIndex: 5, generatedLine: 3, generatedColumn: 2 },
                { line: 1, column: 1, nameIndex: 6, sourceIndex: 8, generatedLine: 6, generatedColumn: 2 }
            ]
        ]);

        expect(instance.validateSegment).toHaveBeenCalledTimes(2);
    });

    test('should throw error for non-array encodedMap', () => {
        const invalidMap = {} as any;

        expect(() => {
            instance.decodeMappingArray(invalidMap, 0, 0);
        }).toThrow('Invalid encoded map: expected an array of frames.');
    });

    test('should throw error for non-array frame', () => {
        const encodedMap: MapType = [
            { someKey: 'invalid frame' } as any
        ];

        expect(() => {
            instance.decodeMappingArray(encodedMap, 0, 0);
        }).toThrow('Invalid Mappings array format at frame index 0: expected an array, received object.');
    });

    test('should handle null frames without errors', () => {
        const encodedMap: MapType = [ null ];
        instance.decodeMappingArray(encodedMap, 0, 0);
        expect(instance.mapping).toEqual([ null ]);
    });

    test('should throw error when segment is invalid', () => {
        jest.spyOn(instance, 'validateSegment').mockImplementation(() => {
            throw new Error('Invalid segment');
        });

        const encodedMap: MapType = <any> [
            [
                { nameIndex: 1, sourceIndex: 2, generatedLine: 3 }
            ]
        ];

        expect(() => {
            instance.decodeMappingArray(encodedMap, 0, 0);
        }).toThrow('Error decoding mappings: Invalid segment');
    });
});

describe('encodeMappings', () => {
    let instance: any;

    beforeEach(() => {
        instance = new MappingProvider([]);
        jest.spyOn(instance, 'initPositionOffsets').mockReturnValue({
            generatedColumn: 0
        });
        jest.spyOn(instance, 'encodeSegment');
    });

    test('should encode valid mapping array', () => {
        const map: MapType = <any> [
            [
                { generatedColumn: 1, sourceIndex: 2, generatedLine: 3 },
                { generatedColumn: 4, sourceIndex: 5, generatedLine: 6 }
            ],
            null,
            [
                { generatedColumn: 7, sourceIndex: 8, generatedLine: 9 }
            ]
        ];

        jest.spyOn(instance, 'encodeSegment').mockImplementation((positionOffset, segment: any) => {
            return `encoded(${ segment.generatedColumn },${ segment.sourceIndex })`;
        });

        const result = instance.encodeMappings(map);

        expect(result).toBe('encoded(1,2),encoded(4,5);;encoded(7,8)');
        expect(instance.initPositionOffsets).toHaveBeenCalledTimes(1);
        expect(instance.encodeSegment).toHaveBeenCalledTimes(3);
    });

    test('should handle empty or null frames', () => {
        const map: MapType = [
            null,
            []
        ];

        jest.spyOn(instance, 'encodeSegment').mockImplementation(() => 'encoded');
        const result = instance.encodeMappings(map);
        expect(result).toBe(';');
    });

    test('should handle single frame with single segment', () => {
        const map: MapType = <any> [
            [
                { generatedColumn: 1, sourceIndex: 2, generatedLine: 3 }
            ]
        ];

        jest.spyOn(instance, 'encodeSegment').mockImplementation((positionOffset, segment: any) => {
            return `encoded(${ segment.generatedColumn },${ segment.sourceIndex })`;
        });

        const result = instance.encodeMappings(map);
        expect(result).toBe('encoded(1,2)');
    });

    test('should handle frames with multiple segments', () => {
        const map: MapType = <any> [
            [
                { generatedColumn: 1, sourceIndex: 2, generatedLine: 3 },
                { generatedColumn: 4, sourceIndex: 5, generatedLine: 6 }
            ]
        ];

        jest.spyOn(instance, 'encodeSegment').mockImplementation((positionOffset, segment: any) => {
            return `encoded(${ segment.generatedColumn },${ segment.sourceIndex })`;
        });

        const result = instance.encodeMappings(map);
        expect(result).toBe('encoded(1,2),encoded(4,5)');
    });

    test('should reset positionOffset.generatedColumn for each frame', () => {
        const map: MapType = <any> [
            [
                { generatedColumn: 1, sourceIndex: 2, generatedLine: 3 }
            ],
            [
                { generatedColumn: 4, sourceIndex: 5, generatedLine: 6 }
            ]
        ];

        const positionOffsets = { generatedColumn: 0 };

        jest.spyOn(instance, 'encodeSegment').mockImplementation((positionOffset, segment: any) => {
            return `encoded(${ segment.generatedColumn },${ segment.sourceIndex })`;
        });

        const initPositionSpy = jest.spyOn(instance, 'initPositionOffsets').mockReturnValue(positionOffsets);
        instance.encodeMappings(map);

        expect(initPositionSpy).toHaveBeenCalledTimes(1);
        expect(positionOffsets.generatedColumn).toBe(0);
    });
});

describe('getSegment', () => {
    let instance: any;

    beforeEach(() => {
        instance = new MappingProvider([
            [
                { line: 1, column: 1, nameIndex: null, sourceIndex: 0, generatedLine: 1, generatedColumn: 1 },
                { line: 1, column: 3, nameIndex: null, sourceIndex: 1, generatedLine: 1, generatedColumn: 5 },
                { line: 1, column: 6, nameIndex: null, sourceIndex: 2, generatedLine: 1, generatedColumn: 10 }
            ],
            [
                { line: 1, column: 1, nameIndex: null, sourceIndex: 3, generatedLine: 2, generatedColumn: 3 },
                { line: 1, column: 9, nameIndex: null, sourceIndex: 4, generatedLine: 2, generatedColumn: 8 }
            ]
        ], 0, 0);
    });

    test('should return null when no segments exist for the line', () => {
        const result = instance.getSegment(3, 5);
        expect(result).toBeNull();
    });

    test('should return null when there are no segments for the given line', () => {
        instance.mapping[1] = [];
        const result = instance.getSegment(2, 5);
        expect(result).toBeNull();
    });

    test('should return exact segment when generatedColumn matches', () => {
        const result = instance.getSegment(1, 5);
        expect(result).toEqual({
            line: 1,
            column: 3,
            generatedColumn: 5,
            sourceIndex: 1,
            generatedLine: 1,
            nameIndex: null
        });
    });

    test('should return lower bound segment when bias is LOWER_BOUND', () => {
        const result = instance.getSegment(1, 7, Bias.LOWER_BOUND);
        expect(result).toEqual({
            line: 1,
            column: 3,
            generatedColumn: 5,
            sourceIndex: 1,
            generatedLine: 1,
            nameIndex: null
        });
    });

    test('should return upper bound segment when bias is UPPER_BOUND', () => {
        const result = instance.getSegment(1, 7, Bias.UPPER_BOUND);
        expect(result).toEqual({
            line: 1,
            column: 6,
            generatedColumn: 10,
            sourceIndex: 2,
            generatedLine: 1,
            nameIndex: null
        });
    });

    test('should return null when no matching segment found for lower bound', () => {
        const result = instance.getSegment(1, 0, Bias.LOWER_BOUND);
        expect(result).toBeNull();
    });

    test('should return null when no matching segment found for upper bound', () => {
        const result = instance.getSegment(1, 15, Bias.UPPER_BOUND);
        expect(result).toBeNull();
    });

    test('should handle segments with single entry', () => {
        instance.mapping[2] = [{ generatedColumn: 4, sourceIndex: 5, generatedLine: 3 }];
        const result = instance.getSegment(3, 4);
        expect(result).toEqual({ generatedColumn: 4, sourceIndex: 5, generatedLine: 3 });
    });

    test('should handle binary search correctly for closest segment', () => {
        const result = instance.getSegment(1, 6, Bias.LOWER_BOUND);
        expect(result).toEqual({
            line: 1,
            column: 3,
            generatedColumn: 5,
            sourceIndex: 1,
            generatedLine: 1,
            nameIndex: null
        });

        const upperResult = instance.getSegment(1, 6, Bias.UPPER_BOUND);
        expect(upperResult).toEqual({
            line: 1,
            column: 6,
            generatedColumn: 10,
            sourceIndex: 2,
            generatedLine: 1,
            nameIndex: null
        });
    });
});

describe('getOriginalSegment', () => {
    let instance: MappingProvider;

    beforeEach(() => {
        instance = new MappingProvider([
            [
                { column: 1, sourceIndex: 0, line: 1, generatedLine: 1, generatedColumn: 1, nameIndex: null },
                { column: 5, sourceIndex: 0, line: 1, generatedLine: 1, generatedColumn: 1, nameIndex: null },
                { column: 10, sourceIndex: 0, line: 1, generatedLine: 1, generatedColumn: 1, nameIndex: null }
            ],
            [
                { column: 2, sourceIndex: 1, line: 2, generatedLine: 1, generatedColumn: 1, nameIndex: null },
                { column: 6, sourceIndex: 1, line: 2, generatedLine: 1, generatedColumn: 1, nameIndex: null }
            ],
            [
                { column: 3, sourceIndex: 2, line: 3, generatedLine: 1, generatedColumn: 1, nameIndex: null },
                { column: 7, sourceIndex: 2, line: 3, generatedLine: 1, generatedColumn: 1, nameIndex: null }
            ]
        ]);
    });

    test('should return null when no segments exist for the sourceIndex and line', () => {
        const result = instance.getOriginalSegment(4, 5, 3);
        expect(result).toBeNull();
    });

    test('should return null when no segments exist for the given sourceIndex', () => {
        const result = instance.getOriginalSegment(1, 5, 2);
        expect(result).toBeNull();
    });

    test('should return exact match for column', () => {
        const result = instance.getOriginalSegment(1, 5, 0);
        expect(result).toEqual({
            generatedColumn: 1,
            generatedLine: 1,
            nameIndex: null,
            column: 5,
            sourceIndex: 0,
            line: 1
        });
    });

    test('should return lower bound segment when bias is LOWER_BOUND', () => {
        const result = instance.getOriginalSegment(1, 6, 0, Bias.LOWER_BOUND);
        expect(result).toEqual({
            generatedColumn: 1,
            generatedLine: 1,
            nameIndex: null,
            column: 5,
            sourceIndex: 0,
            line: 1
        });
    });

    test('should return upper bound segment when bias is UPPER_BOUND', () => {
        const result = instance.getOriginalSegment(1, 6, 0, Bias.UPPER_BOUND);
        expect(result).toEqual({
            generatedColumn: 1,
            generatedLine: 1,
            nameIndex: null,
            column: 10,
            sourceIndex: 0,
            line: 1
        });
    });

    test('should return null when no matching segment is found for lower bound', () => {
        const result = instance.getOriginalSegment(1, 0, 0, Bias.LOWER_BOUND);
        expect(result).toBeNull();
    });

    test('should return null when no matching segment is found for upper bound', () => {
        const result = instance.getOriginalSegment(1, 12, 0, Bias.UPPER_BOUND);
        expect(result).toBeNull();
    });

    test('should return closest segment for upper bound with single segment', () => {
        const result = instance.getOriginalSegment(2, 4, 1, Bias.UPPER_BOUND);
        expect(result).toEqual({
            generatedColumn: 1,
            generatedLine: 1,
            nameIndex: null,
            column: 6,
            sourceIndex: 1,
            line: 2
        });
    });

    test('should return closest segment for lower bound with single segment', () => {
        const result = instance.getOriginalSegment(3, 5, 2, Bias.LOWER_BOUND);
        expect(result).toEqual({
            generatedColumn: 1,
            generatedLine: 1,
            nameIndex: null,
            column: 3,
            sourceIndex: 2,
            line: 3
        });
    });
});

describe('encode', () => {
    let instance: any;

    beforeEach(() => {
        instance = new MappingProvider([]);
    });

    test('should return encoded mappings string', () => {
        const mockMapping = [
            [{ generatedColumn: 0, sourceIndex: 0, line: 1, column: 1, nameIndex: null }],
            [{ generatedColumn: 5, sourceIndex: 1, line: 2, column: 2, nameIndex: 0 }]
        ];

        instance.mapping = mockMapping;
        const encodedString = 'encodedString';
        jest.spyOn(instance, 'encodeMappings').mockReturnValue(encodedString);
        const result = instance.encode();

        expect(result).toBe(encodedString);
        expect(instance.encodeMappings).toHaveBeenCalledWith(mockMapping);
    });

    test('should return empty string for empty mapping', () => {
        instance.mapping = [];
        jest.spyOn(instance, 'encodeMappings');
        const result = instance.encode();

        expect(result).toBe('');
        expect(instance.encodeMappings).toHaveBeenCalledWith([]);
    });

    test('should handle null frames in mapping', () => {
        const mockMapping = [
            null,
            [{ generatedColumn: 3, sourceIndex: 1, line: 1, column: 1, nameIndex: null }]
        ];

        instance.mapping = mockMapping;
        const encodedString = 'encodedWithNull';
        jest.spyOn(instance, 'encodeMappings').mockReturnValue(encodedString);
        const result = instance.encode();

        expect(result).toBe(encodedString);
        expect(instance.encodeMappings).toHaveBeenCalledWith(mockMapping);
    });
});

describe('encodeSegment', () => {
    let instance: any;

    beforeEach(() => {
        instance = new MappingProvider([]);
    });

    test('should encode segment without nameIndex correctly', () => {
        const segmentOffset: SegmentOffsetInterface = {
            line: 1,
            column: 1,
            generatedColumn: 0,
            sourceIndex: 0,
            nameIndex: -1,
            generatedLine: 1
        };

        const segmentObject: SegmentInterface = {
            line: 2,
            column: 5,
            generatedColumn: 4,
            sourceIndex: 1,
            nameIndex: null,
            generatedLine: 1
        };

        const result = instance.encodeSegment(segmentOffset, segmentObject);

        expect(result).toBe('GCAG');
        expect(segmentOffset).toEqual({
            line: 1,
            column: 4,
            generatedColumn: 3,
            generatedLine: 1,
            sourceIndex: 1,
            nameIndex: -1
        });
    });

    test('should encode segment with nameIndex correctly', () => {
        const segmentOffset: SegmentOffsetInterface = {
            line: 2,
            column: 5,
            generatedColumn: 3,
            sourceIndex: 1,
            nameIndex: 0,
            generatedLine: 1
        };

        const segmentObject: SegmentInterface = {
            line: 3,
            column: 8,
            generatedColumn: 7,
            sourceIndex: 2,
            nameIndex: 1,
            generatedLine: 1
        };

        const result = instance.encodeSegment(segmentOffset, segmentObject);

        expect(result).toBe('GCAEC');
        expect(segmentOffset).toEqual({
            line: 2,
            column: 7,
            generatedColumn: 6,
            generatedLine: 1,
            sourceIndex: 2,
            nameIndex: 1
        });
    });

    test('should update offsets correctly even with zero differences', () => {
        const segmentOffset: SegmentOffsetInterface = {
            line: 3,
            column: 6,
            generatedColumn: 5,
            sourceIndex: 2,
            nameIndex: -1,
            generatedLine: 1
        };

        const segmentObject: SegmentInterface = {
            line: 4,
            column: 7,
            generatedColumn: 6,
            sourceIndex: 2,
            nameIndex: null,
            generatedLine: 1
        };
        const result = instance.encodeSegment(segmentOffset, segmentObject);

        expect(result).toBe('AAAA');
        expect(segmentOffset).toEqual({
            line: 3,
            column: 6,
            generatedColumn: 5,
            generatedLine: 1,
            sourceIndex: 2,
            nameIndex: -1
        });
    });

    test('should return correct encoded value when no sourceIndex difference', () => {
        const segmentOffset: SegmentOffsetInterface = {
            line: 1,
            column: 1,
            generatedColumn: 1,
            sourceIndex: 2,
            nameIndex: -1,
            generatedLine: 1
        };

        const segmentObject: SegmentInterface = {
            line: 1,
            column: 2,
            generatedColumn: 3,
            sourceIndex: 2,
            nameIndex: null,
            generatedLine: 1
        };
        const result = instance.encodeSegment(segmentOffset, segmentObject);

        expect(result).toBe('CADA');
        expect(segmentOffset).toEqual({
            line: 0,
            column: 1,
            generatedColumn: 2,
            generatedLine: 1,
            sourceIndex: 2,
            nameIndex: -1
        });
    });
});

describe('decode', () => {
    let instance: MappingProvider;

    beforeEach(() => {
        instance = new MappingProvider('AAAA');

        jest.spyOn(instance as any, 'decodeMappingArray').mockImplementation(() => {});
        jest.spyOn(instance as any, 'decodeMappingString').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should call decodeMappingArray when mapping is an array', () => {
        const mockMappingArray = [
            null,
            [{ line: 1, column: 1, nameIndex: null, sourceIndex: 0, generatedLine: 2, generatedColumn: 1 }],
            null
        ];

        instance.decode(mockMappingArray, 1, 2);
        expect(instance['decodeMappingArray']).toHaveBeenCalledWith(mockMappingArray, 1, 2);
        expect(instance['decodeMappingString']).not.toHaveBeenCalled();
    });

    test('should call decodeMappingString when mapping is a string', () => {
        const mockMappingString = ';;;AAiBO,SAAS,OAAO;AACnB,UAAQ,IAAI,MAAM;AACtB;;;ACjBA,QAAQ,IAAI,GAAG;AACf,KAAK;';
        instance.decode(mockMappingString, 1, 2);
        expect(instance['decodeMappingString']).toHaveBeenCalledWith(mockMappingString, 1, 2);
        expect(instance['decodeMappingArray']).not.toHaveBeenCalled();
    });

    test('should use default offsets if none are provided', () => {
        const mockMappingString = ';;;AAiBO,SAAS,OAAO;AACnB,UAAQ,IAAI,MAAM;AACtB;;;ACjBA,QAAQ,IAAI,GAAG;AACf,KAAK;';
        instance.decode(mockMappingString, 0, 0);
        expect(instance['decodeMappingString']).toHaveBeenCalledWith(mockMappingString, 0, 0);
    });
});
