<template>
  <div class="box">
    <h1 class="title is-4 mb-4">
      Trade History
    </h1>
    <div class="field is-grouped mb-4">
      <div class="control">
        <label class="label">Symbol</label>
        <div class="select">
          <select v-model="symbol">
            <option value="">
              All
            </option>
            <option value="BTC/USDT">
              BTC/USDT
            </option>
            <option value="ETH/USDT">
              ETH/USDT
            </option>
            <option value="LTC/USDT">
              LTC/USDT
            </option>
            <option value="XRP/USDT">
              XRP/USDT
            </option>
          </select>
        </div>
      </div>

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
        No trade data available
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';

import type { Socket } from 'socket.io-client';
const { $socket } = useNuxtApp() as unknown as { $socket: Socket };

const VChart = defineAsyncComponent(() => import('vue-echarts'));

const symbol = ref('');
const from = ref('');
const to = ref('');
const tradeData = ref([]);
const chartOptions = ref(null);

const fetchTrades = async () => {
  const params: Record<string, string> = {};
  if (symbol.value) params.symbol = symbol.value;
  if (from.value) params.from = from.value;
  if (to.value) params.to = to.value;

  try {
    const { data } = await axios.get('http://localhost:3002/api/trades', { params });
    tradeData.value = data || [];
    updateChartOptions();
  } catch (error) {
    console.error('Error fetching trades:', error);
    tradeData.value = [];
    chartOptions.value = null;
  }
};

const updateChartOptions = () => {
  if (!tradeData.value.length) {
    chartOptions.value = null;
    return;
  }

  chartOptions.value = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: tradeData.value.map((t: any) => new Date(t.timestamp).toLocaleString()),
    },
    yAxis: [
      {
        type: 'value',
        name: 'Price'
      },
      {
        type: 'value',
        name: 'Amount'
      }
    ],
    series: [
      {
        name: 'Price',
        type: 'line',
        data: tradeData.value.map((t: any) => parseFloat(t.price)),
        smooth: true,
        areaStyle: {},
        yAxisIndex: 0
      },
      {
        name: 'Amount',
        type: 'line',
        data: tradeData.value.map((t: any) => parseFloat(t.amount)),
        smooth: true,
        areaStyle: {},
        yAxisIndex: 1
      }
    ],
  };
};

watch([symbol, from, to], fetchTrades);
onMounted(() => {
  fetchTrades();

  $socket.on('newTrade', (trade) => {
    console.log('New trade received:', trade);
    if (
      (!symbol.value || trade.symbol === symbol.value) &&
      (!from.value || new Date(trade.timestamp) >= new Date(from.value)) &&
      (!to.value || new Date(trade.timestamp) <= new Date(to.value))
    ) {
      tradeData.value.push(trade);
    }
  });
});

onUnmounted(() => {
  $socket.off('newTrade');
});
</script>

<style scoped>
</style>
