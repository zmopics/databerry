// // tailwind config is required for editor support

// import type { Config } from 'tailwindcss';

// import sharedConfig from '@chaindesk/tailwind-config';

// const config: Pick<Config, 'presets'> = {
//   presets: [sharedConfig],
// };

// export default config;

module.exports = {
  presets: [require('@chaindesk/tailwind-config')],
};
