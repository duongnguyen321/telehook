module.exports = {
	apps: [
		{
			name: 'bot',
			script: 'src/index.js',
			interpreter: 'bun',
			env: {
				TZ: 'Asia/Ho_Chi_Minh',
				NODE_ENV: 'production',
			},
		},
	],
};
