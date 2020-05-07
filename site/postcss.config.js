const isProduction = !process.env.ROLLUP_WATCH

module.exports = {
  plugins: [
    require('postcss-preset-env'),
    require('postcss-import'),
    require('tailwindcss'),
    require('autoprefixer'),
    require('postcss-nested'),
    ...(isProduction ? [require('@fullhuman/postcss-purgecss')({
      content: [
        './src/**/*.html',
        './src/**/*.svelte'
      ],

      whitelistPatterns: [/svelte-/],

      defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || []
    })] : [])
  ]
}
