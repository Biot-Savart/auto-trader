<template>
  <div class="box">
    <h1 class="title is-4 mb-4">Portfolio Value Over Time</h1>

    <div class="field is-grouped mb-4">
      <div class="control">
        <label class="label">From</label>
        <input v-model="from" class="input" type="date" />
      </div>

      <div class="control">
        <label class="label">To</label>
        <input v-model="to" class="input" type="date" />
      </div>
    </div>

    <v-chart
      v-if="chartOptions"
      ref="chartRef"
      :option="chartOptions"
      style="height: 600px; width: 100%"
    />
    <div v-else class="notification is-warning">
      No portfolio data available for selected range.
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';

// Add a type for $socket to avoid TypeScript errors
import type { Socket } from 'socket.io-client';
const chartRef = ref();
const { $socket } = useNuxtApp() as unknown as { $socket: Socket };

const VChart = defineAsyncComponent(() => import('vue-echarts'));

const from = ref('');
const to = ref('');
const timelineData = ref<any[]>([]);
const filteredData = ref<any[]>([]);
const chartOptions = ref(null);
let chartDom: HTMLElement | null = null;

const fetchTimeline = async () => {
  try {
    const { data } = await axios.get(
      'http://localhost:3002/api/balances/portfolio'
    );
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

    return (
      (!fromDate || timestamp >= fromDate) && (!toDate || timestamp <= toDate)
    );
  });

  updateChartOptions();

  setTimeout(() => {
    const ec = chartRef.value?.chart;
    if (!ec) {
      return;
    }
    // Get the underlying chart DOM element
    chartDom = ec.getDom?.();
    if (chartDom) {
      chartDom.addEventListener('dblclick', handleDoubleClick);
    }
  }, 1000); // ⏱️ Delay 1 second after mount
};

const handleDoubleClick = () => {
  const ec = chartRef.value?.chart;
  if (!ec) return;

  ec.dispatchAction({
    type: 'dataZoom',
    start: 0,
    end: 100,
  });
};

const updateChartOptions = () => {
  if (!filteredData.value.length) {
    chartOptions.value = null;
    return;
  }

  const totalValueUSDTLine = filteredData.value.map((t) => [
    new Date(t.timestamp).getTime(),
    parseFloat(t.totalValueUSDT),
  ]);

  chartOptions.value = {
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['Portfolio Value'],
    },
    xAxis: {
      type: 'time',
      name: 'Time',
      axisLabel: {
        formatter: (value: number) => new Date(value).toLocaleTimeString(),
      },
    },
    yAxis: {
      type: 'value',
      name: 'Total Value (USDT)',
      axisLine: { show: true },
      min: 'dataMin', // avoids zero-padding
    },
    series: [
      {
        name: 'Portfolio Value',
        type: 'line',
        data: totalValueUSDTLine,
        smooth: true,
        areaStyle: {},
        yAxisIndex: 0,
      },
    ],
    dataZoom: [
      {
        type: 'slider', // Bottom slider
        show: true,
        realtime: true,
        start: 0, // Start and end define visible window %
        end: 100,
        xAxisIndex: 0,
      },
      {
        type: 'inside', // Enables mouse wheel + drag zooming
        realtime: true,
        xAxisIndex: 0,
      },
    ],
  };
};

watch([from, to], applyFilters);
onMounted(async () => {
  fetchTimeline();

  $socket.on('newPortfolioBalance', (balance) => {
    console.log('New Portfolio balance received:', balance);
    timelineData.value.push(balance);
    applyFilters();
  });
});

onUnmounted(() => {
  if (chartDom) {
    chartDom.removeEventListener('dblclick', handleDoubleClick);
  }
  $socket.off('newPortfolioBalance');
});
</script>
