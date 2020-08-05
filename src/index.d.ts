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

  map<Map extends {[key: string]: State<any>}>(
    stateMap: Map,
    options?: StateOptions<{[key in keyof Map]: StateTypeInfer<Map[key]>}>,
  ): State<{[key in keyof Map]: StateTypeInfer<Map[key]>}>;
  map<Map extends {[key: string]: State<any>}, Value>(
    stateMap: Map,
    mapper: (value: Map) => Value,
    options?: StateOptions<Value>,
  ): State<Value>;
  map<Source, Destination>(
    state: State<Source>,
    mapper: (value: Source) => Destination,
    options?: StateOptions<Destination>,
  ): State<Destination>;
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
  reset(): CancelablePromise<T>;
  eval(): void;
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

  /// Array mutations
  push(...values: ArrayItemInfer<T>[]): CancellablePromiseInfer<T>;
  filter(
    predicate: (value?: ArrayItemInfer<T>, index?: number) => boolean,
  ): CancellablePromiseInfer<T>;

  mapTo<Destination>(
    mapper: (value: T) => Destination,
    options?: StateOptions<Destination>,
  ): State<Destination>;
}

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

type PromiseToResolved<T> = T extends Promise<infer Resolved> ? Resolved : T;

export interface Loadable<T> {
  value: T;
  error: any;
  state: 'loading' | 'hasValue' | 'hasError';
}
