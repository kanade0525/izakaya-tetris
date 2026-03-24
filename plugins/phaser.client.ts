import Phaser from 'phaser'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      Phaser
    }
  }
})