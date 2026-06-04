<template>
  <span class="sm-logo" :class="{ compact, animated }" aria-hidden="true">
    <svg viewBox="0 0 48 48" role="img">
      <defs>
        <linearGradient id="sm-logo-surface" x1="8" x2="40" y1="7" y2="42">
          <stop offset="0" stop-color="#172033" />
          <stop offset="1" stop-color="#020617" />
        </linearGradient>
        <linearGradient id="sm-logo-thread" x1="9" x2="39" y1="14" y2="35">
          <stop offset="0" stop-color="#5eead4" />
          <stop offset="0.48" stop-color="#ffffff" />
          <stop offset="1" stop-color="#93c5fd" />
        </linearGradient>
      </defs>
      <rect class="logo-frame" x="4.5" y="4.5" width="39" height="39" rx="11" />
      <path class="envelope" d="M12.5 17.2h23a2.8 2.8 0 0 1 2.8 2.8v12.2a2.8 2.8 0 0 1-2.8 2.8h-23a2.8 2.8 0 0 1-2.8-2.8V20a2.8 2.8 0 0 1 2.8-2.8Z" />
      <path class="fold" d="m11.4 19.3 11 8.3a2.7 2.7 0 0 0 3.2 0l11-8.3" />
      <path class="agent-line" d="M14.5 14.2c3.9-3.3 9.9-3.3 13.8 0 2.1 1.8 5.1 1.8 7.2 0" />
      <circle class="agent-dot dot-a" cx="14.4" cy="14.2" r="1.7" />
      <circle class="agent-dot dot-b" cx="35.6" cy="14.2" r="1.7" />
    </svg>
  </span>
</template>

<script setup>
defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  animated: {
    type: Boolean,
    default: true,
  },
});
</script>

<style scoped lang="scss">
.sm-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  filter: drop-shadow(0 10px 22px rgba(15, 23, 42, 0.16));
  flex: 0 0 auto;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
}

.sm-logo.compact {
  width: 34px;
  height: 34px;
  border-radius: 9px;
}

.logo-frame {
  fill: url("#sm-logo-surface");
  stroke: rgba(255, 255, 255, 0.16);
  stroke-width: 1;
}

.envelope {
  fill: rgba(255, 255, 255, 0.06);
  stroke: rgba(255, 255, 255, 0.82);
  stroke-width: 1.6;
}

.fold,
.agent-line {
  fill: none;
  stroke: url("#sm-logo-thread");
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fold {
  stroke-width: 1.6;
}

.agent-line {
  stroke-width: 1.8;
  stroke-dasharray: 34;
  stroke-dashoffset: 0;
}

.agent-dot {
  fill: #5eead4;
  transform-origin: center;
}

.dot-b {
  fill: #93c5fd;
}

.animated .agent-line {
  animation: logo-signal 2.8s ease-in-out infinite;
}

.animated .agent-dot {
  animation: logo-pulse 2.8s ease-in-out infinite;
}

.animated .dot-b {
  animation-delay: 0.28s;
}

@keyframes logo-signal {
  0%,
  100% {
    stroke-dashoffset: 34;
    opacity: 0.46;
  }
  42%,
  68% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@keyframes logo-pulse {
  0%,
  100% {
    transform: scale(0.82);
    opacity: 0.7;
  }
  48% {
    transform: scale(1.22);
    opacity: 1;
  }
}
</style>
