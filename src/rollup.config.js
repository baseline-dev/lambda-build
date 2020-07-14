import {terser} from 'rollup-plugin-terser';
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from '@rollup/plugin-json';

export default {
  output: {
    format: 'cjs'
  },
  external: ['aws-sdk', 'node-gyp', 'fsevents'],
  plugins: [ 
    json(),
    terser({
      output: {
        beautify: true
      },
    }),
    commonjs({
      include: [ 'node_modules/**' ],
      sourceMap: false
    }),
    nodeResolve({
      jsnext: true,
      main: false
    })
  ]
};