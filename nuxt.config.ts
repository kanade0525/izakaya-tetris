export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'static'
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      title: '居酒屋ブロック落とし',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: '居酒屋で飲み食いしながら遊ぶターン制ブロックパズル。ストックを貯めてブロックを落とし、最終段を消せばクリア!' },
        { name: 'theme-color', content: '#1a1a2e' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { property: 'og:title', content: '居酒屋ブロック落とし' },
        { property: 'og:description', content: '居酒屋で飲み食いしながら遊ぶターン制ブロックパズル' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: '居酒屋ブロック落とし' },
        { name: 'twitter:description', content: '居酒屋で飲み食いしながら遊ぶターン制ブロックパズル' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
      ]
    }
  },
})
