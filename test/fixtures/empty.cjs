const {default: exitHook} = require('../../dist/index.cjs');

exitHook(() => {
	// https://github.com/sindresorhus/exit-hook/issues/23
});
