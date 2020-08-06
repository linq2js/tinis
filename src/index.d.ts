export const effect: EffectExports;
export const state: StateExports;
export const task: TaskExports;
export const mock: MockExports;

interface MockExports {
  (effect: Effect<DefaultEffectBody>): EffectMock;
  <T>(func: () => T): T;
  (state: State<any>): StateMock;
}

interface EffectMock {
  body(body: any): EffectMock;
  loading(getterOrValue: any): EffectMock;
  called(getterOrValue: any): EffectMock;
  error(getterOrValue: any): EffectMock;
  loadable(getterOrValue: any): EffectMock;
  onCall(): EffectMock;
  onLoadingChange(): EffectMock;
  remove(): void;
}

interface StateMock {
  value(getterOrValue: any): StateMock;
  loading(getterOrValue: any): StateMock;
  error(getterOrValue: any): StateMock;
  loadable(getterOrValue: any): EffectMock;
  changed(getterOrValue: any): EffectMock;
  ready(getterOrValue: any): EffectMock;
  onChange(): StateMock;
  onLoadingChange(): StateMock;
  remove(): void;
}

interface TaskExports {
  debounce(func: Function, ms?: number): Function;
  throttle(func: Function, ms?: number): Function;
  latest(func: Function): Function;
  delay<T>(
    ms: number,
    func: (...args: any[]) => T,
    ...args: any[]
  ): CancelablePromise<T>;
  delay<T>(ms: number, value?: T): CancelablePromise<T>;
}

interface EffectExports extends Function {
  (options?: EffectOptions): Effect<DefaultEffectBody>;
  <Body extends (...args: any[]) => (context: Context) => any>(
    body: Body,
    options?: EffectOptions,
  ): Effect<Body>;
  <Body extends (...args: any[]) => any>(
    body: Body,
    options?: EffectOptions,
  ): Effect<Body>;

  any: Awaitable;
}

interface StateOptions<T> {
  default?: T;
  debounce?: boolean | number;
  throttle?: boolean | number;
  displayName?: string;
  readonly?: boolean;
}

interface StateExports extends Function {
  (): State<any>;
  <Value>(
    value: Value | /* fallback for custom return type */ Function,
    options?: StateOptions<StateValueInfer<Value>>,
  ): State<StateValueInfer<Value>>;

  history<T>(state: State<T>, options?: HistoryOptions): HistoryState<T>;

  /**
   * create HistoryState
   * @param states
   * @param options
   */
  history<T extends {[key: string]: State<any>}>(
    states: T,
    options?: HistoryOptions,
  ): HistoryState<{[key in keyof T]: StateTypeInfer<T[key]>}>;

  family<Value>(
    value: Value | /* fallback for custom return type */ Function,
    options?: StateOptions<StateValueInfer<Value>>,
  ): StateFamily<State<StateValueInfer<Value>>>;

  map<Group>(initial?: Group, options?: StateOptions<any>): StateMap<Group>;

  from<Source extends {[key: string]: State<any>}>(
    stateMap: Source,
    options?: StateOptions<
      {[key in keyof Source]: StateTypeInfer<Source[key]>}
    >,
  ): State<{[key in keyof Source]: StateTypeInfer<Source[key]>}>;
  from<Source extends {[key: string]: State<any>}, Value>(
    stateMap: Source,
    mapper: (value: Source) => Value,
    options?: StateOptions<Value>,
  ): State<Value>;

  from<Source extends State<any>[]>(
    stateTuple: Source,
    options?: StateOptions<
      {[key in keyof Source]: StateTypeInfer<Source[key]>}
    >,
  ): State<{[key in keyof Source]: StateTypeInfer<Source[key]>}>;
  from<Source extends State<any>[], Value>(
    stateTuple: Source,
    mapper: (value: Source) => Value,
    options?: StateOptions<Value>,
  ): State<Value>;

  from<Value, Destination>(
    state: State<Value>,
    mapper: (value: Value) => Destination,
    options?: StateOptions<Destination>,
  ): State<Destination>;

  batch<Return, Params extends any[]>(
    func: (...args: Params) => Return,
    ...args: Params
  ): Return;
}

interface StateMap<T extends {[key: string]: any}>
  extends StateFamily<State<any>> {
  value: T;
  /**
   * set state value
   * @param value
   */
  mutate(value: T | Promise<T>): CancellablePromiseInfer<T>;

  mutate(asyncValue: Promise<T>): CancellablePromiseInfer<T>;
  /**
   * reduce state value with specified reducer
   * @param reducers
   */
  mutate(...reducers: ((value?: T) => T)[]): CancellablePromiseInfer<T>;
}

type StateTypeInfer<T> = T extends State<infer Type> ? Type : never;

