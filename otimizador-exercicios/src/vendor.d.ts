// Este arquivo ajuda o TypeScript a entender módulos que são fornecidos pelo ambiente da Cloudflare.
declare module '@cf/sharp' {
	// Declarações simplificadas para satisfazer o compilador.
	// As implementações reais são fornecidas pelo runtime do Worker.
	export function init(source: ReadableStream): Promise<void>;
	export function sharp(options?: unknown): SharpInstance;

	interface SharpInstance {
		webp(options: { quality: number }): SharpInstance;
		toBuffer(): Promise<{ buffer: ArrayBuffer }>;
		// Adicione outros métodos do sharp conforme necessário.
	}
}