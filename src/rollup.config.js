import {terser} from 'rollup-plugin-terser';
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from '@rollup/plugin-json';
import visualizer from 'rollup-plugin-visualizer';
import inject from '@rollup/plugin-inject';

export default {
  output: {
    format: 'cjs'
  },
  external: ['aws-sdk', 'node-gyp', 'fsevents'],
  plugins: [ 
    visualizer({
      open: false
    }),
    json(),
    terser({
      output: {
        beautify: false,
      },
    }),
    commonjs({
      include: [ 'node_modules/**' ],
      sourceMap: false
    }),
    nodeResolve({
      jsnext: true,
      main: false
    }),
    inject({
      BaselineError: ['@baseline-dev/reporter', 'BaselineError'],
      BaselineSuccess: ['@baseline-dev/reporter', 'BaselineSuccess']
    })
  ]
};