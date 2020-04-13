import App from './App.svelte';
import { motifs, profileSchema } from './data';

const app = new App({
	target: document.body,
	props: {
		motifs,
		profileSchema,
	}
});

export default app;