import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import tsconfigPathsPluginModule from '@esbuild-plugins/tsconfig-paths';


const tsconfigPathsPlugin =
  tsconfigPathsPluginModule.tsconfigPathsPlugin ||
  tsconfigPathsPluginModule.default ||
  tsconfigPathsPluginModule;

const buildWithDefaults = (entryPoints, outdir, format = 'esm') => {
  return esbuild.build({
    entryPoints,
    outdir,
    platform: 'node',
    format,
    bundle: true,
    sourcemap: true,
    plugins: [
      nodeExternalsPlugin(),
      tsconfigPathsPlugin({ tsconfig: './tsconfig.json' }),
    ],
    minify: false,
  });
};

(async () => {
  try {
    await buildWithDefaults(['src/index.ts'], 'dist');
    await buildWithDefaults(
      ['src/workers/accountWorker.ts', 'src/workers/notificationWorker.ts'],
      'dist/workers'
    );
    await buildWithDefaults(['src/seed/seedFeature.ts'], 'dist/seed');
  } catch (err) {
    process.exit(1);
  }
})();
