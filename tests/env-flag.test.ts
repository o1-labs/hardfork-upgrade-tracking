import { envFlag } from '../src/utils/env-flag';

describe('envFlag', () => {
  it.each(['true', 'TRUE', 'True', '1', 'yes', 'YES', 'on', 'On', ' true '])(
    'treats %p as on',
    value => {
      expect(envFlag(value)).toBe(true);
    }
  );

  // 'false' and '0' here are what rule out a naive `!!value` implementation,
  // which would otherwise turn the flag on for SHOW_NON_BP_NODES=false.
  it.each([undefined, '', ' ', 'false', 'FALSE', '0', 'no', 'off', 'maybe', 'truthy'])(
    'treats %p as off',
    value => {
      expect(envFlag(value)).toBe(false);
    }
  );
});
