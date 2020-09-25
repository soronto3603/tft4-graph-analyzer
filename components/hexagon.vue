<style lang="postcss" scoped>
.hexagon {
  position: relative;
  height: 55.2px;
  .logo {
    position: absolute;
    left: 0;
  }
}

</style>
<template>
  <div class="hexagon">
    <svg class="logo" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" fill-rule="evenodd" clip-rule="evenodd" :style="{ fill: color }">
      <path serif:id="shape 23" :d="path"/>
    </svg>
  </div>
</template>
<script>
export default {
  props: {
    color: String,
  },
  data() {
    return {
      size: 2.3,
    }
  },
  computed: {
    path() {
      return `M26-.001
      l${11 * this.size} ${6 * this.size}v${12 * this.size}
      l-${11 * this.size} ${6 * this.size}-${11 * this.size}-${6 * this.size}v-${12 * this.size}
      l${11 * this.size}-${6 * this.size}z`
    }
  }
}
</script>
