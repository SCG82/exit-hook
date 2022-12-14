import {expectType} from 'tsd';
import exitHook, {asyncExitHook} from '../source/index.js';

const unsubscribe = exitHook((exitCode: number) => {
	if (typeof exitCode !== 'number') {
		throw new TypeError('Expected exitCode to be a number');
	}
});

const asyncUnsubscribe = asyncExitHook(async (exitCode: number) => {
	if (typeof exitCode !== 'number') {
		throw new TypeError('Expected exitCode to be a number');
	}
},
{
	minimumWait: 300,
});

expectType<() => void>(unsubscribe);
unsubscribe();

expectType<() => void>(asyncUnsubscribe);
asyncUnsubscribe();
