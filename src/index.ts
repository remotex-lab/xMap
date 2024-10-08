// export components interfaces
import { MappingProvider } from './providers/mapping.provider';

export type * from '@components/interfaces/parse.interface';
export type * from '@components/interfaces/formatter.interface';
export type * from '@components/interfaces/highlighter.interface';

// export services interfaces
export type * from '@services/interfaces/source.interface';

// Export components
export * from '@components/parser.component';
export * from '@components/base64.component';
export * from '@components/formatter.component';
export * from '@components/highlighter.component';

// export service
export * from '@services/source.service';

const x = new MappingProvider(";;;AAAA,QAAQ,IAAI,GAAG;;;");
const y = x.concat([ new MappingProvider(";;;AAAA,QAAQ,IAAI,GAAG;;;") ]);
console.log(y);
console.log(y.toString());
