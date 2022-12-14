import {expectType} from 'tsd';
import exitHook, {asyncExitHook} from '../source/index.js';

const unsubscribe = exitHook((exitCode: number) => {
	console.log('exitCode', exitCode);
});

const asyncUnsubscribe = asyncExitHook(
	async (exitCode: number) =>
		new Promise(resolve => {
			setTimeout(() => {
				console.log('exitCode', exitCode);
				resolve();
			}, 100);
		}),
	{
		minimumWait: 300,
	},
);

expectType<() => void>(unsubscribe);
unsubscribe();

expectType<() => void>(asyncUnsubscribe);
asyncUnsubscribe();
