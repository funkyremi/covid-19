import App from './App.svelte';

// The following lines fix the buffer/global issues with external libs
window.global = window
import { Buffer as buf } from 'buffer';
global.Buffer = global.Buffer || buf

const app = new App({
	target: document.body,
	props: {}
});

export default app;