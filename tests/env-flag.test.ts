import { envFlag } from '../src/utils/env-flag';

describe('envFlag', () => {
  it.each(['true', 'TRUE', 'True', '1', 'yes', 'YES', 'on', 'On', ' true '])(
    'treats %p as on',
    value => {
      expect(envFlag(value)).toBe(true);
    }
  );

  it.each([undefined, '', ' ', 'false', 'FALSE', '0', 'no', 'off', 'maybe', 'truthy'])(
    'treats %p as off',
    value => {
      expect(envFlag(value)).toBe(false);
    }
  );

  it('does not treat an arbitrary non-empty string as on', () => {
    // Guards against a naive `!!value` implementation, which would flip the
    // flag on for SHOW_NON_BP_NODES=false.
    expect(envFlag('false')).toBe(false);
  });
});
