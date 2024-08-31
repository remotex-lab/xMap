// Bitmask to extract the lower 5 bits (continuation bit removed) - 0b11111
const CONTINUATION_BIT_REMOVE = 0x1F;

// Bitmask to set the continuation bit - 0b100000
const CONTINUATION_BIT_POSITION = 0x20;

// Mapping of Base64 characters to their indices
const base64Map: { [key: string]: number } = {};

// Array of Base64 characters
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

// Populate the base64Map with characters and their corresponding indices
base64Chars.forEach((char, index) => {
    base64Map[char] = index;
});

/**
 * Encodes a given number using Variable-Length Quantity (VLQ) encoding.
 * Negative numbers are encoded by converting to a non-negative representation.
 * The continuation bit is used to indicate if more bytes follow.
 *
 * @param value - The number to be encoded.
 * @returns The VLQ encoded string.
 */

export function encodeVLQ(value: number): string {
    const isNegative = value < 0;

    /**
     * Bit Structure Representation:
     *
     * +--------------------------+
     * | C |   Value       | Sign |
     * +---+---+---+---+---+------+
     * | 1 | 1 | 0 | 0 | 1 |   0  |
     * +---+---+---+---+---+------+
     */

    let encoded = '';
    let vlq = isNegative ? ((-value) << 1) + 1 : (value << 1); // Shift left by 1 bit to encode the sign bit

    do {
        const digit = vlq & CONTINUATION_BIT_REMOVE; // Extract lower 5 bits
        vlq >>>= 5; // Right shift by 5 bits to process next chunk
        encoded += base64Chars[digit | (vlq > 0 ? CONTINUATION_BIT_POSITION : 0)]; // Combine digit and continuation bit
    } while (vlq > 0);

    return encoded;
}

/**
 * Encodes an array of numbers using VLQ encoding.
 * Each number in the array is individually encoded and the results are concatenated.
 *
 * @param values - The array of numbers to be encoded.
 * @returns The concatenated VLQ encoded string.
 */

export function encodeArrayVLQ(values: number[]): string {
    return values.map(encodeVLQ).join('');
}

/**
 * Decodes a VLQ encoded string back into an array of numbers.
 * Each character is decoded using the Base64 map and continuation bits are processed.
 *
 * @param data - The VLQ encoded string.
 * @returns The array of decoded numbers.
 * @throws Error If the string contains invalid Base64 characters.
 */

export function decodeVLQ(data: string): number[] {
    const result = [];
    let shift = 0;
    let value = 0;

    for (let i = 0; i < data.length; i++) {
        const digit = base64Map[data[i]];
        if (digit === undefined) {
            throw new Error(`Invalid Base64 character: ${data[i]}`);
        }

        const continuation = digit & CONTINUATION_BIT_POSITION; // Check if continuation bit is set
        value += (digit & CONTINUATION_BIT_REMOVE) << shift; // Add lower 5 bits to value
        if (continuation) {
            shift += 5; // Shift left by 5 for next chunk
        } else {
            const isNegative = (value & 1) === 1; // Check if the number is negative
            const shifted = value >> 1; // Remove the sign bit

            result.push(isNegative ? -shifted : shifted); // Convert back to signed integer
            value = shift = 0; // Reset for next number
        }
    }

    return result;
}
