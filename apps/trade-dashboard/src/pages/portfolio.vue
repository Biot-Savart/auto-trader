<template>
  <div class="box">
    <h1 class="title is-4 mb-4">
      Portfolio Value Over Time
    </h1>

    <div class="field is-grouped mb-4">
      <div class="control">
        <label class="label">From</label>
        <input
          v-model="from"
          class="input"
          type="date"
        >
      </div>

      <div class="control">
        <label class="label">To</label>
        <input
          v-model="to"
          class="input"
          type="date"
        >
      </div>
    </div>

    <ClientOnly>
      <v-chart
        v-if="chartOptions"
        :option="chartOptions"
        style="height: 600px; width: 100%"
      />
      <div
        v-else
        class="notification is-warning"
      >
        No portfolio data available for selected range.
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';

// Add a type for $socket to avoid TypeScript errors
import type { Socket } from 'socket.io-client';
const { $socket } = useNuxtApp() as unknown as { $socket: Socket };

const VChart = defineAsyncComponent(() => import('vue-echarts'));

const from = ref('');
const to = ref('');
const timelineData = ref<any[]>([]);
const filteredData = ref<any[]>([]);
const chartOptions = ref(null);

const fetchTimeline = async () => {
  try {
    const { data } = await axios.get('http://localhost:3002/api/balances/portfolio');
    timelineData.value = data || [];
    applyFilters();
  } catch (error) {
    console.error('Error fetching portfolio timeline:', error);
    timelineData.value = [];
    filteredData.value = [];
    chartOptions.value = null;
  }
};

const applyFilters = () => {
  if (!timelineData.value.length) {
    filteredData.value = [];
    chartOptions.value = null;
    return;
  }

  filteredData.value = timelineData.value.filter((entry) => {
    const timestamp = new Date(entry.timestamp);
    const fromDate = from.value ? new Date(from.value) : null;
    const toDate = to.value ? new Date(to.value) : null;

    return (!fromDate || timestamp >= fromDate) && (!toDate || timestamp <= toDate);
  });

  updateChartOptions();
};

const updateChartOptions = () => {
  if (!filteredData.value.length) {
    chartOptions.value = null;
    return;
  }

  chartOptions.value = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: filteredData.value.map((t) => new Date(t.timestamp).toLocaleString()),
    },
    yAxis: {
      type: 'value',
      name: 'Total Value (USDT)',
    },
    series: [
      {
        name: 'Portfolio Value',
        type: 'line',
        data: filteredData.value.map((t) => parseFloat(t.totalValueUSDT)),
        smooth: true,
        areaStyle: {},
      },
    ],
  };
};

watch([from, to], applyFilters);
onMounted(() => {
  fetchTimeline();

  $socket.on('newPortfolioBalance', (balance) => {
    console.log('New Portfolio balance received:', balance);
    timelineData.value.push(balance);
    applyFilters();
  });
});

onUnmounted(() => {
  $socket.off('newPortfolioBalance')
})
</script>
