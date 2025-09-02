/**
 * Bem-vindo ao Worker `otimizador-exercicios`!
 * Este código é executado na infraestrutura da Cloudflare e é acionado
 * sempre que um novo arquivo é enviado para a pasta `originais/` do nosso bucket R2.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// A interface para o objeto R2 que aciona o worker
interface R2Object {
	key: string; // Ex: "originais/exercicio_123.mp4"
	size: number;
}

// Definição do ambiente (configurado no painel da Cloudflare via wrangler.toml e secrets)
export interface Env {
	EXERCICIOS_PT_BUCKET: R2Bucket;
	SUPABASE_CALLBACK_URL: string; // URL para a função 'retorno_tratadas'
	R2_PUBLIC_URL: string; // URL pública do bucket R2
	CLOUDFLARE_WORKER_SECRET: string; // Segredo para autenticar a chamada de volta
}

export default {
	/**
	 * O método `object` é o coração do nosso Worker.
	 * Ele é acionado automaticamente pelo Cloudflare R2 quando um novo objeto é criado.
	 */
	async object(object: R2Object, env: Env): Promise<void> {
		console.log(`🚀 Worker 'otimizador-exercicios' acionado para o arquivo: ${object.key}`);

		// 1. Validar se o arquivo está na pasta correta para evitar loops infinitos.
		if (!object.key.startsWith('originais/')) {
			console.log(`🟡 Ignorando arquivo fora da pasta 'originais': ${object.key}`);
			return;
		}

		// 2. Obter o arquivo do bucket R2.
		const r2Object = await env.EXERCICIOS_PT_BUCKET.get(object.key);
		if (r2Object === null) {
			console.error(`❌ Arquivo não encontrado no R2: ${object.key}`);
			return;
		}

		const originalFilename = object.key.replace('originais/', '');
		const originalContentType = r2Object.httpMetadata?.contentType || 'application/octet-stream';

		let processedFileBuffer: ArrayBuffer;
		let finalFilename: string;
		let finalContentType: string;

		if (originalContentType.startsWith('image/')) {
			console.log('🖼️ Detectado tipo: Imagem. Iniciando otimização com Sharp...');
			// A otimização de imagem será feita pelo Cloudflare Image Resizing.
			// O Worker apenas move o arquivo para o destino final.
			console.log('🖼️ Detectado tipo: Imagem. Movendo para a pasta de destino.');
			processedFileBuffer = await r2Object.arrayBuffer();
			finalFilename = originalFilename;
			finalContentType = originalContentType;
		} else if (originalContentType.startsWith('video/')) {
			console.log('🎬 Detectado tipo: Vídeo. Iniciando otimização com FFmpeg...');
			const fileBuffer = await r2Object.arrayBuffer();

			const ffmpeg = new FFmpeg();
			// URL para os binários do FFmpeg. Usamos unpkg para facilitar.
			const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

			await ffmpeg.load({
				coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
				wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
			});

			// Escreve o arquivo no sistema de arquivos virtual do FFmpeg
			await ffmpeg.writeFile(originalFilename, new Uint8Array(fileBuffer));

			const outputFilename = originalFilename.replace(/\.[^/.]+$/, '') + '.mp4';

			// Executa o comando FFmpeg para otimizar o vídeo
			// -i: arquivo de entrada
			// -vf "scale=-2:360": redimensiona para 360p de altura, mantendo a proporção
			// -b:v 500k: bitrate de vídeo constante de 500kbps
			// -an: remove a faixa de áudio
			// -y: sobrescreve o arquivo de saída se existir
			await ffmpeg.exec(['-i', originalFilename, '-vf', 'scale=-2:360', '-b:v', '500k', '-an', '-y', outputFilename]);

			// Lê o arquivo processado de volta
			const data = await ffmpeg.readFile(outputFilename);
			processedFileBuffer = (data as Uint8Array).slice().buffer;
			finalFilename = outputFilename;
			finalContentType = 'video/mp4';
		} else {
			console.warn(`🟡 Tipo de arquivo não suportado para otimização: ${originalContentType}. O arquivo será copiado como está.`);
			processedFileBuffer = await r2Object.arrayBuffer();
			finalFilename = originalFilename;
			finalContentType = originalContentType;
		}

		try {
			// 3. Salvar o arquivo processado na pasta 'tratadas'.
			const finalPath = `tratadas/${finalFilename}`;
			await env.EXERCICIOS_PT_BUCKET.put(finalPath, processedFileBuffer, {
				httpMetadata: { contentType: finalContentType },
			});
			console.log(`✅ Arquivo processado salvo em: ${finalPath}`);

			// 4. Chamar a Edge Function 'retorno_tratadas' para atualizar o banco de dados.
			const publicUrl = `${env.R2_PUBLIC_URL}/${finalPath}`;
			const targetField = r2Object.customMetadata?.targetField;

			if (!targetField) {
				// Se o targetField não estiver nos metadados, o upload inicial falhou em algum ponto.
				throw new Error(`Metadado 'targetField' ausente no objeto R2: ${object.key}`);
			}

			const payload = { originalFilename, finalUrl: publicUrl, targetField };
			const response = await fetch(env.SUPABASE_CALLBACK_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Worker-Secret': env.CLOUDFLARE_WORKER_SECRET,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(`Falha ao chamar a função de retorno: ${await response.text()}`);
			}
			console.log('📞 Função de retorno notificada com sucesso.');

			// 5. Deletar o arquivo original da pasta 'originais'.
			await env.EXERCICIOS_PT_BUCKET.delete(object.key);
			console.log(`🗑️ Arquivo original deletado: ${object.key}`);
		} catch (error) {
			console.error(`💥 Erro fatal no processamento de ${object.key}:`, error);
			// Em um cenário de produção, poderíamos mover o arquivo para uma pasta 'erros/'
			// em vez de simplesmente logar o erro.
		}
	},
};
