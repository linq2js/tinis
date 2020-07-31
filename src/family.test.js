import {delayIn} from './utils';
import {state} from './index';
import fetch from 'node-fetch';

test('multiple counter', () => {
  const countState = state.family((name, value) => ({
    name,
    value,
  }));

  const countAState = countState('A', 1);
  const countBState = countState('B', 2);

  expect(countAState.value).toEqual({name: 'A', value: 1});
  expect(countBState.value).toEqual({name: 'B', value: 2});

  countAState.value = {name: 'A', value: 2};
  countBState.value = {name: 'B', value: 3};

  expect(countAState.value).toEqual({name: 'A', value: 2});
  expect(countBState.value).toEqual({name: 'B', value: 3});
});

test('reddit', async () => {
  const testSubreddit = 'react';
  const redditPostsState = state.family(async (subreddit) => {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}.json`,
    ).then((response) => response.json());

    return {
      receivedAt: new Date(),
      posts: response.data.children.map((item) => item.data),
    };
  });
  const reactPosts = redditPostsState(testSubreddit);
  reactPosts.eval();
  await delayIn(800);
  reactPosts.reset();
});
