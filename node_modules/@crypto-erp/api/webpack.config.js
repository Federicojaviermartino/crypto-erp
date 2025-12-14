const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function(options) {
  return {
    ...options,
    entry: ['./src/main.ts'],
    externals: [
      nodeExternals({
        allowlist: ['@crypto-erp/database'],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@crypto-erp/database': path.resolve(__dirname, '../../libs/database/src/index.ts'),
      },
    },
    output: {
      ...options.output,
      path: path.resolve(__dirname, 'dist'),
    },
  };
};
