import { defineConfig, mergeConfig } from 'vite';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      // formatDate等、実行環境のローカルタイムゾーンに依存するテストの結果が環境によって
      // ぶれないよう固定する。このアプリの対象ユーザーは日本時間（JST）想定のため、
      // 開発者のローカル環境（JST）とCI（既定はUTC）の双方でAsia/Tokyoに揃える
      env: {
        TZ: 'Asia/Tokyo',
      },
    },
  }),
);
