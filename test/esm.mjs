import process from 'node:process';
import test from 'ava';
import execa from 'execa';
import exitHook, {asyncExitHook} from '../dist/index.mjs';

test('main', async t => {
	const {stdout, stderr, exitCode} = await execa(process.execPath, ['./test/fixtures/sync.mjs']);
	t.is(stdout, 'foo\nbar128');
	t.is(stderr, '');
	t.is(exitCode, 0);
});

test('main-empty', async t => {
	const {stderr, exitCode} = await execa(process.execPath, ['./test/fixtures/empty.mjs']);
	t.is(stderr, '');
	t.is(exitCode, 0);
});

test('main-async', async t => {
	const {stdout, stderr, exitCode} = await execa(process.execPath, ['./test/fixtures/async.mjs']);
	t.is(stdout, 'foo\nbar0\nquux0');
	t.is(stderr, '');
	t.is(exitCode, 0);
});

test('main-async-notice', async t => {
	const {stdout, stderr, exitCode} = await execa(process.execPath, ['./test/fixtures/async.mjs'], {
		env: {
			EXIT_HOOK_SYNC: '1',
		},
	});
	t.is(stdout, 'foo\nbar128');
	t.regex(stderr, /SYNCHRONOUS TERMINATION NOTICE/);
	t.is(exitCode, 0);
});

test('listener count', t => {
	t.is(process.listenerCount('exit'), 0);

	const unsubscribe1 = exitHook(() => {});
	const unsubscribe2 = exitHook(() => {});
	t.is(process.listenerCount('exit'), 1);

	// Remove all listeners
	unsubscribe1();
	unsubscribe2();
	t.is(process.listenerCount('exit'), 1);

	// Re-add listener
	const unsubscribe3 = exitHook(() => {});
	t.is(process.listenerCount('exit'), 1);

	// Remove again
	unsubscribe3();
	t.is(process.listenerCount('exit'), 1);

	// Add async style listener
	const unsubscribe4 = asyncExitHook(
		async () => {},
		{
			minimumWait: 100,
		},
	);
	t.is(process.listenerCount('exit'), 1);

	// Remove again
	unsubscribe4();
	t.is(process.listenerCount('exit'), 1);
});

test('type enforcing', t => {
	// Non-function passed to `exitHook`.
	t.throws(() => {
		// @ts-expect-error - testing type enforcement
		exitHook(null);
	}, {instanceOf: TypeError});

	// Non-function passed to `asyncExitHook`.
	t.throws(() => {
		// @ts-expect-error - testing type enforcement
		asyncExitHook(null, {
			minimumWait: 100,
		});
	}, {
		instanceOf: TypeError,
	});

	// Non-numeric passed to `minimumWait` option.
	t.throws(() => {
		// @ts-expect-error - testing type enforcement
		asyncExitHook(async () => true, {});
	});
});
