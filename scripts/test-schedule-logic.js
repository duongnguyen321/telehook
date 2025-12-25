// Mock timezone utils
function createGMT7Time(year, month, day, hour) {
	const d = new Date(Date.UTC(year, month - 1, day, hour - 7));
	return d;
}

function toGMT7(date) {
	return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

// Slots definition (copied from storage.js)
const WEEKDAY_SLOTS = [
	[11, 30],
	[12, 15],
	[17, 30],
	[19, 45],
	[20, 30],
	[21, 15],
	[22, 0],
	[22, 45],
	[23, 45],
];

const SATURDAY_SLOTS = [
	[11, 30],
	[12, 15],
	[16, 0],
	[17, 30],
	[21, 15],
	[22, 0],
	[22, 45],
	[23, 45],
];

const SUNDAY_SLOTS = [
	[1, 0],
	[9, 0],
	[10, 0],
	[11, 30],
	[12, 15],
	[17, 30],
	[19, 45],
	[20, 30],
	[21, 15],
	[22, 0],
	[22, 45],
];

function getSlotsForDate(date) {
	const gmt7Date = toGMT7(date);
	const day = gmt7Date.getDay(); // 0 is Sunday, 6 is Saturday
	console.log(`DEBUG: Date ${date.toISOString()} -> GMT7 Day ${day}`);
	if (day === 0) return SUNDAY_SLOTS;
	if (day === 6) return SATURDAY_SLOTS;
	return WEEKDAY_SLOTS;
}

// Logic Simulation
function simulateSchedule(startDate, count) {
	console.log(
		`\n--- Simulating Schedule starting from ${startDate.toISOString()} ---`
	);
	console.log(`(Start Date in GMT+7: ${toGMT7(startDate).toISOString()})`);

	let currentDate = new Date(startDate);
	// Assumption: Simulate rescheduling from 'currentDate'
	// Logic similar to rescheduleAllPending

	const nowGmt7 = toGMT7(new Date()); // use actual now for comparison if needed, but here we just iterate

	// Setup loop state
	let slots = getSlotsForDate(currentDate);
	let slotIndex = 0; // Assume starting from beginning of day for simplicity, or find next

	// Find next slot
	let found = false;
	for (let i = 0; i < slots.length; i++) {
		const [h, m] = slots[i];
		const testDate = createGMT7Time(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			currentDate.getDate(),
			h
		);
		testDate.setMinutes(m);

		if (testDate > startDate) {
			slotIndex = i;
			found = true;
			break;
		}
	}

	if (!found) {
		currentDate.setDate(currentDate.getDate() + 1);
		currentDate.setHours(0, 0, 0, 0);
		slots = getSlotsForDate(currentDate);
		slotIndex = 0;
	}

	for (let i = 0; i < count; i++) {
		const [h, m] = slots[slotIndex];
		const scheduleTime = createGMT7Time(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			currentDate.getDate(),
			h
		);
		scheduleTime.setMinutes(m);

		const gmt7 = toGMT7(scheduleTime);
		const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
			gmt7.getDay()
		];

		console.log(
			`Post ${i + 1}: ${gmt7
				.toISOString()
				.replace('T', ' ')
				.slice(0, 16)} (${dayName})`
		);

		slotIndex++;
		if (slotIndex >= slots.length) {
			currentDate.setDate(currentDate.getDate() + 1);
			slots = getSlotsForDate(currentDate);
			slotIndex = 0;
		}
	}
}

// Run Test
// Test 1: Start on a Friday Morning (should fill Friday, then Saturday, then Sunday)
const fridayStart = createGMT7Time(2025, 12, 26, 8); // Dec 26 2025 is Friday
simulateSchedule(fridayStart, 35);

// Test 2: Start on Saturday Night (should handle transition to Sunday 1am)
const satNight = createGMT7Time(2025, 12, 27, 23); // Dec 27 2025 is Saturday. 23:00 GMT+7.
// Next slot should be Sunday 01:00
simulateSchedule(satNight, 5);
