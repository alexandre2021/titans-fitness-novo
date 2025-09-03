// Caminho: /otimizador-exercicios/src/types.d.ts

declare global {
  interface R2Bucket {
    get(key: string): Promise<R2Object | null>;
    put(key: string, value: ArrayBuffer | Uint8Array, options?: R2PutOptions): Promise<R2Object>;
    delete(key: string): Promise<void>;
  }

  interface R2Object {
    arrayBuffer(): Promise<ArrayBuffer>;
    httpMetadata?: {
      contentType?: string;
    };
  }

  interface R2PutOptions {
    httpMetadata?: {
      contentType?: string;
    };
  }
}

export {};