export interface State<T> extends Awaitable {
  /**
   * get or set state value
   */
  value: T;
  error: any;
  /**
   * get loading status of state
   */
  loading: boolean;
  dirty: boolean;
  reset(): CancelablePromise<T>;
  eval(): State<T>;
  changed: CancelablePromise<T>;
  ready: CancelablePromise<T>;
  /**
   * set state value
   * @param value
   */
  mutate(value: T | Promise<T>): CancellablePromiseInfer<T>;

  mutate(asyncValue: Promise<T>): CancellablePromiseInfer<T>;
  /**
   * reduce state value with specified reducer
   * @param reducers
   */
  mutate(...reducers: ((value?: T) => T)[]): CancellablePromiseInfer<T>;
  onChange(listener: Listener): RemoveListener;
  onReady(listener: Listener): RemoveListener;
  onLoadingChange(listener: Listener): RemoveListener;

  op: StateOperators<T>;

  map<Destination>(
    mapper: (value: T) => Destination,
    options?: StateOptions<Destination>,
  ): State<Destination>;
}

interface StateOperators<T> {
  /**
   *
   * @param source
   * @param dest
   */
  swap(source: KeyOf<T>, dest: KeyOf<T>): CancellablePromiseInfer<T>;

  /**
   *
   * @param values
   */
  push(...values: ArrayItemInfer<T>[]): CancellablePromiseInfer<T>;

  /**
   *
   */
  pop(): CancellablePromiseInfer<T>;

  /**
   *
   * @param values
   */
  unshift(...values: ArrayItemInfer<T>[]): CancellablePromiseInfer<T>;

  /**
   *
   */
  shift(): CancellablePromiseInfer<T>;

  /**
   *
   * @param predicate
   */
  filter(
    predicate: (value?: ArrayItemInfer<T>, index?: number) => boolean,
  ): CancellablePromiseInfer<T>;

  /**
   *
   * @param mapper
   */
  map(
    mapper: (value: ArrayItemInfer<T>, index?: number) => ArrayItemInfer<T>,
  ): CancellablePromiseInfer<T>;

  /**
   *
   * @param func
   */
  sort(func?: Function): CancellablePromiseInfer<T>;

  /**
   *
   * @param index
   * @param length
   * @param items
   */
  splice(
    index: number,
    length: number,
    ...items: ArrayItemInfer<T>[]
  ): CancellablePromiseInfer<T>;

  /**
   *
   * @param props
   */
  assign(...props: any[]): CancellablePromiseInfer<T>;

  /**
   *
   * @param props
   */
  delete(...props: KeyOf<T>[]): CancellablePromiseInfer<T>;

  add(): CancellablePromiseInfer<T>;
  add(value: Timespan): CancellablePromiseInfer<T>;
  add(value: number): CancellablePromiseInfer<T>;
  add(value: string): CancellablePromiseInfer<T>;

  toggle(): CancellablePromiseInfer<T>;
}

interface Timespan {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  seconds?: number;
  minutes?: number;
  milliseconds?: number;
}

type KeyOf<T> = keyof T;

type ArrayItemInfer<T> = T extends Array<infer Item> ? Item : never;

type CancellablePromiseInfer<T> = T extends Promise<infer Resolved>
  ? CancelablePromise<void>
  : void;
type Listener = () => any;
type RemoveListener = () => void;
type StateValueInfer<T> = T extends () => Promise<infer Resolved>
  ? Resolved
  : T extends () => infer Return
  ? Return
  : T extends Function
  ? any
  : T;

export interface Effect<Body extends DefaultEffectBody>
  extends Function,
    Awaitable {
  (...args: Parameters<Body>): CancelablePromise<void>;
  loading: boolean;
  called(): CancelablePromise<void>;
  onCall(listener: Listener): RemoveListener;
  onLoadingChange(listener: Listener): RemoveListener;
}

type DefaultEffectBody = (...args: any[]) => any;

interface EffectOptions {
  debounce?: false | number;
  throttle?: false | number;
  latest?: boolean;
  displayName?: string;
}

type EffectReturnInfer<T> = T extends Promise<infer Resolved>
  ? CancelablePromise<void | never>
  : void | never;

interface Awaitable {
  onDone(callback: Function): RemoveListener;
}

interface CancelablePromise<T> extends Promise<T | never> {
  cancel(): void;
}

interface Context {
  isCancelled(): boolean;
  cancel(): void;
}

interface StateFamily<State> extends Function {
  (...args: any[]): State;
  reset(): void;
  clear(): void;
  onChange(listener: Listener): RemoveListener;
  onLoadingChange(listener: Listener): RemoveListener;
}

interface HistoryState<T> extends State<HistoryData<T>> {
  forward(): void;
  go(index: number): void;
  go<T>(entry: HistoryData<T>): void;
  back(): void;
  clear(): void;
}

interface HistoryOptions {
  debounce?: number | boolean;
  max?: number;
}

interface HistoryData<T> {
  prev: T[];
  current: T;
  next: T[];
  length: number;
  all: T[];
  forward: boolean;
  back: boolean;
  updatedOn: Date;
}
