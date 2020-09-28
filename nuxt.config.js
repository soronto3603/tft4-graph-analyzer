module.exports = {
  mode: 'universal',
  target: 'server',
  build: {
    postcss: {
      plugins: {
        'postcss-url': false,
        'postcss-nested': {},
        'postcss-responsive-type': {},
        'postcss-hexrgba': {}
      }
    },
    preset: {
      // Change the postcss-preset-env settings
      autoprefixer: {
        grid: true
      }
    }
  },
  buildModules: ['@nuxt/typescript-build'],
  plugins: [{ src: './plugins/ga.js', mode: 'client' }]
}