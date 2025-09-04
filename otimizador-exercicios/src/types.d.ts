// Este arquivo genérico ensina ao TypeScript como lidar com qualquer import de arquivo .wasm
// Ele declara que qualquer import que termine em .wasm exportará um WebAssembly.Module por padrão.
// Isso resolve os erros "Cannot find module" no editor de código.
declare module '*.wasm' {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}