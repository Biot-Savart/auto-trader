<template>
  <div class="box">
    <h1 class="title is-4 mb-4">Trade History</h1>
    <div class="field is-grouped mb-4">
      <div class="control">
        <label class="label">Symbol</label>
        <div class="select">
          <select v-model="symbol">
            <!-- <option value="">
              All
            </option> -->
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="LTC/USDT">LTC/USDT</option>
            <option value="XRP/USDT">XRP/USDT</option>
            <option value="DOGE/USDT">DOGE/USDT</option>
            <option value="ADA/USDT">ADA/USDT</option>
          </select>
        </div>
      </div>

      <div class="control">
        <label class="label">From</label>
        <input v-model="from" class="input" type="date" />
      </div>

      <div class="control">
        <label class="label">To</label>
        <input v-model="to" class="input" type="date" />
      </div>
    </div>

    <ClientOnly>
      <v-chart
        v-if="chartOptions"
        :option="chartOptions"
        style="height: 600px; width: 100%"
      />
      <div v-else class="notification is-warning">No trade data available</div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';

import type { Socket } from 'socket.io-client';
const { $socket } = useNuxtApp() as unknown as { $socket: Socket };

const VChart = defineAsyncComponent(() => import('vue-echarts'));

const symbol = ref('BTC/USDT');
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
    const { data } = await axios.get('http://localhost:3002/api/trades', {
      params,
    });
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

  const buyPoints = tradeData.value
    .filter((t) => t.side === 'BUY')
    .map((t) => [
      new Date(t.timestamp).getTime(),
      parseFloat(t.amount),
      parseFloat(t.price) * parseFloat(t.amount), // volume
    ]);

  const sellPoints = tradeData.value
    .filter((t) => t.side === 'SELL')
    .map((t) => [
      new Date(t.timestamp).getTime(),
      parseFloat(t.amount),
      parseFloat(t.price) * parseFloat(t.amount),
    ]);

  const priceLine = tradeData.value.map((t) => [
    new Date(t.timestamp).getTime(),
    parseFloat(t.price),
  ]);

  chartOptions.value = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params) => {
        return params
          .map((p) => {
            const time = new Date(p.value[0]).toLocaleString();
            const label = p.seriesName;
            const value = p.value[1].toFixed(4);
            return `${label}<br/>${time} → ${value}`;
          })
          .join('<br/>');
      },
    },
    legend: {
      data: ['Price', 'Buy Amount', 'Sell Amount'],
    },
    xAxis: {
      type: 'time',
      name: 'Time',
      axisLabel: {
        formatter: (value: number) => new Date(value).toLocaleTimeString(),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Price',
        min: 'dataMin',
        axisLine: { show: true },
      },
      {
        type: 'value',
        name: 'Amount',
        min: 'dataMin',
        axisLine: { show: true },
      },
    ],
    series: [
      {
        name: 'Price',
        type: 'line',
        data: priceLine,
        yAxisIndex: 0,
        smooth: true,
        areaStyle: {},
      },
      {
        name: 'Buy Amount',
        type: 'scatter',
        data: buyPoints,
        yAxisIndex: 1,
        symbolSize: (val) => Math.max(6, Math.sqrt(val[2])),
        itemStyle: {
          color: '#4caf50',
        },
      },
      {
        name: 'Sell Amount',
        type: 'scatter',
        data: sellPoints,
        yAxisIndex: 1,
        symbolSize: (val) => Math.max(6, Math.sqrt(val[2])),
        itemStyle: {
          color: '#f44336',
        },
      },
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

<style scoped></style>
