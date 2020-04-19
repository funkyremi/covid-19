import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import url from "@rollup/plugin-url";
import json from "rollup-plugin-json";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.js",
  external: ["moment"],
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
	file: "docs/build/bundle.js",
	globals: ['buffer']
  },
  external: ["buffer"],
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css: css => {
        css.write("docs/build/bundle.css");
      }
    }),
    url(),
    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ["svelte"]
    }),
    commonjs({
      include: /node_modules/,
      namedExports: {}
    }),
    json({
      // All JSON files will be parsed by default,
      // but you can also specifically include/exclude files
      include: "node_modules/**",
      // for tree-shaking, properties will be declared as
      // variables, using either `var` or `const`
      preferConst: true, // Default: false

      // specify indentation for the generated default export —
      // defaults to '\t'
      indent: "  ",

      // ignores indent and generates the smallest code
      compact: true, // Default: false

      // generate a named export for every property of the JSON object
      namedExports: true // Default: true
    }),
    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `docs` directory and refresh the
    // browser on changes when not in production
    !production && livereload("docs"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};

function serve() {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        require("child_process").spawn("npm", ["run", "start", "--", "--dev"], {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true
        });
      }
    }
  };
}
