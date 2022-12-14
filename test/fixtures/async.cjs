const process = require('node:process');
const {asyncExitHook, default: exitHook, gracefulExit} = require('../../dist/index.cjs');

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

asyncExitHook(
	async () => {
		await new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, 500);
		});
		console.log('wut');
	},
	200,
);

asyncExitHook(
	async () => {
		await new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, 100);
		});
		console.log('quz');
	},
	200,
);

if (process.env.EXIT_HOOK_SYNC === '1') {
	process.exit(0); // eslint-disable-line unicorn/no-process-exit
}

gracefulExit();
