import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',timeout:90000,expect:{timeout:20000},workers:1,use:{baseURL:process.env.SOPRO_TEST_URL||'http://127.0.0.1:4173',viewport:{width:1440,height:1000},launchOptions:{args:['--no-sandbox']},screenshot:'only-on-failure'},reporter:[['list'],['html',{outputFolder:'test-report',open:'never'}]]});
