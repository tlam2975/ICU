import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        story: fileURLToPath(new URL('./index.html', import.meta.url)),
        music: fileURLToPath(new URL('./music/index.html', import.meta.url))
      }
    }
  }
});
