import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/main.css';
// Initialize Vue application
const app = createApp(App);
// Add plugins
app.use(createPinia());
// Mount the app
app.mount('#app');
