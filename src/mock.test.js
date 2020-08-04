import {effect, mock, state} from './index';

test('state mock', () => {
  const countState = state(1);
  const onChangeCallback = jest.fn();

  countState.onChange(onChangeCallback);

  mock(() => {
    mock(countState).value(5).loading(true).error(new Error()).onChange();
    expect(countState.value).toBe(5);
    expect(countState.loading).toBe(true);
    expect(countState.error).toBeInstanceOf(Error);

    mock(countState).remove();

    expect(countState.value).toBe(1);
    expect(countState.loading).toBe(false);
    expect(countState.error).toBeUndefined();
  });

  expect(onChangeCallback).toBeCalled();
  expect(countState.value).toBe(1);
  expect(countState.loading).toBe(false);
  expect(countState.error).toBeUndefined();
});

test('effect mock', () => {
  const mockedBody = jest.fn();
  const defaultBody = jest.fn();
  const increase = effect(defaultBody);
  const onCallCallback = jest.fn();

  increase.onCall(onCallCallback);

  mock(() => {
    mock(increase).body(mockedBody).loading(true).onCall();
    increase();
    expect(onCallCallback).toBeCalledTimes(1);
    expect(increase.loading).toBe(true);
    expect(mockedBody).toBeCalledTimes(1);
  });

  increase();
  expect(defaultBody).toBeCalledTimes(1);
  expect(mockedBody).toBeCalledTimes(1);
  expect(onCallCallback).toBeCalledTimes(2);
  expect(increase.loading).toBe(false);
  expect(increase.error).toBeUndefined();
});
