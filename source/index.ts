import process from 'node:process';

export type AsyncCallback = (exitCode: number) => Promise<void>;
export type Callback = (exitCode: number) => void;
type AsyncCallbackConfig = [AsyncCallback, number];

const asyncCallbacks = new Set<AsyncCallbackConfig>();
const callbacks = new Set<Callback>();

let isCalled = false;
let isRegistered = false;

async function exit(shouldManuallyExit: boolean, isSynchronous: boolean, signal: number) {
	if (isCalled) {
		return;
	}

	isCalled = true;

	if (asyncCallbacks.size > 0 && isSynchronous) {
		console.error([
			'SYNCHRONOUS TERMINATION NOTICE:',
			'When explicitly exiting the process via process.exit or via a parent process,',
			'asynchronous tasks in your exitHooks will not run. Either remove these tasks,',
			'use gracefulExit() instead of process.exit(), or ensure your parent process',
			'sends a SIGINT to the process running this code.',
		].join(' '));
	}

	const exitCode = 128 + signal;

	const done = (force = false) => {
		if (force || shouldManuallyExit) {
			process.exit(exitCode); // eslint-disable-line unicorn/no-process-exit
		}
	};

	for (const callback of callbacks) {
		callback(exitCode);
	}

	if (isSynchronous) {
		done();
		return;
	}

	const promises = [];
	let forceAfter = 0;
	for (const [callback, wait] of asyncCallbacks) {
		forceAfter = Math.max(forceAfter, wait);
		promises.push(Promise.resolve(callback(exitCode)));
	}

	// Force exit if we exceeded our wait value
	const asyncTimer = setTimeout(() => {
		done(true);
	}, forceAfter);

	await Promise.all(promises);
	clearTimeout(asyncTimer);
	done();
}

type AddHookOptions = {
	isSynchronous: boolean;
	minimumWait?: number;
	onExit: Callback | AsyncCallback;
};

function addHook(options: AddHookOptions) {
	const {onExit, minimumWait, isSynchronous} = options;
	const asyncCallbackConfig: AsyncCallbackConfig = [(onExit as AsyncCallback), minimumWait!];

	if (isSynchronous) {
		callbacks.add(onExit as Callback);
	} else {
		asyncCallbacks.add(asyncCallbackConfig);
	}

	if (!isRegistered) {
		isRegistered = true;

		// Exit cases that support asynchronous handling
		process.once('beforeExit', exit.bind(undefined, true, false, -128));
		process.once('SIGINT', exit.bind(undefined, true, false, 2));
		process.once('SIGTERM', exit.bind(undefined, true, false, 15));

		// Explicit exit events. Calling will force an immediate exit and run all
		// synchronous hooks. Explicit exits must not extend the node process
		// artificially. Will log errors if asynchronous calls exist.
		process.once('exit', exit.bind(undefined, false, true, 0));

		// PM2 Cluster shutdown message. Caught to support async handlers with pm2,
		// needed because explicitly calling process.exit() doesn't trigger the
		// beforeExit event, and the exit event cannot support async handlers,
		// since the event loop is never called after it.
		process.on('message', message => {
			if (message === 'shutdown') {
				void exit(true, true, -128);
			}
		});
	}

	return () => {
		if (isSynchronous) {
			callbacks.delete(onExit as Callback);
		} else {
			asyncCallbacks.delete(asyncCallbackConfig);
		}
	};
}

export default function exitHook(onExit: Callback) {
	if (typeof onExit !== 'function') {
		throw new TypeError('onExit must be a function');
	}

	return addHook({
		onExit,
		isSynchronous: true,
	});
}

export type Options = {
	/**
	 * The amount of time in milliseconds that the `onExit` function is expected to take.
	 * @default 500
	 */
	minimumWait?: number;
};

const defaultOptions: Options = {
	minimumWait: 500,
};

export function asyncExitHook(onExit: AsyncCallback, minimumWait?: number): () => void;
export function asyncExitHook(onExit: AsyncCallback, options?: Options): () => void;
export function asyncExitHook(onExit: AsyncCallback, options?: number | Options) {
	if (typeof onExit !== 'function') {
		throw new TypeError('onExit must be a function');
	}

	const minimumWait = resolveMinimumWait(options);

	return addHook({
		onExit,
		minimumWait,
		isSynchronous: false,
	});
}

export function gracefulExit(signal = 0) {
	void exit(true, false, -128 + signal);
}

function validateMinimumWait(value: unknown) {
	if (typeof value !== 'number' || value <= 0) {
		throw new TypeError('minimumWait must be set to a positive numeric value');
	}

	return value;
}

function resolveMinimumWait(options: number | Options = defaultOptions) {
	if (typeof options === 'number') {
		return validateMinimumWait(options);
	}

	if (typeof options === 'object' && options !== null) {
		const {minimumWait} = {...defaultOptions, ...options};
		return validateMinimumWait(minimumWait);
	}

	throw new TypeError('minimumWait must be set to a positive numeric value');
}
