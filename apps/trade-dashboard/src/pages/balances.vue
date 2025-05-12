<template>
  <div class="box">
    <h1 class="title is-4 mb-4">
      Balance History
    </h1>
    <div class="field is-grouped mb-4">
      <div class="control">
        <label class="label">Symbol</label>
        <div class="select">
          <select v-model="asset">
            <option value="">
              All
            </option>
            <option value="USDT">
              USDT
            </option>
            <option value="BTC">
              BTC
            </option>
            <option value="ETH">
              ETH
            </option>
            <option value="LTC">
              LTC
            </option>
            <option value="XRP">
              XRP
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

// Add a type for $socket to avoid TypeScript errors
import type { Socket } from 'socket.io-client';
const { $socket } = useNuxtApp() as unknown as { $socket: Socket };

const VChart = defineAsyncComponent(() => import('vue-echarts'));

const asset = ref('');
const from = ref('');
const to = ref('');
const balanceData = ref([]);
const chartOptions = ref(null);

const fetchTrades = async () => {
  const params: Record<string, string> = {};
  if (asset.value) params.asset = asset.value;
  if (from.value) params.from = from.value;
  if (to.value) params.to = to.value;

  try {
    const { data } = await axios.get('http://localhost:3002/api/balances', { params });
    balanceData.value = data || [];
    updateChartOptions();
  } catch (error) {
    console.error('Error fetching trades:', error);
    balanceData.value = [];
    chartOptions.value = null;
  }
};

const updateChartOptions = () => {
  if (!balanceData.value.length) {
    chartOptions.value = null;
    return;
  }

  chartOptions.value = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: balanceData.value.map((t: any) => new Date(t.timestamp).toLocaleString()),
    },
    yAxis: [
      {
        type: 'value',
        name: 'Amount'
      },
      {
        type: 'value',
        name: 'USDT'
      }
    ],
    series: [
      {
        name: 'Total',
        type: 'line',
        data: balanceData.value.map((t: any) => parseFloat(t.total)),
        smooth: true,
        areaStyle: {},
        yAxisIndex: 0
      },
      {
        name: 'Free',
        type: 'line',
        data: balanceData.value.map((t: any) => parseFloat(t.free)),
        smooth: true,
        areaStyle: {},
        yAxisIndex: 0
      },
      {
        name: 'USDT',
        type: 'line',
        data: balanceData.value.map((t: any) => parseFloat(t.usdtValue)),
        smooth: true,
        areaStyle: {},
        yAxisIndex: 1
      }
    ],
  };
};

watch([asset, from, to], fetchTrades);
onMounted(() => {
  fetchTrades()

  $socket.on('newBalance', (balance) => {
    console.log('New balance received:', balance);
    // Optionally filter based on current filters
    if (
      (!asset.value || balance.asset === asset.value) &&
      (!from.value || new Date(balance.timestamp) >= new Date(from.value)) &&
      (!to.value || new Date(balance.timestamp) <= new Date(to.value))
    ) {
      balanceData.value.push(balance)
    }
  })
})

onUnmounted(() => {
  $socket.off('newBalance')
})
</script>

<style scoped>
</style>
