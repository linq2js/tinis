import {state} from './index';

test('basic map', () => {
  const emailChangeCallback = jest.fn();
  const passwordChangeCallback = jest.fn();
  const groupChangeCallback = jest.fn();
  const group = state.map({email: 'test@tempuri.org', password: '123456'});

  group.onChange(groupChangeCallback);
  group('email').onChange(emailChangeCallback);
  group('password').onChange(passwordChangeCallback);

  expect(group('email').value).toBe('test@tempuri.org');
  expect(group('password').value).toBe('123456');

  group.value = {email: 'test@tempuri.org', password: 'abcdef'};

  // nothing change for email
  expect(emailChangeCallback).toBeCalledTimes(0);
  expect(groupChangeCallback).toBeCalledTimes(1);
  expect(passwordChangeCallback).toBeCalledTimes(1);

  expect(group('password').value).toBe('abcdef');
});
