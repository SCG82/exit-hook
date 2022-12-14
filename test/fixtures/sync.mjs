import process from 'node:process';
import exitHook from '../../dist/index.mjs';

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

process.exit(0); // eslint-disable-line unicorn/no-process-exit
