// apps/trade-dashboard/src/plugins/echarts.client.ts
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { defineNuxtPlugin } from 'nuxt/app';
import VueECharts from 'vue-echarts';
use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DatasetComponent,
  LegendComponent,
  BarChart,
  ScatterChart,
  DataZoomComponent,
]);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('v-chart', VueECharts);
});
