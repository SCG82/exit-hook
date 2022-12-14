import process from 'node:process';
import exitHook, {asyncExitHook, gracefulExit} from '../../dist/index.mjs';

exitHook(() => {
	console.log('foo');
});

exitHook(code => {
	console.log(`bar${code}`);
});

const unsubscribe = exitHook(() => {
	console.log('baz');
});

unsubscribe();

asyncExitHook(
	async code => {
		await new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, 100);
		});

		console.log(`quux${code}`);
	},
	{
		minimumWait: 200,
	},
);

if (process.env.EXIT_HOOK_SYNC === '1') {
	process.exit(0); // eslint-disable-line unicorn/no-process-exit
}

gracefulExit();
