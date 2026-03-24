export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Izakaya Tetris',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'Mobile-friendly Tetris game' }
      ]
    }
  },
  vite: {
    optimizeDeps: {
      include: ['phaser']
    }
  }
})