// node_modules/@wallet-standard/app/lib/esm/wallets.js
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _AppReadyEvent_detail;
var wallets = void 0;
var registeredWalletsSet = /* @__PURE__ */ new Set();
function addRegisteredWallet(wallet) {
  cachedWalletsArray = void 0;
  registeredWalletsSet.add(wallet);
}
function removeRegisteredWallet(wallet) {
  cachedWalletsArray = void 0;
  registeredWalletsSet.delete(wallet);
}
var listeners = {};
function getWallets() {
  if (wallets)
    return wallets;
  wallets = Object.freeze({ register, get, on });
  if (typeof window === "undefined")
    return wallets;
  const api = Object.freeze({ register });
  try {
    window.addEventListener("wallet-standard:register-wallet", ({ detail: callback }) => callback(api));
  } catch (error) {
    console.error("wallet-standard:register-wallet event listener could not be added\n", error);
  }
  try {
    window.dispatchEvent(new AppReadyEvent(api));
  } catch (error) {
    console.error("wallet-standard:app-ready event could not be dispatched\n", error);
  }
  return wallets;
}
function register(...wallets2) {
  wallets2 = wallets2.filter((wallet) => !registeredWalletsSet.has(wallet));
  if (!wallets2.length)
    return () => {
    };
  wallets2.forEach((wallet) => addRegisteredWallet(wallet));
  listeners["register"]?.forEach((listener) => guard(() => listener(...wallets2)));
  return function unregister() {
    wallets2.forEach((wallet) => removeRegisteredWallet(wallet));
    listeners["unregister"]?.forEach((listener) => guard(() => listener(...wallets2)));
  };
}
var cachedWalletsArray;
function get() {
  if (!cachedWalletsArray) {
    cachedWalletsArray = [...registeredWalletsSet];
  }
  return cachedWalletsArray;
}
function on(event, listener) {
  listeners[event]?.push(listener) || (listeners[event] = [listener]);
  return function off() {
    listeners[event] = listeners[event]?.filter((existingListener) => listener !== existingListener);
  };
}
function guard(callback) {
  try {
    callback();
  } catch (error) {
    console.error(error);
  }
}
var AppReadyEvent = class extends Event {
  get detail() {
    return __classPrivateFieldGet(this, _AppReadyEvent_detail, "f");
  }
  get type() {
    return "wallet-standard:app-ready";
  }
  constructor(api) {
    super("wallet-standard:app-ready", {
      bubbles: false,
      cancelable: false,
      composed: false
    });
    _AppReadyEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _AppReadyEvent_detail, api, "f");
  }
  /** @deprecated */
  preventDefault() {
    throw new Error("preventDefault cannot be called");
  }
  /** @deprecated */
  stopImmediatePropagation() {
    throw new Error("stopImmediatePropagation cannot be called");
  }
  /** @deprecated */
  stopPropagation() {
    throw new Error("stopPropagation cannot be called");
  }
};
_AppReadyEvent_detail = /* @__PURE__ */ new WeakMap();

// node_modules/@mysten/sui/dist/utils/suins.mjs
var SUI_NS_NAME_REGEX = /^(?!.*(^(?!@)|[-.@])($|[-.@]))(?:[a-z0-9-]{0,63}(?:\.[a-z0-9-]{0,63})*)?@[a-z0-9-]{0,63}$/i;
var SUI_NS_DOMAIN_REGEX = /^(?!.*(^|[-.])($|[-.]))(?:[a-z0-9-]{0,63}\.)+sui$/i;
var MAX_SUI_NS_NAME_LENGTH = 235;
function isValidSuiNSName(name) {
  if (name.length > MAX_SUI_NS_NAME_LENGTH) return false;
  if (name.includes("@")) return SUI_NS_NAME_REGEX.test(name);
  return SUI_NS_DOMAIN_REGEX.test(name);
}
function normalizeSuiNSName(name, format = "at") {
  const lowerCase = name.toLowerCase();
  let parts;
  if (lowerCase.includes("@")) {
    if (!SUI_NS_NAME_REGEX.test(lowerCase)) throw new Error(`Invalid SuiNS name ${name}`);
    const [labels, domain] = lowerCase.split("@");
    parts = [...labels ? labels.split(".") : [], domain];
  } else {
    if (!SUI_NS_DOMAIN_REGEX.test(lowerCase)) throw new Error(`Invalid SuiNS name ${name}`);
    parts = lowerCase.split(".").slice(0, -1);
  }
  if (format === "dot") return `${parts.join(".")}.sui`;
  return `${parts.slice(0, -1).join(".")}@${parts[parts.length - 1]}`;
}

// node_modules/@mysten/sui/dist/utils/move-registry.mjs
var NAME_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)$/;
var VERSION_REGEX = /^\d+$/;
var MAX_APP_SIZE = 64;
var NAME_SEPARATOR = "/";
var isValidNamedPackage = (name) => {
  const parts = name.split(NAME_SEPARATOR);
  if (parts.length < 2 || parts.length > 3) return false;
  const [org, app, version] = parts;
  if (version !== void 0 && !VERSION_REGEX.test(version)) return false;
  if (!isValidSuiNSName(org)) return false;
  return NAME_PATTERN.test(app) && app.length < MAX_APP_SIZE;
};
var isValidNamedType = (type) => {
  const splitType = type.split(/::|<|>|,/);
  for (const t of splitType) if (t.includes(NAME_SEPARATOR) && !isValidNamedPackage(t)) return false;
  return isValidStructTag(type);
};

// node_modules/@mysten/bcs/dist/uleb.mjs
function ulebEncode(num) {
  let bigNum = BigInt(num);
  const arr = [];
  let len = 0;
  if (bigNum === 0n) return [0];
  while (bigNum > 0) {
    arr[len] = Number(bigNum & 127n);
    bigNum >>= 7n;
    if (bigNum > 0n) arr[len] |= 128;
    len += 1;
  }
  return arr;
}
function ulebDecode(arr) {
  let total = 0n;
  let shift = 0n;
  let len = 0;
  while (true) {
    if (len >= arr.length) throw new Error("ULEB decode error: buffer overflow");
    const byte = arr[len];
    len += 1;
    total += BigInt(byte & 127) << shift;
    if ((byte & 128) === 0) break;
    shift += 7n;
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("ULEB decode error: value exceeds MAX_SAFE_INTEGER");
  return {
    value: Number(total),
    length: len
  };
}

// node_modules/@mysten/bcs/dist/reader.mjs
var BcsReader = class {
  /**
  * @param {Uint8Array} data Data to use as a buffer.
  */
  constructor(data) {
    this.bytePosition = 0;
    this.dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  /**
  * Shift current cursor position by `bytes`.
  *
  * @param {Number} bytes Number of bytes to
  * @returns {this} Self for possible chaining.
  */
  shift(bytes) {
    this.bytePosition += bytes;
    return this;
  }
  /**
  * Read U8 value from the buffer and shift cursor by 1.
  * @returns
  */
  read8() {
    const value = this.dataView.getUint8(this.bytePosition);
    this.shift(1);
    return value;
  }
  /**
  * Read U16 value from the buffer and shift cursor by 2.
  * @returns
  */
  read16() {
    const value = this.dataView.getUint16(this.bytePosition, true);
    this.shift(2);
    return value;
  }
  /**
  * Read U32 value from the buffer and shift cursor by 4.
  * @returns
  */
  read32() {
    const value = this.dataView.getUint32(this.bytePosition, true);
    this.shift(4);
    return value;
  }
  /**
  * Read U64 value from the buffer and shift cursor by 8.
  * @returns
  */
  read64() {
    const value1 = this.read32();
    const result = this.read32().toString(16) + value1.toString(16).padStart(8, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
  * Read U128 value from the buffer and shift cursor by 16.
  */
  read128() {
    const value1 = BigInt(this.read64());
    const result = BigInt(this.read64()).toString(16) + value1.toString(16).padStart(16, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
  * Read U128 value from the buffer and shift cursor by 32.
  * @returns
  */
  read256() {
    const value1 = BigInt(this.read128());
    const result = BigInt(this.read128()).toString(16) + value1.toString(16).padStart(32, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
  * Read `num` number of bytes from the buffer and shift cursor by `num`.
  * @param num Number of bytes to read.
  */
  readBytes(num) {
    const start = this.bytePosition + this.dataView.byteOffset;
    const value = new Uint8Array(this.dataView.buffer, start, num);
    this.shift(num);
    return value;
  }
  /**
  * Read ULEB value - an integer of varying size. Used for enum indexes and
  * vector lengths.
  * @returns {Number} The ULEB value.
  */
  readULEB() {
    const start = this.bytePosition + this.dataView.byteOffset;
    const { value, length } = ulebDecode(new Uint8Array(this.dataView.buffer, start));
    this.shift(length);
    return value;
  }
  /**
  * Read a BCS vector: read a length and then apply function `cb` X times
  * where X is the length of the vector, defined as ULEB in BCS bytes.
  * @param cb Callback to process elements of vector.
  * @returns {Array<Any>} Array of the resulting values, returned by callback.
  */
  readVec(cb) {
    const length = this.readULEB();
    const result = [];
    for (let i = 0; i < length; i++) result.push(cb(this, i, length));
    return result;
  }
};

// node_modules/@scure/base/index.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
function isArrayOf(isString, arr) {
  if (!Array.isArray(arr))
    return false;
  if (arr.length === 0)
    return true;
  if (isString) {
    return arr.every((item) => typeof item === "string");
  } else {
    return arr.every((item) => Number.isSafeInteger(item));
  }
}
function astr(label, input) {
  if (typeof input !== "string")
    throw new TypeError(`${label}: string expected`);
  return true;
}
function anumber(n) {
  if (typeof n !== "number")
    throw new TypeError(`number expected, got ${typeof n}`);
  if (!Number.isSafeInteger(n))
    throw new RangeError(`invalid integer: ${n}`);
}
function aArr(input) {
  if (!Array.isArray(input))
    throw new TypeError("array expected");
}
function astrArr(label, input) {
  if (!isArrayOf(true, input))
    throw new TypeError(`${label}: array of strings expected`);
}
function anumArr(label, input) {
  if (!isArrayOf(false, input))
    throw new TypeError(`${label}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function chain(...args) {
  const id = (a) => a;
  const wrap = (a, b) => (c) => a(b(c));
  const encode = args.map((x) => x.encode).reduceRight(wrap, id);
  const decode = args.map((x) => x.decode).reduce(wrap, id);
  return { encode, decode };
}
// @__NO_SIDE_EFFECTS__
function alphabet(letters) {
  const lettersA = typeof letters === "string" ? letters.split("") : letters;
  const len = lettersA.length;
  astrArr("alphabet", lettersA);
  const indexes = new Map(lettersA.map((l, i) => [l, i]));
  return {
    encode: (digits) => {
      aArr(digits);
      return digits.map((i) => {
        if (!Number.isSafeInteger(i) || i < 0 || i >= len)
          throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${letters}`);
        return lettersA[i];
      });
    },
    decode: (input) => {
      aArr(input);
      return input.map((letter) => {
        astr("alphabet.decode", letter);
        const i = indexes.get(letter);
        if (i === void 0)
          throw new Error(`Unknown letter: "${letter}". Allowed: ${letters}`);
        return i;
      });
    }
  };
}
// @__NO_SIDE_EFFECTS__
function join(separator = "") {
  astr("join", separator);
  return {
    encode: (from) => {
      astrArr("join.decode", from);
      return from.join(separator);
    },
    decode: (to) => {
      astr("join.decode", to);
      return to.split(separator);
    }
  };
}
function convertRadix(data, from, to) {
  if (from < 2)
    throw new RangeError(`convertRadix: invalid from=${from}, base cannot be less than 2`);
  if (to < 2)
    throw new RangeError(`convertRadix: invalid to=${to}, base cannot be less than 2`);
  aArr(data);
  if (!data.length)
    return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data, (d) => {
    anumber(d);
    if (d < 0 || d >= from)
      throw new Error(`invalid integer: ${d}`);
    return d;
  });
  const dlen = digits.length;
  while (true) {
    let carry = 0;
    let done = true;
    for (let i = pos; i < dlen; i++) {
      const digit = digits[i];
      const fromCarry = from * carry;
      const digitBase = fromCarry + digit;
      if (!Number.isSafeInteger(digitBase) || fromCarry / from !== carry || digitBase - digit !== fromCarry) {
        throw new Error("convertRadix: carry overflow");
      }
      const div = digitBase / to;
      carry = digitBase % to;
      const rounded = Math.floor(div);
      digits[i] = rounded;
      if (!Number.isSafeInteger(rounded) || rounded * to + carry !== digitBase)
        throw new Error("convertRadix: carry overflow");
      if (!done)
        continue;
      else if (!rounded)
        pos = i;
      else
        done = false;
    }
    res.push(carry);
    if (done)
      break;
  }
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++)
    res.push(0);
  return res.reverse();
}
// @__NO_SIDE_EFFECTS__
function radix(num) {
  anumber(num);
  const _256 = 2 ** 8;
  return {
    encode: (bytes) => {
      if (!isBytes(bytes))
        throw new TypeError("radix.encode input should be Uint8Array");
      return convertRadix(Array.from(bytes), _256, num);
    },
    decode: (digits) => {
      anumArr("radix.decode", digits);
      return Uint8Array.from(convertRadix(digits, num, _256));
    }
  };
}
var genBase58 = /* @__NO_SIDE_EFFECTS__ */ (abc) => /* @__PURE__ */ chain(/* @__PURE__ */ radix(58), /* @__PURE__ */ alphabet(abc), /* @__PURE__ */ join(""));
var base58 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ genBase58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"));

// node_modules/@mysten/utils/dist/b58.mjs
var toBase58 = (buffer) => base58.encode(buffer);
var fromBase58 = (str) => base58.decode(str);

// node_modules/@mysten/utils/dist/b64.mjs
function fromBase64(base64String2) {
  return Uint8Array.from(atob(base64String2), (char) => char.charCodeAt(0));
}
var CHUNK_SIZE = 8192;
function toBase64(bytes) {
  if (bytes.length < CHUNK_SIZE) return btoa(String.fromCharCode(...bytes));
  let output = "";
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk2 = bytes.slice(i, i + CHUNK_SIZE);
    output += String.fromCharCode(...chunk2);
  }
  return btoa(output);
}

// node_modules/@mysten/utils/dist/hex.mjs
function fromHex(hexStr) {
  const normalized = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
  const padded = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
  const intArr = padded.match(/[0-9a-fA-F]{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [];
  if (intArr.length !== padded.length / 2) throw new Error(`Invalid hex string ${hexStr}`);
  return Uint8Array.from(intArr);
}
function toHex(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}

// node_modules/@mysten/utils/dist/chunk.mjs
function chunk(array2, size) {
  return Array.from({ length: Math.ceil(array2.length / size) }, (_, i) => {
    return array2.slice(i * size, (i + 1) * size);
  });
}

// node_modules/@mysten/utils/dist/dataloader.mjs
var DataLoader = class {
  constructor(batchLoadFn, options) {
    if (typeof batchLoadFn !== "function") throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}.`);
    this._batchLoadFn = batchLoadFn;
    this._maxBatchSize = getValidMaxBatchSize(options);
    this._batchScheduleFn = getValidBatchScheduleFn(options);
    this._cacheKeyFn = getValidCacheKeyFn(options);
    this._cacheMap = getValidCacheMap(options);
    this._batch = null;
    this.name = getValidName(options);
  }
  /**
  * Loads a key, returning a `Promise` for the value represented by that key.
  */
  load(key) {
    if (key === null || key === void 0) throw new TypeError(`The loader.load() function must be called with a value, but got: ${String(key)}.`);
    const batch = getCurrentBatch(this);
    const cacheMap = this._cacheMap;
    let cacheKey;
    if (cacheMap) {
      cacheKey = this._cacheKeyFn(key);
      const cachedPromise = cacheMap.get(cacheKey);
      if (cachedPromise) {
        const cacheHits = batch.cacheHits || (batch.cacheHits = []);
        return new Promise((resolve) => {
          cacheHits.push(() => {
            resolve(cachedPromise);
          });
        });
      }
    }
    batch.keys.push(key);
    const promise = new Promise((resolve, reject) => {
      batch.callbacks.push({
        resolve,
        reject
      });
    });
    if (cacheMap) cacheMap.set(cacheKey, promise);
    return promise;
  }
  /**
  * Loads multiple keys, promising an array of values:
  *
  *     var [ a, b ] = await myLoader.loadMany([ 'a', 'b' ]);
  *
  * This is similar to the more verbose:
  *
  *     var [ a, b ] = await Promise.all([
  *       myLoader.load('a'),
  *       myLoader.load('b')
  *     ]);
  *
  * However it is different in the case where any load fails. Where
  * Promise.all() would reject, loadMany() always resolves, however each result
  * is either a value or an Error instance.
  *
  *     var [ a, b, c ] = await myLoader.loadMany([ 'a', 'b', 'badkey' ]);
  *     // c instanceof Error
  *
  */
  loadMany(keys) {
    if (!isArrayLike(keys)) throw new TypeError(`The loader.loadMany() function must be called with Array<key>, but got: ${keys}.`);
    const loadPromises = [];
    for (let i = 0; i < keys.length; i++) loadPromises.push(this.load(keys[i]).catch((error) => error));
    return Promise.all(loadPromises);
  }
  /**
  * Clears the value at `key` from the cache, if it exists. Returns itself for
  * method chaining.
  */
  clear(key) {
    const cacheMap = this._cacheMap;
    if (cacheMap) {
      const cacheKey = this._cacheKeyFn(key);
      cacheMap.delete(cacheKey);
    }
    return this;
  }
  /**
  * Clears the entire cache. To be used when some event results in unknown
  * invalidations across this particular `DataLoader`. Returns itself for
  * method chaining.
  */
  clearAll() {
    const cacheMap = this._cacheMap;
    if (cacheMap) cacheMap.clear();
    return this;
  }
  /**
  * Adds the provided key and value to the cache. If the key already
  * exists, no change is made. Returns itself for method chaining.
  *
  * To prime the cache with an error at a key, provide an Error instance.
  */
  prime(key, value) {
    const cacheMap = this._cacheMap;
    if (cacheMap) {
      const cacheKey = this._cacheKeyFn(key);
      if (cacheMap.get(cacheKey) === void 0) {
        let promise;
        if (value instanceof Error) {
          promise = Promise.reject(value);
          promise.catch(() => {
          });
        } else promise = Promise.resolve(value);
        cacheMap.set(cacheKey, promise);
      }
    }
    return this;
  }
};
var enqueuePostPromiseJob = typeof process === "object" && typeof process.nextTick === "function" ? function(fn) {
  if (!resolvedPromise) resolvedPromise = Promise.resolve();
  resolvedPromise.then(() => {
    process.nextTick(fn);
  });
} : typeof setImmediate === "function" ? function(fn) {
  setImmediate(fn);
} : function(fn) {
  setTimeout(fn);
};
var resolvedPromise;
function getCurrentBatch(loader) {
  const existingBatch = loader._batch;
  if (existingBatch !== null && !existingBatch.hasDispatched && existingBatch.keys.length < loader._maxBatchSize) return existingBatch;
  const newBatch = {
    hasDispatched: false,
    keys: [],
    callbacks: []
  };
  loader._batch = newBatch;
  loader._batchScheduleFn(() => {
    dispatchBatch(loader, newBatch);
  });
  return newBatch;
}
function dispatchBatch(loader, batch) {
  batch.hasDispatched = true;
  if (batch.keys.length === 0) {
    resolveCacheHits(batch);
    return;
  }
  let batchPromise;
  try {
    batchPromise = loader._batchLoadFn(batch.keys);
  } catch (e) {
    return failedDispatch(loader, batch, /* @__PURE__ */ new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function errored synchronously: ${String(e)}.`));
  }
  if (!batchPromise || typeof batchPromise.then !== "function") return failedDispatch(loader, batch, /* @__PURE__ */ new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise: ${String(batchPromise)}.`));
  Promise.resolve(batchPromise).then((values) => {
    if (!isArrayLike(values)) throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array: ${String(values)}.`);
    if (values.length !== batch.keys.length) throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array of the same length as the Array of keys.

Keys:
${String(batch.keys)}

Values:
${String(values)}`);
    resolveCacheHits(batch);
    for (let i = 0; i < batch.callbacks.length; i++) {
      const value = values[i];
      if (value instanceof Error) batch.callbacks[i].reject(value);
      else batch.callbacks[i].resolve(value);
    }
  }).catch((error) => {
    failedDispatch(loader, batch, error);
  });
}
function failedDispatch(loader, batch, error) {
  resolveCacheHits(batch);
  for (let i = 0; i < batch.keys.length; i++) {
    loader.clear(batch.keys[i]);
    batch.callbacks[i].reject(error);
  }
}
function resolveCacheHits(batch) {
  if (batch.cacheHits) for (let i = 0; i < batch.cacheHits.length; i++) batch.cacheHits[i]();
}
function getValidMaxBatchSize(options) {
  if (!(!options || options.batch !== false)) return 1;
  const maxBatchSize = options && options.maxBatchSize;
  if (maxBatchSize === void 0) return Infinity;
  if (typeof maxBatchSize !== "number" || maxBatchSize < 1) throw new TypeError(`maxBatchSize must be a positive number: ${maxBatchSize}`);
  return maxBatchSize;
}
function getValidBatchScheduleFn(options) {
  const batchScheduleFn = options && options.batchScheduleFn;
  if (batchScheduleFn === void 0) return enqueuePostPromiseJob;
  if (typeof batchScheduleFn !== "function") throw new TypeError(`batchScheduleFn must be a function: ${batchScheduleFn}`);
  return batchScheduleFn;
}
function getValidCacheKeyFn(options) {
  const cacheKeyFn = options && options.cacheKeyFn;
  if (cacheKeyFn === void 0) return (key) => key;
  if (typeof cacheKeyFn !== "function") throw new TypeError(`cacheKeyFn must be a function: ${cacheKeyFn}`);
  return cacheKeyFn;
}
function getValidCacheMap(options) {
  if (!(!options || options.cache !== false)) return null;
  const cacheMap = options && options.cacheMap;
  if (cacheMap === void 0) return /* @__PURE__ */ new Map();
  if (cacheMap !== null) {
    const missingFunctions = [
      "get",
      "set",
      "delete",
      "clear"
    ].filter((fnName) => cacheMap && typeof cacheMap[fnName] !== "function");
    if (missingFunctions.length !== 0) throw new TypeError("Custom cacheMap missing methods: " + missingFunctions.join(", "));
  }
  return cacheMap;
}
function getValidName(options) {
  if (options && options.name) return options.name;
  return null;
}
function isArrayLike(x) {
  return typeof x === "object" && x !== null && "length" in x && typeof x.length === "number" && (x.length === 0 || x.length > 0 && Object.prototype.hasOwnProperty.call(x, x.length - 1));
}

// node_modules/@mysten/bcs/dist/utils.mjs
function encodeStr(data, encoding) {
  switch (encoding) {
    case "base58":
      return toBase58(data);
    case "base64":
      return toBase64(data);
    case "hex":
      return toHex(data);
    default:
      throw new Error("Unsupported encoding, supported values are: base64, hex");
  }
}
function splitGenericParameters(str, genericSeparators = ["<", ">"]) {
  const [left, right] = genericSeparators;
  const tok = [];
  let word = "";
  let nestedAngleBrackets = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === left) nestedAngleBrackets++;
    if (char === right) nestedAngleBrackets--;
    if (nestedAngleBrackets === 0 && char === ",") {
      tok.push(word.trim());
      word = "";
      continue;
    }
    word += char;
  }
  tok.push(word.trim());
  return tok;
}

// node_modules/@mysten/bcs/dist/writer.mjs
var BcsWriter = class {
  constructor({ initialSize = 1024, maxSize = Infinity, allocateSize = 1024 } = {}) {
    this.bytePosition = 0;
    this.size = initialSize;
    this.maxSize = maxSize;
    this.allocateSize = allocateSize;
    this.dataView = new DataView(new ArrayBuffer(initialSize));
  }
  ensureSizeOrGrow(bytes) {
    const requiredSize = this.bytePosition + bytes;
    if (requiredSize > this.size) {
      const nextSize = Math.min(this.maxSize, Math.max(this.size + requiredSize, this.size + this.allocateSize));
      if (requiredSize > nextSize) throw new Error(`Attempting to serialize to BCS, but buffer does not have enough size. Allocated size: ${this.size}, Max size: ${this.maxSize}, Required size: ${requiredSize}`);
      this.size = nextSize;
      const nextBuffer = new ArrayBuffer(this.size);
      new Uint8Array(nextBuffer).set(new Uint8Array(this.dataView.buffer));
      this.dataView = new DataView(nextBuffer);
    }
  }
  /**
  * Shift current cursor position by `bytes`.
  *
  * @param {Number} bytes Number of bytes to
  * @returns {this} Self for possible chaining.
  */
  shift(bytes) {
    this.bytePosition += bytes;
    return this;
  }
  /**
  * Write a U8 value into a buffer and shift cursor position by 1.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  write8(value) {
    this.ensureSizeOrGrow(1);
    this.dataView.setUint8(this.bytePosition, Number(value));
    return this.shift(1);
  }
  /**
  * Write a U8 value into a buffer and shift cursor position by 1.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  writeBytes(bytes) {
    this.ensureSizeOrGrow(bytes.length);
    for (let i = 0; i < bytes.length; i++) this.dataView.setUint8(this.bytePosition + i, bytes[i]);
    return this.shift(bytes.length);
  }
  /**
  * Write a U16 value into a buffer and shift cursor position by 2.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  write16(value) {
    this.ensureSizeOrGrow(2);
    this.dataView.setUint16(this.bytePosition, Number(value), true);
    return this.shift(2);
  }
  /**
  * Write a U32 value into a buffer and shift cursor position by 4.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  write32(value) {
    this.ensureSizeOrGrow(4);
    this.dataView.setUint32(this.bytePosition, Number(value), true);
    return this.shift(4);
  }
  /**
  * Write a U64 value into a buffer and shift cursor position by 8.
  * @param {bigint} value Value to write.
  * @returns {this}
  */
  write64(value) {
    toLittleEndian(BigInt(value), 8).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a U128 value into a buffer and shift cursor position by 16.
  *
  * @param {bigint} value Value to write.
  * @returns {this}
  */
  write128(value) {
    toLittleEndian(BigInt(value), 16).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a U256 value into a buffer and shift cursor position by 16.
  *
  * @param {bigint} value Value to write.
  * @returns {this}
  */
  write256(value) {
    toLittleEndian(BigInt(value), 32).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a ULEB value into a buffer and shift cursor position by number of bytes
  * written.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  writeULEB(value) {
    ulebEncode(value).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a vector into a buffer by first writing the vector length and then calling
  * a callback on each passed value.
  *
  * @param {Array<Any>} vector Array of elements to write.
  * @param {WriteVecCb} cb Callback to call on each element of the vector.
  * @returns {this}
  */
  writeVec(vector2, cb) {
    this.writeULEB(vector2.length);
    Array.from(vector2).forEach((el, i) => cb(this, el, i, vector2.length));
    return this;
  }
  /**
  * Adds support for iterations over the object.
  * @returns {Uint8Array}
  */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.bytePosition; i++) yield this.dataView.getUint8(i);
    return this.toBytes();
  }
  /**
  * Get underlying buffer taking only value bytes (in case initial buffer size was bigger).
  * @returns {Uint8Array} Resulting bcs.
  */
  toBytes() {
    return new Uint8Array(this.dataView.buffer.slice(0, this.bytePosition));
  }
  /**
  * Represent data as 'hex' or 'base64'
  * @param encoding Encoding to use: 'base64' or 'hex'
  */
  toString(encoding) {
    return encodeStr(this.toBytes(), encoding);
  }
};
function toLittleEndian(bigint2, size) {
  const result = new Uint8Array(size);
  let i = 0;
  while (bigint2 > 0) {
    result[i] = Number(bigint2 % BigInt(256));
    bigint2 = bigint2 / BigInt(256);
    i += 1;
  }
  return result;
}

// node_modules/@mysten/bcs/dist/bcs-type.mjs
var BcsType = class BcsType2 {
  #write;
  #serialize;
  constructor(options) {
    this.name = options.name;
    this.read = options.read;
    this.serializedSize = options.serializedSize ?? (() => null);
    this.#write = options.write;
    this.#serialize = options.serialize ?? ((value, options$1) => {
      const writer = new BcsWriter({
        initialSize: this.serializedSize(value) ?? void 0,
        ...options$1
      });
      this.#write(value, writer);
      return writer.toBytes();
    });
    this.validate = options.validate ?? (() => {
    });
  }
  write(value, writer) {
    this.validate(value);
    this.#write(value, writer);
  }
  serialize(value, options) {
    this.validate(value);
    return new SerializedBcs(this, this.#serialize(value, options));
  }
  parse(bytes) {
    const reader = new BcsReader(bytes);
    return this.read(reader);
  }
  fromHex(hex) {
    return this.parse(fromHex(hex));
  }
  fromBase58(b64) {
    return this.parse(fromBase58(b64));
  }
  fromBase64(b64) {
    return this.parse(fromBase64(b64));
  }
  transform({ name, input, output, validate: validate2 }) {
    return new BcsType2({
      name: name ?? this.name,
      read: (reader) => output ? output(this.read(reader)) : this.read(reader),
      write: (value, writer) => this.#write(input ? input(value) : value, writer),
      serializedSize: (value) => this.serializedSize(input ? input(value) : value),
      serialize: (value, options) => this.#serialize(input ? input(value) : value, options),
      validate: (value) => {
        validate2?.(value);
        this.validate(input ? input(value) : value);
      }
    });
  }
};
var SERIALIZED_BCS_BRAND = /* @__PURE__ */ Symbol.for("@mysten/serialized-bcs");
function isSerializedBcs(obj) {
  return !!obj && typeof obj === "object" && obj[SERIALIZED_BCS_BRAND] === true;
}
var SerializedBcs = class {
  #schema;
  #bytes;
  get [SERIALIZED_BCS_BRAND]() {
    return true;
  }
  constructor(schema, bytes) {
    this.#schema = schema;
    this.#bytes = bytes;
  }
  toBytes() {
    return this.#bytes;
  }
  toHex() {
    return toHex(this.#bytes);
  }
  toBase64() {
    return toBase64(this.#bytes);
  }
  toBase58() {
    return toBase58(this.#bytes);
  }
  parse() {
    return this.#schema.parse(this.#bytes);
  }
};
function fixedSizeBcsType({ size, ...options }) {
  return new BcsType({
    ...options,
    serializedSize: () => size
  });
}
function uIntBcsType({ readMethod, writeMethod, ...options }) {
  return fixedSizeBcsType({
    ...options,
    read: (reader) => reader[readMethod](),
    write: (value, writer) => writer[writeMethod](value),
    validate: (value) => {
      if (value < 0 || value > options.maxValue) throw new TypeError(`Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`);
      options.validate?.(value);
    }
  });
}
function bigUIntBcsType({ readMethod, writeMethod, ...options }) {
  return fixedSizeBcsType({
    ...options,
    read: (reader) => reader[readMethod](),
    write: (value, writer) => writer[writeMethod](BigInt(value)),
    validate: (val) => {
      const value = BigInt(val);
      if (value < 0 || value > options.maxValue) throw new TypeError(`Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`);
      options.validate?.(value);
    }
  });
}
function dynamicSizeBcsType({ serialize, ...options }) {
  const type = new BcsType({
    ...options,
    serialize,
    write: (value, writer) => {
      for (const byte of type.serialize(value).toBytes()) writer.write8(byte);
    }
  });
  return type;
}
function stringLikeBcsType({ toBytes, fromBytes, ...options }) {
  return new BcsType({
    ...options,
    read: (reader) => {
      const length = reader.readULEB();
      return fromBytes(reader.readBytes(length));
    },
    write: (hex, writer) => {
      const bytes = toBytes(hex);
      writer.writeULEB(bytes.length);
      for (let i = 0; i < bytes.length; i++) writer.write8(bytes[i]);
    },
    serialize: (value) => {
      const bytes = toBytes(value);
      const size = ulebEncode(bytes.length);
      const result = new Uint8Array(size.length + bytes.length);
      result.set(size, 0);
      result.set(bytes, size.length);
      return result;
    },
    validate: (value) => {
      if (typeof value !== "string") throw new TypeError(`Invalid ${options.name} value: ${value}. Expected string`);
      options.validate?.(value);
    }
  });
}
function lazyBcsType(cb) {
  let lazyType = null;
  function getType() {
    if (!lazyType) lazyType = cb();
    return lazyType;
  }
  return new BcsType({
    name: "lazy",
    read: (data) => getType().read(data),
    serializedSize: (value) => getType().serializedSize(value),
    write: (value, writer) => getType().write(value, writer),
    serialize: (value, options) => getType().serialize(value, options).toBytes()
  });
}
var BcsStruct = class extends BcsType {
  constructor({ name, fields, ...options }) {
    const canonicalOrder = Object.entries(fields);
    super({
      name,
      serializedSize: (values) => {
        let total = 0;
        for (const [field, type] of canonicalOrder) {
          const size = type.serializedSize(values[field]);
          if (size == null) return null;
          total += size;
        }
        return total;
      },
      read: (reader) => {
        const result = {};
        for (const [field, type] of canonicalOrder) result[field] = type.read(reader);
        return result;
      },
      write: (value, writer) => {
        for (const [field, type] of canonicalOrder) type.write(value[field], writer);
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "object" || value == null) throw new TypeError(`Expected object, found ${typeof value}`);
      }
    });
  }
};
var BcsEnum = class extends BcsType {
  constructor({ fields, ...options }) {
    const canonicalOrder = Object.entries(fields);
    super({
      read: (reader) => {
        const index = reader.readULEB();
        const enumEntry = canonicalOrder[index];
        if (!enumEntry) throw new TypeError(`Unknown value ${index} for enum ${options.name}`);
        const [kind, type] = enumEntry;
        return {
          [kind]: type?.read(reader) ?? true,
          $kind: kind
        };
      },
      write: (value, writer) => {
        const [name, val] = Object.entries(value).filter(([name$1]) => Object.hasOwn(fields, name$1))[0];
        for (let i = 0; i < canonicalOrder.length; i++) {
          const [optionName, optionType] = canonicalOrder[i];
          if (optionName === name) {
            writer.writeULEB(i);
            optionType?.write(val, writer);
            return;
          }
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "object" || value == null) throw new TypeError(`Expected object, found ${typeof value}`);
        const keys = Object.keys(value).filter((k) => value[k] !== void 0 && Object.hasOwn(fields, k));
        if (keys.length !== 1) throw new TypeError(`Expected object with one key, but found ${keys.length} for type ${options.name}}`);
        const [variant] = keys;
        if (!Object.hasOwn(fields, variant)) throw new TypeError(`Invalid enum variant ${variant}`);
      }
    });
  }
};
var BcsTuple = class extends BcsType {
  constructor({ fields, name, ...options }) {
    super({
      name: name ?? `(${fields.map((t) => t.name).join(", ")})`,
      serializedSize: (values) => {
        let total = 0;
        for (let i = 0; i < fields.length; i++) {
          const size = fields[i].serializedSize(values[i]);
          if (size == null) return null;
          total += size;
        }
        return total;
      },
      read: (reader) => {
        const result = [];
        for (const field of fields) result.push(field.read(reader));
        return result;
      },
      write: (value, writer) => {
        for (let i = 0; i < fields.length; i++) fields[i].write(value[i], writer);
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (!Array.isArray(value)) throw new TypeError(`Expected array, found ${typeof value}`);
        if (value.length !== fields.length) throw new TypeError(`Expected array of length ${fields.length}, found ${value.length}`);
      }
    });
  }
};

// node_modules/@mysten/bcs/dist/bcs.mjs
function fixedArray(size, type, options) {
  return new BcsType({
    read: (reader) => {
      const result = new Array(size);
      for (let i = 0; i < size; i++) result[i] = type.read(reader);
      return result;
    },
    write: (value, writer) => {
      for (const item of value) type.write(item, writer);
    },
    ...options,
    name: options?.name ?? `${type.name}[${size}]`,
    validate: (value) => {
      options?.validate?.(value);
      if (!value || typeof value !== "object" || !("length" in value)) throw new TypeError(`Expected array, found ${typeof value}`);
      if (value.length !== size) throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
    }
  });
}
function option(type) {
  return bcs.enum(`Option<${type.name}>`, {
    None: null,
    Some: type
  }).transform({
    input: (value) => {
      if (value == null) return { None: true };
      return { Some: value };
    },
    output: (value) => {
      if (value.$kind === "Some") return value.Some;
      return null;
    }
  });
}
function vector(type, options) {
  return new BcsType({
    read: (reader) => {
      const length = reader.readULEB();
      const result = new Array(length);
      for (let i = 0; i < length; i++) result[i] = type.read(reader);
      return result;
    },
    write: (value, writer) => {
      writer.writeULEB(value.length);
      for (const item of value) type.write(item, writer);
    },
    ...options,
    name: options?.name ?? `vector<${type.name}>`,
    validate: (value) => {
      options?.validate?.(value);
      if (!value || typeof value !== "object" || !("length" in value)) throw new TypeError(`Expected array, found ${typeof value}`);
    }
  });
}
function compareBcsBytes(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
function map(keyType, valueType) {
  return new BcsType({
    name: `Map<${keyType.name}, ${valueType.name}>`,
    read: (reader) => {
      const length = reader.readULEB();
      const result = /* @__PURE__ */ new Map();
      for (let i = 0; i < length; i++) result.set(keyType.read(reader), valueType.read(reader));
      return result;
    },
    write: (value, writer) => {
      const entries = [...value.entries()].map(([key, val]) => [keyType.serialize(key).toBytes(), val]);
      entries.sort(([a], [b]) => compareBcsBytes(a, b));
      writer.writeULEB(entries.length);
      for (const [keyBytes, val] of entries) {
        writer.writeBytes(keyBytes);
        valueType.write(val, writer);
      }
    }
  });
}
var bcs = {
  u8(options) {
    return uIntBcsType({
      readMethod: "read8",
      writeMethod: "write8",
      size: 1,
      maxValue: 2 ** 8 - 1,
      ...options,
      name: options?.name ?? "u8"
    });
  },
  u16(options) {
    return uIntBcsType({
      readMethod: "read16",
      writeMethod: "write16",
      size: 2,
      maxValue: 2 ** 16 - 1,
      ...options,
      name: options?.name ?? "u16"
    });
  },
  u32(options) {
    return uIntBcsType({
      readMethod: "read32",
      writeMethod: "write32",
      size: 4,
      maxValue: 2 ** 32 - 1,
      ...options,
      name: options?.name ?? "u32"
    });
  },
  u64(options) {
    return bigUIntBcsType({
      readMethod: "read64",
      writeMethod: "write64",
      size: 8,
      maxValue: 2n ** 64n - 1n,
      ...options,
      name: options?.name ?? "u64"
    });
  },
  u128(options) {
    return bigUIntBcsType({
      readMethod: "read128",
      writeMethod: "write128",
      size: 16,
      maxValue: 2n ** 128n - 1n,
      ...options,
      name: options?.name ?? "u128"
    });
  },
  u256(options) {
    return bigUIntBcsType({
      readMethod: "read256",
      writeMethod: "write256",
      size: 32,
      maxValue: 2n ** 256n - 1n,
      ...options,
      name: options?.name ?? "u256"
    });
  },
  bool(options) {
    return fixedSizeBcsType({
      size: 1,
      read: (reader) => reader.read8() === 1,
      write: (value, writer) => writer.write8(value ? 1 : 0),
      ...options,
      name: options?.name ?? "bool",
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "boolean") throw new TypeError(`Expected boolean, found ${typeof value}`);
      }
    });
  },
  uleb128(options) {
    return dynamicSizeBcsType({
      read: (reader) => reader.readULEB(),
      serialize: (value) => {
        return Uint8Array.from(ulebEncode(value));
      },
      ...options,
      name: options?.name ?? "uleb128"
    });
  },
  bytes(size, options) {
    return fixedSizeBcsType({
      size,
      read: (reader) => reader.readBytes(size),
      write: (value, writer) => {
        writer.writeBytes(new Uint8Array(value));
      },
      ...options,
      name: options?.name ?? `bytes[${size}]`,
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value)) throw new TypeError(`Expected array, found ${typeof value}`);
        if (value.length !== size) throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
      }
    });
  },
  byteVector(options) {
    return new BcsType({
      read: (reader) => {
        const length = reader.readULEB();
        return reader.readBytes(length);
      },
      write: (value, writer) => {
        const array2 = new Uint8Array(value);
        writer.writeULEB(array2.length);
        writer.writeBytes(array2);
      },
      ...options,
      name: options?.name ?? "vector<u8>",
      serializedSize: (value) => {
        const length = "length" in value ? value.length : null;
        return length == null ? null : ulebEncode(length).length + length;
      },
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value)) throw new TypeError(`Expected array, found ${typeof value}`);
      }
    });
  },
  string(options) {
    return stringLikeBcsType({
      toBytes: (value) => new TextEncoder().encode(value),
      fromBytes: (bytes) => new TextDecoder().decode(bytes),
      ...options,
      name: options?.name ?? "string"
    });
  },
  fixedArray,
  option,
  vector,
  tuple(fields, options) {
    return new BcsTuple({
      fields,
      ...options
    });
  },
  struct(name, fields, options) {
    return new BcsStruct({
      name,
      fields,
      ...options
    });
  },
  enum(name, fields, options) {
    return new BcsEnum({
      name,
      fields,
      ...options
    });
  },
  map,
  lazy(cb) {
    return lazyBcsType(cb);
  }
};

// node_modules/@mysten/sui/dist/utils/sui-types.mjs
var TX_DIGEST_LENGTH = 32;
function isValidTransactionDigest(value) {
  try {
    return fromBase58(value).length === TX_DIGEST_LENGTH;
  } catch {
    return false;
  }
}
var SUI_ADDRESS_LENGTH = 32;
function isValidSuiAddress(value) {
  return isHex(value) && getHexByteLength(value) === SUI_ADDRESS_LENGTH;
}
function isValidSuiObjectId(value) {
  return isValidSuiAddress(value);
}
var MOVE_IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
function isValidMoveIdentifier(name) {
  return MOVE_IDENTIFIER_REGEX.test(name);
}
var PRIMITIVE_TYPE_TAGS = [
  "bool",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "u256",
  "address",
  "signer"
];
var VECTOR_TYPE_REGEX = /^vector<(.+)>$/;
function isValidTypeTag(type) {
  if (PRIMITIVE_TYPE_TAGS.includes(type)) return true;
  const vectorMatch = type.match(VECTOR_TYPE_REGEX);
  if (vectorMatch) return isValidTypeTag(vectorMatch[1]);
  if (type.includes("::")) return isValidStructTag(type);
  return false;
}
function isValidParsedStructTag(tag) {
  if (!isValidSuiAddress(tag.address) && !isValidNamedPackage(tag.address)) return false;
  if (!isValidMoveIdentifier(tag.module) || !isValidMoveIdentifier(tag.name)) return false;
  return tag.typeParams.every((param) => {
    if (typeof param === "string") return isValidTypeTag(param);
    return isValidParsedStructTag(param);
  });
}
function isValidStructTag(type) {
  try {
    return isValidParsedStructTag(parseStructTag(type));
  } catch {
    return false;
  }
}
function parseTypeTag(type) {
  if (type.startsWith("vector<")) {
    if (!type.endsWith(">")) throw new Error(`Invalid type tag: ${type}`);
    const inner = type.slice(7, -1);
    if (!inner) throw new Error(`Invalid type tag: ${type}`);
    const parsed = parseTypeTag(inner);
    if (typeof parsed === "string") return `vector<${parsed}>`;
    return `vector<${normalizeStructTag(parsed)}>`;
  }
  if (!type.includes("::")) return type;
  return parseStructTag(type);
}
function parseStructTag(type) {
  const parts = type.split("::");
  if (parts.length < 3) throw new Error(`Invalid struct tag: ${type}`);
  const [address, module] = parts;
  if (!address || !module) throw new Error(`Invalid struct tag: ${type}`);
  const isMvrPackage = isValidNamedPackage(address);
  const rest = type.slice(address.length + module.length + 4);
  const name = rest.includes("<") ? rest.slice(0, rest.indexOf("<")) : rest;
  if (!name || rest.includes("<") && !rest.endsWith(">")) throw new Error(`Invalid struct tag: ${type}`);
  const typeParams = rest.includes("<") ? splitGenericParameters(rest.slice(rest.indexOf("<") + 1, rest.lastIndexOf(">"))).map((typeParam) => parseTypeTag(typeParam.trim())) : [];
  return {
    address: isMvrPackage ? address : normalizeSuiAddress(address),
    module,
    name,
    typeParams
  };
}
function normalizeStructTag(type) {
  if (typeof type === "string" && type.startsWith("vector<")) throw new Error("normalizeStructTag does not support vector types. Use normalizeTypeTag instead.");
  const { address, module, name, typeParams } = typeof type === "string" ? parseStructTag(type) : type;
  return `${address}::${module}::${name}${typeParams?.length > 0 ? `<${typeParams.map((typeParam) => typeof typeParam === "string" ? typeParam : normalizeStructTag(typeParam)).join(",")}>` : ""}`;
}
function normalizeSuiAddress(value, forceAdd0x = false) {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith("0x")) address = address.slice(2);
  return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, "0")}`;
}
function normalizeSuiObjectId(value, forceAdd0x = false) {
  return normalizeSuiAddress(value, forceAdd0x);
}
function isHex(value) {
  return /^(0x|0X)?[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
}
function getHexByteLength(value) {
  return /^(0x|0X)/.test(value) ? (value.length - 2) / 2 : value.length / 2;
}

// node_modules/@mysten/sui/dist/bcs/type-tag-serializer.mjs
var VECTOR_REGEX = /^vector<(.+)>$/;
var STRUCT_REGEX = /^([^:]+)::([^:]+)::([^<]+)(<(.+)>)?/;
var TypeTagSerializer = class TypeTagSerializer2 {
  static parseFromStr(str, normalizeAddress = false) {
    if (str === "address") return { address: null };
    else if (str === "bool") return { bool: null };
    else if (str === "u8") return { u8: null };
    else if (str === "u16") return { u16: null };
    else if (str === "u32") return { u32: null };
    else if (str === "u64") return { u64: null };
    else if (str === "u128") return { u128: null };
    else if (str === "u256") return { u256: null };
    else if (str === "signer") return { signer: null };
    const vectorMatch = str.match(VECTOR_REGEX);
    if (vectorMatch) return { vector: TypeTagSerializer2.parseFromStr(vectorMatch[1], normalizeAddress) };
    const structMatch = str.match(STRUCT_REGEX);
    if (structMatch) return { struct: {
      address: normalizeAddress ? normalizeSuiAddress(structMatch[1]) : structMatch[1],
      module: structMatch[2],
      name: structMatch[3],
      typeParams: structMatch[5] === void 0 ? [] : TypeTagSerializer2.parseStructTypeArgs(structMatch[5], normalizeAddress)
    } };
    throw new Error(`Encountered unexpected token when parsing type args for ${str}`);
  }
  static parseStructTypeArgs(str, normalizeAddress = false) {
    return splitGenericParameters(str).map((tok) => TypeTagSerializer2.parseFromStr(tok, normalizeAddress));
  }
  static tagToString(tag) {
    if ("bool" in tag) return "bool";
    if ("u8" in tag) return "u8";
    if ("u16" in tag) return "u16";
    if ("u32" in tag) return "u32";
    if ("u64" in tag) return "u64";
    if ("u128" in tag) return "u128";
    if ("u256" in tag) return "u256";
    if ("address" in tag) return "address";
    if ("signer" in tag) return "signer";
    if ("vector" in tag) return `vector<${TypeTagSerializer2.tagToString(tag.vector)}>`;
    if ("struct" in tag) {
      const struct = tag.struct;
      const typeParams = struct.typeParams.map(TypeTagSerializer2.tagToString).join(", ");
      return `${struct.address}::${struct.module}::${struct.name}${typeParams ? `<${typeParams}>` : ""}`;
    }
    throw new Error("Invalid TypeTag");
  }
};

// node_modules/@mysten/sui/dist/bcs/bcs.mjs
function unsafe_u64(options) {
  return bcs.u64({
    name: "unsafe_u64",
    ...options
  }).transform({
    input: (val) => val,
    output: (val) => Number(val)
  });
}
function optionEnum(type) {
  return bcs.enum("Option", {
    None: null,
    Some: type
  });
}
var Address = bcs.bytes(SUI_ADDRESS_LENGTH).transform({
  validate: (val) => {
    const address = typeof val === "string" ? val : toHex(val);
    if (!address || !isValidSuiAddress(normalizeSuiAddress(address))) throw new Error(`Invalid Sui address ${address}`);
  },
  input: (val) => typeof val === "string" ? fromHex(normalizeSuiAddress(val)) : val,
  output: (val) => normalizeSuiAddress(toHex(val))
});
var ObjectDigest = bcs.byteVector().transform({
  name: "ObjectDigest",
  input: (value) => fromBase58(value),
  output: (value) => toBase58(new Uint8Array(value)),
  validate: (value) => {
    if (fromBase58(value).length !== 32) throw new Error("ObjectDigest must be 32 bytes");
  }
});
var SuiObjectRef = bcs.struct("SuiObjectRef", {
  objectId: Address,
  version: bcs.u64(),
  digest: ObjectDigest
});
var SharedObjectRef = bcs.struct("SharedObjectRef", {
  objectId: Address,
  initialSharedVersion: bcs.u64(),
  mutable: bcs.bool()
});
var ObjectArg = bcs.enum("ObjectArg", {
  ImmOrOwnedObject: SuiObjectRef,
  SharedObject: SharedObjectRef,
  Receiving: SuiObjectRef
});
var Owner = bcs.enum("Owner", {
  AddressOwner: Address,
  ObjectOwner: Address,
  Shared: bcs.struct("Shared", { initialSharedVersion: bcs.u64() }),
  Immutable: null,
  ConsensusAddressOwner: bcs.struct("ConsensusAddressOwner", {
    startVersion: bcs.u64(),
    owner: Address
  })
});
var Reservation = bcs.enum("Reservation", { MaxAmountU64: bcs.u64() });
var WithdrawalType = bcs.enum("WithdrawalType", { Balance: bcs.lazy(() => TypeTag) });
var WithdrawFrom = bcs.enum("WithdrawFrom", {
  Sender: null,
  Sponsor: null
});
var FundsWithdrawal = bcs.struct("FundsWithdrawal", {
  reservation: Reservation,
  typeArg: WithdrawalType,
  withdrawFrom: WithdrawFrom
});
var CallArg = bcs.enum("CallArg", {
  Pure: bcs.struct("Pure", { bytes: bcs.byteVector().transform({
    input: (val) => typeof val === "string" ? fromBase64(val) : val,
    output: (val) => toBase64(new Uint8Array(val))
  }) }),
  Object: ObjectArg,
  FundsWithdrawal
});
var InnerTypeTag = bcs.enum("TypeTag", {
  bool: null,
  u8: null,
  u64: null,
  u128: null,
  address: null,
  signer: null,
  vector: bcs.lazy(() => InnerTypeTag),
  struct: bcs.lazy(() => StructTag),
  u16: null,
  u32: null,
  u256: null
});
var TypeTag = InnerTypeTag.transform({
  input: (typeTag) => typeof typeTag === "string" ? TypeTagSerializer.parseFromStr(typeTag, true) : typeTag,
  output: (typeTag) => TypeTagSerializer.tagToString(typeTag)
});
var Argument = bcs.enum("Argument", {
  GasCoin: null,
  Input: bcs.u16(),
  Result: bcs.u16(),
  NestedResult: bcs.tuple([bcs.u16(), bcs.u16()])
});
var ProgrammableMoveCall = bcs.struct("ProgrammableMoveCall", {
  package: Address,
  module: bcs.string(),
  function: bcs.string(),
  typeArguments: bcs.vector(TypeTag),
  arguments: bcs.vector(Argument)
});
var Command = bcs.enum("Command", {
  MoveCall: ProgrammableMoveCall,
  TransferObjects: bcs.struct("TransferObjects", {
    objects: bcs.vector(Argument),
    address: Argument
  }),
  SplitCoins: bcs.struct("SplitCoins", {
    coin: Argument,
    amounts: bcs.vector(Argument)
  }),
  MergeCoins: bcs.struct("MergeCoins", {
    destination: Argument,
    sources: bcs.vector(Argument)
  }),
  Publish: bcs.struct("Publish", {
    modules: bcs.vector(bcs.byteVector().transform({
      input: (val) => typeof val === "string" ? fromBase64(val) : val,
      output: (val) => toBase64(new Uint8Array(val))
    })),
    dependencies: bcs.vector(Address)
  }),
  MakeMoveVec: bcs.struct("MakeMoveVec", {
    type: optionEnum(TypeTag).transform({
      input: (val) => val === null ? { None: true } : { Some: val },
      output: (val) => val.Some ?? null
    }),
    elements: bcs.vector(Argument)
  }),
  Upgrade: bcs.struct("Upgrade", {
    modules: bcs.vector(bcs.byteVector().transform({
      input: (val) => typeof val === "string" ? fromBase64(val) : val,
      output: (val) => toBase64(new Uint8Array(val))
    })),
    dependencies: bcs.vector(Address),
    package: Address,
    ticket: Argument
  })
});
var ProgrammableTransaction = bcs.struct("ProgrammableTransaction", {
  inputs: bcs.vector(CallArg),
  commands: bcs.vector(Command)
});
var TransactionKind = bcs.enum("TransactionKind", {
  ProgrammableTransaction,
  ChangeEpoch: null,
  Genesis: null,
  ConsensusCommitPrologue: null
});
var ValidDuring = bcs.struct("ValidDuring", {
  minEpoch: bcs.option(bcs.u64()),
  maxEpoch: bcs.option(bcs.u64()),
  minTimestamp: bcs.option(bcs.u64()),
  maxTimestamp: bcs.option(bcs.u64()),
  chain: ObjectDigest,
  nonce: bcs.u32()
});
var TransactionExpiration = bcs.enum("TransactionExpiration", {
  None: null,
  Epoch: unsafe_u64(),
  ValidDuring
});
var StructTag = bcs.struct("StructTag", {
  address: Address,
  module: bcs.string(),
  name: bcs.string(),
  typeParams: bcs.vector(InnerTypeTag)
});
var GasData = bcs.struct("GasData", {
  payment: bcs.vector(SuiObjectRef),
  owner: Address,
  price: bcs.u64(),
  budget: bcs.u64()
});
var TransactionDataV1 = bcs.struct("TransactionDataV1", {
  kind: TransactionKind,
  sender: Address,
  gasData: GasData,
  expiration: TransactionExpiration
});
var TransactionData = bcs.enum("TransactionData", { V1: TransactionDataV1 });
var IntentScope = bcs.enum("IntentScope", {
  TransactionData: null,
  TransactionEffects: null,
  CheckpointSummary: null,
  PersonalMessage: null
});
var IntentVersion = bcs.enum("IntentVersion", { V0: null });
var AppId = bcs.enum("AppId", { Sui: null });
var Intent = bcs.struct("Intent", {
  scope: IntentScope,
  version: IntentVersion,
  appId: AppId
});
function IntentMessage(T) {
  return bcs.struct(`IntentMessage<${T.name}>`, {
    intent: Intent,
    value: T
  });
}
var CompressedSignature = bcs.enum("CompressedSignature", {
  ED25519: bcs.bytes(64),
  Secp256k1: bcs.bytes(64),
  Secp256r1: bcs.bytes(64),
  ZkLogin: bcs.byteVector(),
  Passkey: bcs.byteVector()
});
var PublicKey = bcs.enum("PublicKey", {
  ED25519: bcs.bytes(32),
  Secp256k1: bcs.bytes(33),
  Secp256r1: bcs.bytes(33),
  ZkLogin: bcs.byteVector(),
  Passkey: bcs.bytes(33)
});
var MultiSigPkMap = bcs.struct("MultiSigPkMap", {
  pubKey: PublicKey,
  weight: bcs.u8()
});
var MultiSigPublicKey = bcs.struct("MultiSigPublicKey", {
  pk_map: bcs.vector(MultiSigPkMap),
  threshold: bcs.u16()
});
var MultiSig = bcs.struct("MultiSig", {
  sigs: bcs.vector(CompressedSignature),
  bitmap: bcs.u16(),
  multisig_pk: MultiSigPublicKey
});
var base64String = bcs.byteVector().transform({
  input: (val) => typeof val === "string" ? fromBase64(val) : val,
  output: (val) => toBase64(new Uint8Array(val))
});
var SenderSignedTransaction = bcs.struct("SenderSignedTransaction", {
  intentMessage: IntentMessage(TransactionData),
  txSignatures: bcs.vector(base64String)
});
var SenderSignedData = bcs.vector(SenderSignedTransaction, { name: "SenderSignedData" });
var PasskeyAuthenticator = bcs.struct("PasskeyAuthenticator", {
  authenticatorData: bcs.byteVector(),
  clientDataJson: bcs.string(),
  userSignature: bcs.byteVector()
});
var MoveObjectType = bcs.enum("MoveObjectType", {
  Other: StructTag,
  GasCoin: null,
  StakedSui: null,
  Coin: TypeTag,
  AccumulatorBalanceWrapper: null
});
var TypeOrigin = bcs.struct("TypeOrigin", {
  moduleName: bcs.string(),
  datatypeName: bcs.string(),
  package: Address
});
var UpgradeInfo = bcs.struct("UpgradeInfo", {
  upgradedId: Address,
  upgradedVersion: bcs.u64()
});
var MovePackage = bcs.struct("MovePackage", {
  id: Address,
  version: bcs.u64(),
  moduleMap: bcs.map(bcs.string(), bcs.byteVector()),
  typeOriginTable: bcs.vector(TypeOrigin),
  linkageTable: bcs.map(Address, UpgradeInfo)
});
var MoveObject = bcs.struct("MoveObject", {
  type: MoveObjectType,
  hasPublicTransfer: bcs.bool(),
  version: bcs.u64(),
  contents: bcs.byteVector()
});
var Data = bcs.enum("Data", {
  Move: MoveObject,
  Package: MovePackage
});
var ObjectInner = bcs.struct("ObjectInner", {
  data: Data,
  owner: Owner,
  previousTransaction: ObjectDigest,
  storageRebate: bcs.u64()
});

// node_modules/@mysten/sui/dist/bcs/effects.mjs
var PackageUpgradeError = bcs.enum("PackageUpgradeError", {
  UnableToFetchPackage: bcs.struct("UnableToFetchPackage", { packageId: Address }),
  NotAPackage: bcs.struct("NotAPackage", { objectId: Address }),
  IncompatibleUpgrade: null,
  DigestDoesNotMatch: bcs.struct("DigestDoesNotMatch", { digest: bcs.byteVector() }),
  UnknownUpgradePolicy: bcs.struct("UnknownUpgradePolicy", { policy: bcs.u8() }),
  PackageIDDoesNotMatch: bcs.struct("PackageIDDoesNotMatch", {
    packageId: Address,
    ticketId: Address
  })
});
var ModuleId = bcs.struct("ModuleId", {
  address: Address,
  name: bcs.string()
});
var MoveLocation = bcs.struct("MoveLocation", {
  module: ModuleId,
  function: bcs.u16(),
  instruction: bcs.u16(),
  functionName: bcs.option(bcs.string())
});
var CommandArgumentError = bcs.enum("CommandArgumentError", {
  TypeMismatch: null,
  InvalidBCSBytes: null,
  InvalidUsageOfPureArg: null,
  InvalidArgumentToPrivateEntryFunction: null,
  IndexOutOfBounds: bcs.struct("IndexOutOfBounds", { idx: bcs.u16() }),
  SecondaryIndexOutOfBounds: bcs.struct("SecondaryIndexOutOfBounds", {
    resultIdx: bcs.u16(),
    secondaryIdx: bcs.u16()
  }),
  InvalidResultArity: bcs.struct("InvalidResultArity", { resultIdx: bcs.u16() }),
  InvalidGasCoinUsage: null,
  InvalidValueUsage: null,
  InvalidObjectByValue: null,
  InvalidObjectByMutRef: null,
  SharedObjectOperationNotAllowed: null,
  InvalidArgumentArity: null,
  InvalidTransferObject: null,
  InvalidMakeMoveVecNonObjectArgument: null,
  ArgumentWithoutValue: null,
  CannotMoveBorrowedValue: null,
  CannotWriteToExtendedReference: null,
  InvalidReferenceArgument: null
});
var TypeArgumentError = bcs.enum("TypeArgumentError", {
  TypeNotFound: null,
  ConstraintNotSatisfied: null
});
var ExecutionFailureStatus = bcs.enum("ExecutionFailureStatus", {
  InsufficientGas: null,
  InvalidGasObject: null,
  InvariantViolation: null,
  FeatureNotYetSupported: null,
  MoveObjectTooBig: bcs.struct("MoveObjectTooBig", {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64()
  }),
  MovePackageTooBig: bcs.struct("MovePackageTooBig", {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64()
  }),
  CircularObjectOwnership: bcs.struct("CircularObjectOwnership", { object: Address }),
  InsufficientCoinBalance: null,
  CoinBalanceOverflow: null,
  PublishErrorNonZeroAddress: null,
  SuiMoveVerificationError: null,
  MovePrimitiveRuntimeError: bcs.option(MoveLocation),
  MoveAbort: bcs.tuple([MoveLocation, bcs.u64()]),
  VMVerificationOrDeserializationError: null,
  VMInvariantViolation: null,
  FunctionNotFound: null,
  ArityMismatch: null,
  TypeArityMismatch: null,
  NonEntryFunctionInvoked: null,
  CommandArgumentError: bcs.struct("CommandArgumentError", {
    argIdx: bcs.u16(),
    kind: CommandArgumentError
  }),
  TypeArgumentError: bcs.struct("TypeArgumentError", {
    argumentIdx: bcs.u16(),
    kind: TypeArgumentError
  }),
  UnusedValueWithoutDrop: bcs.struct("UnusedValueWithoutDrop", {
    resultIdx: bcs.u16(),
    secondaryIdx: bcs.u16()
  }),
  InvalidPublicFunctionReturnType: bcs.struct("InvalidPublicFunctionReturnType", { idx: bcs.u16() }),
  InvalidTransferObject: null,
  EffectsTooLarge: bcs.struct("EffectsTooLarge", {
    currentSize: bcs.u64(),
    maxSize: bcs.u64()
  }),
  PublishUpgradeMissingDependency: null,
  PublishUpgradeDependencyDowngrade: null,
  PackageUpgradeError: bcs.struct("PackageUpgradeError", { upgradeError: PackageUpgradeError }),
  WrittenObjectsTooLarge: bcs.struct("WrittenObjectsTooLarge", {
    currentSize: bcs.u64(),
    maxSize: bcs.u64()
  }),
  CertificateDenied: null,
  SuiMoveVerificationTimedout: null,
  SharedObjectOperationNotAllowed: null,
  InputObjectDeleted: null,
  ExecutionCancelledDueToSharedObjectCongestion: bcs.struct("ExecutionCancelledDueToSharedObjectCongestion", { congested_objects: bcs.vector(Address) }),
  AddressDeniedForCoin: bcs.struct("AddressDeniedForCoin", {
    address: Address,
    coinType: bcs.string()
  }),
  CoinTypeGlobalPause: bcs.struct("CoinTypeGlobalPause", { coinType: bcs.string() }),
  ExecutionCancelledDueToRandomnessUnavailable: null,
  MoveVectorElemTooBig: bcs.struct("MoveVectorElemTooBig", {
    valueSize: bcs.u64(),
    maxScaledSize: bcs.u64()
  }),
  MoveRawValueTooBig: bcs.struct("MoveRawValueTooBig", {
    valueSize: bcs.u64(),
    maxScaledSize: bcs.u64()
  }),
  InvalidLinkage: null,
  InsufficientBalanceForWithdraw: null,
  NonExclusiveWriteInputObjectModified: bcs.struct("NonExclusiveWriteInputObjectModified", { id: Address })
});
var ExecutionStatus = bcs.enum("ExecutionStatus", {
  Success: null,
  Failure: bcs.struct("Failure", {
    error: ExecutionFailureStatus,
    command: bcs.option(bcs.u64())
  })
});
var GasCostSummary = bcs.struct("GasCostSummary", {
  computationCost: bcs.u64(),
  storageCost: bcs.u64(),
  storageRebate: bcs.u64(),
  nonRefundableStorageFee: bcs.u64()
});
var TransactionEffectsV1 = bcs.struct("TransactionEffectsV1", {
  status: ExecutionStatus,
  executedEpoch: bcs.u64(),
  gasUsed: GasCostSummary,
  modifiedAtVersions: bcs.vector(bcs.tuple([Address, bcs.u64()])),
  sharedObjects: bcs.vector(SuiObjectRef),
  transactionDigest: ObjectDigest,
  created: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  mutated: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  unwrapped: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  deleted: bcs.vector(SuiObjectRef),
  unwrappedThenDeleted: bcs.vector(SuiObjectRef),
  wrapped: bcs.vector(SuiObjectRef),
  gasObject: bcs.tuple([SuiObjectRef, Owner]),
  eventsDigest: bcs.option(ObjectDigest),
  dependencies: bcs.vector(ObjectDigest)
});
var VersionDigest = bcs.tuple([bcs.u64(), ObjectDigest]);
var ObjectIn = bcs.enum("ObjectIn", {
  NotExist: null,
  Exist: bcs.tuple([VersionDigest, Owner])
});
var AccumulatorAddress = bcs.struct("AccumulatorAddress", {
  address: Address,
  ty: TypeTag
});
var AccumulatorOperation = bcs.enum("AccumulatorOperation", {
  Merge: null,
  Split: null
});
var AccumulatorValue = bcs.enum("AccumulatorValue", {
  Integer: bcs.u64(),
  IntegerTuple: bcs.tuple([bcs.u64(), bcs.u64()]),
  EventDigest: bcs.vector(bcs.tuple([bcs.u64(), ObjectDigest]))
});
var AccumulatorWriteV1 = bcs.struct("AccumulatorWriteV1", {
  address: AccumulatorAddress,
  operation: AccumulatorOperation,
  value: AccumulatorValue
});
var ObjectOut = bcs.enum("ObjectOut", {
  NotExist: null,
  ObjectWrite: bcs.tuple([ObjectDigest, Owner]),
  PackageWrite: VersionDigest,
  AccumulatorWriteV1
});
var IDOperation = bcs.enum("IDOperation", {
  None: null,
  Created: null,
  Deleted: null
});
var EffectsObjectChange = bcs.struct("EffectsObjectChange", {
  inputState: ObjectIn,
  outputState: ObjectOut,
  idOperation: IDOperation
});
var UnchangedConsensusKind = bcs.enum("UnchangedConsensusKind", {
  ReadOnlyRoot: VersionDigest,
  MutateConsensusStreamEnded: bcs.u64(),
  ReadConsensusStreamEnded: bcs.u64(),
  Cancelled: bcs.u64(),
  PerEpochConfig: null
});
var TransactionEffectsV2 = bcs.struct("TransactionEffectsV2", {
  status: ExecutionStatus,
  executedEpoch: bcs.u64(),
  gasUsed: GasCostSummary,
  transactionDigest: ObjectDigest,
  gasObjectIndex: bcs.option(bcs.u32()),
  eventsDigest: bcs.option(ObjectDigest),
  dependencies: bcs.vector(ObjectDigest),
  lamportVersion: bcs.u64(),
  changedObjects: bcs.vector(bcs.tuple([Address, EffectsObjectChange])),
  unchangedConsensusObjects: bcs.vector(bcs.tuple([Address, UnchangedConsensusKind])),
  auxDataDigest: bcs.option(ObjectDigest)
});
var TransactionEffects = bcs.enum("TransactionEffects", {
  V1: TransactionEffectsV1,
  V2: TransactionEffectsV2
});

// node_modules/@mysten/sui/dist/bcs/pure.mjs
function pureBcsSchemaFromTypeName(name) {
  switch (name) {
    case "u8":
      return bcs.u8();
    case "u16":
      return bcs.u16();
    case "u32":
      return bcs.u32();
    case "u64":
      return bcs.u64();
    case "u128":
      return bcs.u128();
    case "u256":
      return bcs.u256();
    case "bool":
      return bcs.bool();
    case "string":
      return bcs.string();
    case "id":
    case "address":
      return Address;
  }
  const generic = name.match(/^(vector|option)<(.+)>$/);
  if (generic) {
    const [kind, inner] = generic.slice(1);
    if (kind === "vector") return bcs.vector(pureBcsSchemaFromTypeName(inner));
    else return bcs.option(pureBcsSchemaFromTypeName(inner));
  }
  throw new Error(`Invalid Pure type name: ${name}`);
}

// node_modules/@mysten/sui/dist/bcs/index.mjs
var suiBcs = {
  ...bcs,
  U8: bcs.u8(),
  U16: bcs.u16(),
  U32: bcs.u32(),
  U64: bcs.u64(),
  U128: bcs.u128(),
  U256: bcs.u256(),
  ULEB128: bcs.uleb128(),
  Bool: bcs.bool(),
  String: bcs.string(),
  Address,
  AppId,
  Argument,
  CallArg,
  Command,
  CompressedSignature,
  Data,
  GasData,
  Intent,
  IntentMessage,
  IntentScope,
  IntentVersion,
  MoveObject,
  MoveObjectType,
  MovePackage,
  MultiSig,
  MultiSigPkMap,
  MultiSigPublicKey,
  Object: ObjectInner,
  ObjectArg,
  ObjectDigest,
  Owner,
  PasskeyAuthenticator,
  ProgrammableMoveCall,
  ProgrammableTransaction,
  PublicKey,
  SenderSignedData,
  SenderSignedTransaction,
  SharedObjectRef,
  StructTag,
  SuiObjectRef,
  TransactionData,
  TransactionDataV1,
  TransactionEffects,
  TransactionExpiration,
  TransactionKind,
  TypeOrigin,
  TypeTag,
  UpgradeInfo
};

// node_modules/valibot/dist/index.mjs
var store$4;
var DEFAULT_CONFIG = {
  lang: void 0,
  message: void 0,
  abortEarly: void 0,
  abortPipeEarly: void 0
};
// @__NO_SIDE_EFFECTS__
function getGlobalConfig(config$1) {
  if (!config$1 && !store$4) return DEFAULT_CONFIG;
  return {
    lang: config$1?.lang ?? store$4?.lang,
    message: config$1?.message,
    abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
    abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
  };
}
var store$3;
// @__NO_SIDE_EFFECTS__
function getGlobalMessage(lang) {
  return store$3?.get(lang);
}
var store$2;
// @__NO_SIDE_EFFECTS__
function getSchemaMessage(lang) {
  return store$2?.get(lang);
}
var store$1;
// @__NO_SIDE_EFFECTS__
function getSpecificMessage(reference, lang) {
  return store$1?.get(reference)?.get(lang);
}
// @__NO_SIDE_EFFECTS__
function _stringify(input) {
  const type = typeof input;
  if (type === "string") return `"${input}"`;
  if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
  if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
  return type;
}
function _addIssue(context, label, dataset, config$1, other) {
  const input = other && "input" in other ? other.input : dataset.value;
  const expected = other?.expected ?? context.expects ?? null;
  const received = other?.received ?? /* @__PURE__ */ _stringify(input);
  const issue = {
    kind: context.kind,
    type: context.type,
    input,
    expected,
    received,
    message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
    requirement: context.requirement,
    path: other?.path,
    issues: other?.issues,
    lang: config$1.lang,
    abortEarly: config$1.abortEarly,
    abortPipeEarly: config$1.abortPipeEarly
  };
  const isSchema = context.kind === "schema";
  const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
  if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
  if (isSchema) dataset.typed = false;
  if (dataset.issues) dataset.issues.push(issue);
  else dataset.issues = [issue];
}
var _standardCache = /* @__PURE__ */ new WeakMap();
// @__NO_SIDE_EFFECTS__
function _getStandardProps(context) {
  let cached = _standardCache.get(context);
  if (!cached) {
    cached = {
      version: 1,
      vendor: "valibot",
      validate(value$1) {
        return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
      }
    };
    _standardCache.set(context, cached);
  }
  return cached;
}
// @__NO_SIDE_EFFECTS__
function _isValidObjectKey(object$1, key) {
  return Object.prototype.hasOwnProperty.call(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
// @__NO_SIDE_EFFECTS__
function _joinExpects(values$1, separator) {
  const list = [...new Set(values$1)];
  if (list.length > 1) return `(${list.join(` ${separator} `)})`;
  return list[0] ?? "never";
}
var ValiError = class extends Error {
  /**
  * Creates a Valibot error with useful information.
  *
  * @param issues The error issues.
  */
  constructor(issues) {
    super(issues[0].message);
    this.name = "ValiError";
    this.issues = issues;
  }
};
// @__NO_SIDE_EFFECTS__
function check(requirement, message$1) {
  return {
    kind: "validation",
    type: "check",
    reference: check,
    async: false,
    expects: null,
    requirement,
    message: message$1,
    "~run"(dataset, config$1) {
      if (dataset.typed && !this.requirement(dataset.value)) _addIssue(this, "input", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function integer(message$1) {
  return {
    kind: "validation",
    type: "integer",
    reference: integer,
    async: false,
    expects: null,
    requirement: Number.isInteger,
    message: message$1,
    "~run"(dataset, config$1) {
      if (dataset.typed && !this.requirement(dataset.value)) _addIssue(this, "integer", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function transform(operation) {
  return {
    kind: "transformation",
    type: "transform",
    reference: transform,
    async: false,
    operation,
    "~run"(dataset) {
      dataset.value = this.operation(dataset.value);
      return dataset;
    }
  };
}
var ABORT_EARLY_CONFIG = { abortEarly: true };
// @__NO_SIDE_EFFECTS__
function getFallback(schema, dataset, config$1) {
  return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
}
// @__NO_SIDE_EFFECTS__
function getDefault(schema, dataset, config$1) {
  return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
}
// @__NO_SIDE_EFFECTS__
function is(schema, input) {
  return !schema["~run"]({ value: input }, ABORT_EARLY_CONFIG).issues;
}
// @__NO_SIDE_EFFECTS__
function array(item, message$1) {
  return {
    kind: "schema",
    type: "array",
    reference: array,
    expects: "Array",
    async: false,
    item,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0; key < input.length; key++) {
          const value$1 = input[key];
          const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value$1
            };
            for (const issue of itemDataset.issues) {
              if (issue.path) issue.path.unshift(pathItem);
              else issue.path = [pathItem];
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) dataset.issues = itemDataset.issues;
            if (config$1.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed) dataset.typed = false;
          dataset.value.push(itemDataset.value);
        }
      } else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function bigint(message$1) {
  return {
    kind: "schema",
    type: "bigint",
    reference: bigint,
    expects: "bigint",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "bigint") dataset.typed = true;
      else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function boolean(message$1) {
  return {
    kind: "schema",
    type: "boolean",
    reference: boolean,
    expects: "boolean",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "boolean") dataset.typed = true;
      else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function lazy(getter) {
  return {
    kind: "schema",
    type: "lazy",
    reference: lazy,
    expects: "unknown",
    async: false,
    getter,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      return this.getter(dataset.value)["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function literal(literal_, message$1) {
  return {
    kind: "schema",
    type: "literal",
    reference: literal,
    expects: /* @__PURE__ */ _stringify(literal_),
    async: false,
    literal: literal_,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === this.literal) dataset.typed = true;
      else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function nullable(wrapped, default_) {
  return {
    kind: "schema",
    type: "nullable",
    reference: nullable,
    expects: `(${wrapped.expects} | null)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === null) {
        if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
        if (dataset.value === null) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function nullish(wrapped, default_) {
  return {
    kind: "schema",
    type: "nullish",
    reference: nullish,
    expects: `(${wrapped.expects} | null | undefined)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === null || dataset.value === void 0) {
        if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
        if (dataset.value === null || dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function number(message$1) {
  return {
    kind: "schema",
    type: "number",
    reference: number,
    expects: "number",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
      else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function object(entries$1, message$1) {
  return {
    kind: "schema",
    type: "object",
    reference: object,
    expects: "Object",
    async: false,
    entries: entries$1,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const key in this.entries) {
          const valueSchema = this.entries[key];
          if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
            const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
            const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
            if (valueDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "value",
                input,
                key,
                value: value$1
              };
              for (const issue of valueDataset.issues) {
                if (issue.path) issue.path.unshift(pathItem);
                else issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) dataset.issues = valueDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!valueDataset.typed) dataset.typed = false;
            dataset.value[key] = valueDataset.value;
          } else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
          else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
            _addIssue(this, "key", dataset, config$1, {
              input: void 0,
              expected: `"${key}"`,
              path: [{
                type: "object",
                origin: "key",
                input,
                key,
                value: input[key]
              }]
            });
            if (config$1.abortEarly) break;
          }
        }
      } else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function optional(wrapped, default_) {
  return {
    kind: "schema",
    type: "optional",
    reference: optional,
    expects: `(${wrapped.expects} | undefined)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === void 0) {
        if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
        if (dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function picklist(options, message$1) {
  return {
    kind: "schema",
    type: "picklist",
    reference: picklist,
    expects: /* @__PURE__ */ _joinExpects(options.map(_stringify), "|"),
    async: false,
    options,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (this.options.includes(dataset.value)) dataset.typed = true;
      else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function record(key, value$1, message$1) {
  return {
    kind: "schema",
    type: "record",
    reference: record,
    expects: "Object",
    async: false,
    key,
    value: value$1,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const entryKey in input) if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
          const entryValue = input[entryKey];
          const keyDataset = this.key["~run"]({ value: entryKey }, config$1);
          if (keyDataset.issues) {
            const pathItem = {
              type: "object",
              origin: "key",
              input,
              key: entryKey,
              value: entryValue
            };
            for (const issue of keyDataset.issues) {
              issue.path = [pathItem];
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) dataset.issues = keyDataset.issues;
            if (config$1.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          const valueDataset = this.value["~run"]({ value: entryValue }, config$1);
          if (valueDataset.issues) {
            const pathItem = {
              type: "object",
              origin: "value",
              input,
              key: entryKey,
              value: entryValue
            };
            for (const issue of valueDataset.issues) {
              if (issue.path) issue.path.unshift(pathItem);
              else issue.path = [pathItem];
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) dataset.issues = valueDataset.issues;
            if (config$1.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!keyDataset.typed || !valueDataset.typed) dataset.typed = false;
          if (keyDataset.typed) dataset.value[keyDataset.value] = valueDataset.value;
        }
      } else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function string(message$1) {
  return {
    kind: "schema",
    type: "string",
    reference: string,
    expects: "string",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "string") dataset.typed = true;
      else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function tuple(items, message$1) {
  return {
    kind: "schema",
    type: "tuple",
    reference: tuple,
    expects: "Array",
    async: false,
    items,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0; key < this.items.length; key++) {
          const value$1 = input[key];
          const itemDataset = this.items[key]["~run"]({ value: value$1 }, config$1);
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value$1
            };
            for (const issue of itemDataset.issues) {
              if (issue.path) issue.path.unshift(pathItem);
              else issue.path = [pathItem];
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) dataset.issues = itemDataset.issues;
            if (config$1.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed) dataset.typed = false;
          dataset.value.push(itemDataset.value);
        }
      } else _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function _subIssues(datasets) {
  let issues;
  if (datasets) for (const dataset of datasets) if (issues) for (const issue of dataset.issues) issues.push(issue);
  else issues = dataset.issues;
  return issues;
}
// @__NO_SIDE_EFFECTS__
function union(options, message$1) {
  return {
    kind: "schema",
    type: "union",
    reference: union,
    expects: /* @__PURE__ */ _joinExpects(options.map((option2) => option2.expects), "|"),
    async: false,
    options,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      let validDataset;
      let typedDatasets;
      let untypedDatasets;
      for (const schema of this.options) {
        const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
        if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
        else typedDatasets = [optionDataset];
        else {
          validDataset = optionDataset;
          break;
        }
        else if (untypedDatasets) untypedDatasets.push(optionDataset);
        else untypedDatasets = [optionDataset];
      }
      if (validDataset) return validDataset;
      if (typedDatasets) {
        if (typedDatasets.length === 1) return typedDatasets[0];
        _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
        dataset.typed = true;
      } else if (untypedDatasets?.length === 1) return untypedDatasets[0];
      else _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function unknown() {
  return {
    kind: "schema",
    type: "unknown",
    reference: unknown,
    expects: "unknown",
    async: false,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset) {
      dataset.typed = true;
      return dataset;
    }
  };
}
function parse(schema, input, config$1) {
  const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
  if (dataset.issues) throw new ValiError(dataset.issues);
  return dataset.value;
}
// @__NO_SIDE_EFFECTS__
function pipe(...pipe$1) {
  return {
    ...pipe$1[0],
    pipe: pipe$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      for (const item of pipe$1) if (item.kind !== "metadata") {
        if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
          dataset.typed = false;
          break;
        }
        if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
      }
      return dataset;
    }
  };
}

// node_modules/@mysten/sui/dist/transactions/data/internal.mjs
function safeEnum(options) {
  return union(Object.keys(options).map((key) => withKind(key, object({ [key]: options[key] }))));
}
function withKind(key, schema) {
  return pipe(object({
    ...schema.entries,
    $kind: optional(literal(key))
  }), transform((value) => ({
    ...value,
    $kind: key
  })));
}
var SuiAddress = pipe(string(), transform((value) => normalizeSuiAddress(value)), check(isValidSuiAddress));
var ObjectID = SuiAddress;
var BCSBytes = string();
var JsonU64 = pipe(union([string(), pipe(number(), integer())]), check((val) => {
  try {
    BigInt(val);
    return BigInt(val) >= 0 && BigInt(val) <= 18446744073709551615n;
  } catch {
    return false;
  }
}, "Invalid u64"));
var U32 = pipe(number(), integer(), check((val) => val >= 0 && val < 2 ** 32, "Invalid u32"));
var ObjectRefSchema = object({
  objectId: SuiAddress,
  version: JsonU64,
  digest: string()
});
var ArgumentSchema = union([
  withKind("GasCoin", object({ GasCoin: literal(true) })),
  withKind("Input", object({
    Input: pipe(number(), integer()),
    type: optional(union([
      literal("pure"),
      literal("object"),
      literal("withdrawal")
    ]))
  })),
  withKind("Result", object({ Result: pipe(number(), integer()) })),
  withKind("NestedResult", object({ NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())]) }))
]);
var GasDataSchema = object({
  budget: nullable(JsonU64),
  price: nullable(JsonU64),
  owner: nullable(SuiAddress),
  payment: nullable(array(ObjectRefSchema))
});
var StructTagSchema = object({
  address: string(),
  module: string(),
  name: string(),
  typeParams: array(string())
});
var OpenSignatureBodySchema = union([
  object({ $kind: literal("address") }),
  object({ $kind: literal("bool") }),
  object({ $kind: literal("u8") }),
  object({ $kind: literal("u16") }),
  object({ $kind: literal("u32") }),
  object({ $kind: literal("u64") }),
  object({ $kind: literal("u128") }),
  object({ $kind: literal("u256") }),
  object({ $kind: literal("unknown") }),
  object({
    $kind: literal("vector"),
    vector: lazy(() => OpenSignatureBodySchema)
  }),
  object({
    $kind: literal("datatype"),
    datatype: object({
      typeName: string(),
      typeParameters: array(lazy(() => OpenSignatureBodySchema))
    })
  }),
  object({
    $kind: literal("typeParameter"),
    index: pipe(number(), integer())
  })
]);
var OpenSignatureSchema = object({
  reference: nullable(union([
    literal("mutable"),
    literal("immutable"),
    literal("unknown")
  ])),
  body: OpenSignatureBodySchema
});
var ProgrammableMoveCallSchema = object({
  package: ObjectID,
  module: string(),
  function: string(),
  typeArguments: array(string()),
  arguments: array(ArgumentSchema),
  _argumentTypes: optional(nullable(array(OpenSignatureSchema)))
});
var $Intent = object({
  name: string(),
  inputs: record(string(), union([ArgumentSchema, array(ArgumentSchema)])),
  data: record(string(), unknown())
});
var CommandSchema = safeEnum({
  MoveCall: ProgrammableMoveCallSchema,
  TransferObjects: object({
    objects: array(ArgumentSchema),
    address: ArgumentSchema
  }),
  SplitCoins: object({
    coin: ArgumentSchema,
    amounts: array(ArgumentSchema)
  }),
  MergeCoins: object({
    destination: ArgumentSchema,
    sources: array(ArgumentSchema)
  }),
  Publish: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID)
  }),
  MakeMoveVec: object({
    type: nullable(string()),
    elements: array(ArgumentSchema)
  }),
  Upgrade: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID),
    package: ObjectID,
    ticket: ArgumentSchema
  }),
  $Intent
});
var ObjectArgSchema = safeEnum({
  ImmOrOwnedObject: ObjectRefSchema,
  SharedObject: object({
    objectId: ObjectID,
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRefSchema
});
var ReservationSchema = safeEnum({ MaxAmountU64: JsonU64 });
var WithdrawalTypeArgSchema = safeEnum({ Balance: string() });
var WithdrawFromSchema = safeEnum({
  Sender: literal(true),
  Sponsor: literal(true)
});
var FundsWithdrawalArgSchema = object({
  reservation: ReservationSchema,
  typeArg: WithdrawalTypeArgSchema,
  withdrawFrom: WithdrawFromSchema
});
var CallArgSchema = safeEnum({
  Object: ObjectArgSchema,
  Pure: object({ bytes: BCSBytes }),
  UnresolvedPure: object({ value: unknown() }),
  UnresolvedObject: object({
    objectId: ObjectID,
    version: optional(nullable(JsonU64)),
    digest: optional(nullable(string())),
    initialSharedVersion: optional(nullable(JsonU64)),
    mutable: optional(nullable(boolean()))
  }),
  FundsWithdrawal: FundsWithdrawalArgSchema
});
var NormalizedCallArg = safeEnum({
  Object: ObjectArgSchema,
  Pure: object({ bytes: BCSBytes })
});
var ValidDuringSchema = object({
  minEpoch: nullable(JsonU64),
  maxEpoch: nullable(JsonU64),
  minTimestamp: nullable(JsonU64),
  maxTimestamp: nullable(JsonU64),
  chain: string(),
  nonce: U32
});
var TransactionExpiration2 = safeEnum({
  None: literal(true),
  Epoch: JsonU64,
  ValidDuring: ValidDuringSchema
});
var TransactionDataSchema = object({
  version: literal(2),
  sender: nullish(SuiAddress),
  expiration: nullish(TransactionExpiration2),
  gasData: GasDataSchema,
  inputs: array(CallArgSchema),
  commands: array(CommandSchema)
});

// node_modules/@mysten/sui/dist/transactions/utils.mjs
function getIdFromCallArg(arg) {
  if (typeof arg === "string") return normalizeSuiAddress(arg);
  if (arg.Object) {
    if (arg.Object.ImmOrOwnedObject) return normalizeSuiAddress(arg.Object.ImmOrOwnedObject.objectId);
    if (arg.Object.Receiving) return normalizeSuiAddress(arg.Object.Receiving.objectId);
    return normalizeSuiAddress(arg.Object.SharedObject.objectId);
  }
  if (arg.UnresolvedObject) return normalizeSuiAddress(arg.UnresolvedObject.objectId);
}
function remapCommandArguments(command, inputMapping, commandMapping) {
  const remapArg = (arg) => {
    switch (arg.$kind) {
      case "Input": {
        const newInputIndex = inputMapping.get(arg.Input);
        if (newInputIndex === void 0) throw new Error(`Input ${arg.Input} not found in input mapping`);
        return {
          ...arg,
          Input: newInputIndex
        };
      }
      case "Result": {
        const newCommandIndex = commandMapping.get(arg.Result);
        if (newCommandIndex !== void 0) return {
          ...arg,
          Result: newCommandIndex
        };
        return arg;
      }
      case "NestedResult": {
        const newCommandIndex = commandMapping.get(arg.NestedResult[0]);
        if (newCommandIndex !== void 0) return {
          ...arg,
          NestedResult: [newCommandIndex, arg.NestedResult[1]]
        };
        return arg;
      }
      default:
        return arg;
    }
  };
  switch (command.$kind) {
    case "MoveCall":
      command.MoveCall.arguments = command.MoveCall.arguments.map(remapArg);
      break;
    case "TransferObjects":
      command.TransferObjects.objects = command.TransferObjects.objects.map(remapArg);
      command.TransferObjects.address = remapArg(command.TransferObjects.address);
      break;
    case "SplitCoins":
      command.SplitCoins.coin = remapArg(command.SplitCoins.coin);
      command.SplitCoins.amounts = command.SplitCoins.amounts.map(remapArg);
      break;
    case "MergeCoins":
      command.MergeCoins.destination = remapArg(command.MergeCoins.destination);
      command.MergeCoins.sources = command.MergeCoins.sources.map(remapArg);
      break;
    case "MakeMoveVec":
      command.MakeMoveVec.elements = command.MakeMoveVec.elements.map(remapArg);
      break;
    case "Upgrade":
      command.Upgrade.ticket = remapArg(command.Upgrade.ticket);
      break;
    case "$Intent": {
      const inputs = command.$Intent.inputs;
      command.$Intent.inputs = {};
      for (const [key, value] of Object.entries(inputs)) command.$Intent.inputs[key] = Array.isArray(value) ? value.map(remapArg) : remapArg(value);
      break;
    }
    case "Publish":
      break;
  }
}

// node_modules/@mysten/sui/dist/transactions/data/v1.mjs
var ObjectRef = object({
  digest: string(),
  objectId: string(),
  version: union([
    pipe(number(), integer()),
    string(),
    bigint()
  ])
});
var ObjectArg2 = safeEnum({
  ImmOrOwned: ObjectRef,
  Shared: object({
    objectId: ObjectID,
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRef
});
var NormalizedCallArg2 = safeEnum({
  Object: ObjectArg2,
  Pure: array(pipe(number(), integer()))
});
var TransactionInput = union([object({
  kind: literal("Input"),
  index: pipe(number(), integer()),
  value: unknown(),
  type: optional(literal("object"))
}), object({
  kind: literal("Input"),
  index: pipe(number(), integer()),
  value: unknown(),
  type: literal("pure")
})]);
var TransactionExpiration3 = union([object({ Epoch: pipe(number(), integer()) }), object({ None: nullable(literal(true)) })]);
var StringEncodedBigint = pipe(union([
  number(),
  string(),
  bigint()
]), check((val) => {
  if (![
    "string",
    "number",
    "bigint"
  ].includes(typeof val)) return false;
  try {
    BigInt(val);
    return true;
  } catch {
    return false;
  }
}));
var TypeTag2 = union([
  object({ bool: nullable(literal(true)) }),
  object({ u8: nullable(literal(true)) }),
  object({ u64: nullable(literal(true)) }),
  object({ u128: nullable(literal(true)) }),
  object({ address: nullable(literal(true)) }),
  object({ signer: nullable(literal(true)) }),
  object({ vector: lazy(() => TypeTag2) }),
  object({ struct: lazy(() => StructTag2) }),
  object({ u16: nullable(literal(true)) }),
  object({ u32: nullable(literal(true)) }),
  object({ u256: nullable(literal(true)) })
]);
var StructTag2 = object({
  address: string(),
  module: string(),
  name: string(),
  typeParams: array(TypeTag2)
});
var GasConfig = object({
  budget: optional(StringEncodedBigint),
  price: optional(StringEncodedBigint),
  payment: optional(array(ObjectRef)),
  owner: optional(string())
});
var TransactionArgumentTypes = [
  TransactionInput,
  object({ kind: literal("GasCoin") }),
  object({
    kind: literal("Result"),
    index: pipe(number(), integer())
  }),
  object({
    kind: literal("NestedResult"),
    index: pipe(number(), integer()),
    resultIndex: pipe(number(), integer())
  })
];
var TransactionArgument = union([...TransactionArgumentTypes]);
var MoveCallTransaction = object({
  kind: literal("MoveCall"),
  target: pipe(string(), check((target) => target.split("::").length === 3)),
  typeArguments: array(string()),
  arguments: array(TransactionArgument)
});
var TransferObjectsTransaction = object({
  kind: literal("TransferObjects"),
  objects: array(TransactionArgument),
  address: TransactionArgument
});
var SplitCoinsTransaction = object({
  kind: literal("SplitCoins"),
  coin: TransactionArgument,
  amounts: array(TransactionArgument)
});
var MergeCoinsTransaction = object({
  kind: literal("MergeCoins"),
  destination: TransactionArgument,
  sources: array(TransactionArgument)
});
var MakeMoveVecTransaction = object({
  kind: literal("MakeMoveVec"),
  type: union([object({ Some: TypeTag2 }), object({ None: nullable(literal(true)) })]),
  objects: array(TransactionArgument)
});
var TransactionType = union([...[
  MoveCallTransaction,
  TransferObjectsTransaction,
  SplitCoinsTransaction,
  MergeCoinsTransaction,
  object({
    kind: literal("Publish"),
    modules: array(array(pipe(number(), integer()))),
    dependencies: array(string())
  }),
  object({
    kind: literal("Upgrade"),
    modules: array(array(pipe(number(), integer()))),
    dependencies: array(string()),
    packageId: string(),
    ticket: TransactionArgument
  }),
  MakeMoveVecTransaction
]]);
var SerializedTransactionDataV1 = object({
  version: literal(1),
  sender: optional(string()),
  expiration: nullish(TransactionExpiration3),
  gasConfig: GasConfig,
  inputs: array(TransactionInput),
  transactions: array(TransactionType)
});
function serializeV1TransactionData(transactionData) {
  const inputs = transactionData.inputs.map((input, index) => {
    if (input.Object) return {
      kind: "Input",
      index,
      value: { Object: input.Object.ImmOrOwnedObject ? { ImmOrOwned: input.Object.ImmOrOwnedObject } : input.Object.Receiving ? { Receiving: {
        digest: input.Object.Receiving.digest,
        version: input.Object.Receiving.version,
        objectId: input.Object.Receiving.objectId
      } } : { Shared: {
        mutable: input.Object.SharedObject.mutable,
        initialSharedVersion: input.Object.SharedObject.initialSharedVersion,
        objectId: input.Object.SharedObject.objectId
      } } },
      type: "object"
    };
    if (input.Pure) return {
      kind: "Input",
      index,
      value: { Pure: Array.from(fromBase64(input.Pure.bytes)) },
      type: "pure"
    };
    if (input.UnresolvedPure) return {
      kind: "Input",
      type: "pure",
      index,
      value: input.UnresolvedPure.value
    };
    if (input.UnresolvedObject) return {
      kind: "Input",
      type: "object",
      index,
      value: input.UnresolvedObject.objectId
    };
    throw new Error("Invalid input");
  });
  return {
    version: 1,
    sender: transactionData.sender ?? void 0,
    expiration: transactionData.expiration?.$kind === "Epoch" ? { Epoch: Number(transactionData.expiration.Epoch) } : transactionData.expiration ? { None: true } : null,
    gasConfig: {
      owner: transactionData.gasData.owner ?? void 0,
      budget: transactionData.gasData.budget ?? void 0,
      price: transactionData.gasData.price ?? void 0,
      payment: transactionData.gasData.payment ?? void 0
    },
    inputs,
    transactions: transactionData.commands.map((command) => {
      if (command.MakeMoveVec) return {
        kind: "MakeMoveVec",
        type: command.MakeMoveVec.type === null ? { None: true } : { Some: TypeTagSerializer.parseFromStr(command.MakeMoveVec.type) },
        objects: command.MakeMoveVec.elements.map((arg) => convertTransactionArgument(arg, inputs))
      };
      if (command.MergeCoins) return {
        kind: "MergeCoins",
        destination: convertTransactionArgument(command.MergeCoins.destination, inputs),
        sources: command.MergeCoins.sources.map((arg) => convertTransactionArgument(arg, inputs))
      };
      if (command.MoveCall) return {
        kind: "MoveCall",
        target: `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`,
        typeArguments: command.MoveCall.typeArguments,
        arguments: command.MoveCall.arguments.map((arg) => convertTransactionArgument(arg, inputs))
      };
      if (command.Publish) return {
        kind: "Publish",
        modules: command.Publish.modules.map((mod) => Array.from(fromBase64(mod))),
        dependencies: command.Publish.dependencies
      };
      if (command.SplitCoins) return {
        kind: "SplitCoins",
        coin: convertTransactionArgument(command.SplitCoins.coin, inputs),
        amounts: command.SplitCoins.amounts.map((arg) => convertTransactionArgument(arg, inputs))
      };
      if (command.TransferObjects) return {
        kind: "TransferObjects",
        objects: command.TransferObjects.objects.map((arg) => convertTransactionArgument(arg, inputs)),
        address: convertTransactionArgument(command.TransferObjects.address, inputs)
      };
      if (command.Upgrade) return {
        kind: "Upgrade",
        modules: command.Upgrade.modules.map((mod) => Array.from(fromBase64(mod))),
        dependencies: command.Upgrade.dependencies,
        packageId: command.Upgrade.package,
        ticket: convertTransactionArgument(command.Upgrade.ticket, inputs)
      };
      throw new Error(`Unknown transaction ${Object.keys(command)}`);
    })
  };
}
function convertTransactionArgument(arg, inputs) {
  if (arg.$kind === "GasCoin") return { kind: "GasCoin" };
  if (arg.$kind === "Result") return {
    kind: "Result",
    index: arg.Result
  };
  if (arg.$kind === "NestedResult") return {
    kind: "NestedResult",
    index: arg.NestedResult[0],
    resultIndex: arg.NestedResult[1]
  };
  if (arg.$kind === "Input") return inputs[arg.Input];
  throw new Error(`Invalid argument ${Object.keys(arg)}`);
}
function transactionDataFromV1(data) {
  return parse(TransactionDataSchema, {
    version: 2,
    sender: data.sender ?? null,
    expiration: data.expiration ? "Epoch" in data.expiration ? { Epoch: data.expiration.Epoch } : { None: true } : null,
    gasData: {
      owner: data.gasConfig.owner ?? null,
      budget: data.gasConfig.budget?.toString() ?? null,
      price: data.gasConfig.price?.toString() ?? null,
      payment: data.gasConfig.payment?.map((ref) => ({
        digest: ref.digest,
        objectId: ref.objectId,
        version: ref.version.toString()
      })) ?? null
    },
    inputs: data.inputs.map((input) => {
      if (input.kind === "Input") {
        if (is(NormalizedCallArg2, input.value)) {
          const value = parse(NormalizedCallArg2, input.value);
          if (value.Object) {
            if (value.Object.ImmOrOwned) return { Object: { ImmOrOwnedObject: {
              objectId: value.Object.ImmOrOwned.objectId,
              version: String(value.Object.ImmOrOwned.version),
              digest: value.Object.ImmOrOwned.digest
            } } };
            if (value.Object.Shared) return { Object: { SharedObject: {
              mutable: value.Object.Shared.mutable ?? null,
              initialSharedVersion: value.Object.Shared.initialSharedVersion,
              objectId: value.Object.Shared.objectId
            } } };
            if (value.Object.Receiving) return { Object: { Receiving: {
              digest: value.Object.Receiving.digest,
              version: String(value.Object.Receiving.version),
              objectId: value.Object.Receiving.objectId
            } } };
            throw new Error("Invalid object input");
          }
          return { Pure: { bytes: toBase64(new Uint8Array(value.Pure)) } };
        }
        if (input.type === "object") return { UnresolvedObject: { objectId: input.value } };
        return { UnresolvedPure: { value: input.value } };
      }
      throw new Error("Invalid input");
    }),
    commands: data.transactions.map((transaction) => {
      switch (transaction.kind) {
        case "MakeMoveVec":
          return { MakeMoveVec: {
            type: "Some" in transaction.type ? TypeTagSerializer.tagToString(transaction.type.Some) : null,
            elements: transaction.objects.map((arg) => parseV1TransactionArgument(arg))
          } };
        case "MergeCoins":
          return { MergeCoins: {
            destination: parseV1TransactionArgument(transaction.destination),
            sources: transaction.sources.map((arg) => parseV1TransactionArgument(arg))
          } };
        case "MoveCall": {
          const [pkg, mod, fn] = transaction.target.split("::");
          return { MoveCall: {
            package: pkg,
            module: mod,
            function: fn,
            typeArguments: transaction.typeArguments,
            arguments: transaction.arguments.map((arg) => parseV1TransactionArgument(arg))
          } };
        }
        case "Publish":
          return { Publish: {
            modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
            dependencies: transaction.dependencies
          } };
        case "SplitCoins":
          return { SplitCoins: {
            coin: parseV1TransactionArgument(transaction.coin),
            amounts: transaction.amounts.map((arg) => parseV1TransactionArgument(arg))
          } };
        case "TransferObjects":
          return { TransferObjects: {
            objects: transaction.objects.map((arg) => parseV1TransactionArgument(arg)),
            address: parseV1TransactionArgument(transaction.address)
          } };
        case "Upgrade":
          return { Upgrade: {
            modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
            dependencies: transaction.dependencies,
            package: transaction.packageId,
            ticket: parseV1TransactionArgument(transaction.ticket)
          } };
      }
      throw new Error(`Unknown transaction ${Object.keys(transaction)}`);
    })
  });
}
function parseV1TransactionArgument(arg) {
  switch (arg.kind) {
    case "GasCoin":
      return { GasCoin: true };
    case "Result":
      return { Result: arg.index };
    case "NestedResult":
      return { NestedResult: [arg.index, arg.resultIndex] };
    case "Input":
      return { Input: arg.index };
  }
}

// node_modules/@noble/hashes/utils.js
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
function anumber2(n, title = "") {
  if (typeof n !== "number") {
    const prefix = title && `"${title}" `;
    throw new TypeError(`${prefix}expected number, got ${typeof n}`);
  }
  if (!Number.isSafeInteger(n) || n < 0) {
    const prefix = title && `"${title}" `;
    throw new RangeError(`${prefix}expected integer >= 0, got ${n}`);
  }
}
function abytes(value, length, title = "") {
  const bytes = isBytes2(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    const message = prefix + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  return value;
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "digestInto() output");
  const min = instance.outputLen;
  if (out.length < min) {
    throw new RangeError('"digestInto() output" expected to be of length >=' + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n) >>> 0;
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}

// node_modules/@noble/hashes/_blake.js
var BSIGMA = /* @__PURE__ */ Uint8Array.from([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  // Blake1, unused in others
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9
]);

// node_modules/@noble/hashes/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
var rotr32H = (_h, l) => l;
var rotr32L = (h, _l) => h;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/blake2.js
var B2B_IV = /* @__PURE__ */ Uint32Array.from([
  4089235720,
  1779033703,
  2227873595,
  3144134277,
  4271175723,
  1013904242,
  1595750129,
  2773480762,
  2917565137,
  1359893119,
  725511199,
  2600822924,
  4215389547,
  528734635,
  327033209,
  1541459225
]);
var BBUF = /* @__PURE__ */ new Uint32Array(32);
function G1b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotr32H(Dh, Dl), Dl: rotr32L(Dh, Dl) });
  ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrSH(Bh, Bl, 24), Bl: rotrSL(Bh, Bl, 24) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function G2b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotrSH(Dh, Dl, 16), Dl: rotrSL(Dh, Dl, 16) });
  ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrBH(Bh, Bl, 63), Bl: rotrBL(Bh, Bl, 63) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
  anumber2(keyLen);
  if (outputLen <= 0 || outputLen > keyLen)
    throw new Error("outputLen bigger than keyLen");
  const { key, salt, personalization } = opts;
  if (key !== void 0 && (key.length < 1 || key.length > keyLen))
    throw new Error('"key" expected to be undefined or of length=1..' + keyLen);
  if (salt !== void 0)
    abytes(salt, saltLen, "salt");
  if (personalization !== void 0)
    abytes(personalization, persLen, "personalization");
}
var _BLAKE2 = class {
  buffer;
  buffer32;
  finished = false;
  destroyed = false;
  length = 0;
  pos = 0;
  blockLen;
  outputLen;
  canXOF = false;
  constructor(blockLen, outputLen) {
    anumber2(blockLen);
    anumber2(outputLen);
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.buffer = new Uint8Array(blockLen);
    this.buffer32 = u32(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { blockLen, buffer, buffer32 } = this;
    const len = data.length;
    const offset = data.byteOffset;
    const buf = data.buffer;
    for (let pos = 0; pos < len; ) {
      if (this.pos === blockLen) {
        swap32IfBE(buffer32);
        this.compress(buffer32, 0, false);
        swap32IfBE(buffer32);
        this.pos = 0;
      }
      const take = Math.min(blockLen - this.pos, len - pos);
      const dataOffset = offset + pos;
      if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
        const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
        swap32IfBE(data32);
        for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
          this.length += blockLen;
          this.compress(data32, pos32, false);
        }
        swap32IfBE(data32);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      this.length += take;
      pos += take;
    }
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    const { pos, buffer32 } = this;
    this.finished = true;
    clean(this.buffer.subarray(pos));
    swap32IfBE(buffer32);
    this.compress(buffer32, 0, true);
    swap32IfBE(buffer32);
    if (out.byteOffset & 3)
      throw new RangeError('"digestInto() output" expected 4-byte aligned byteOffset, got ' + out.byteOffset);
    const state = this.get();
    const out32 = u32(out);
    const full = Math.floor(this.outputLen / 4);
    for (let i = 0; i < full; i++)
      out32[i] = swap8IfBE(state[i]);
    const tail = this.outputLen % 4;
    if (!tail)
      return;
    const off = full * 4;
    const word = state[full];
    for (let i = 0; i < tail; i++)
      out[off + i] = word >>> 8 * i;
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    const { buffer, length, finished, destroyed, outputLen, pos } = this;
    to ||= new this.constructor({ dkLen: outputLen });
    to.set(...this.get());
    to.buffer.set(buffer);
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    to.outputLen = outputLen;
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var _BLAKE2b = class extends _BLAKE2 {
  // Same IV words as SHA-512 / BLAKE2b, encoded as LE u32 low/high halves.
  v0l = B2B_IV[0] | 0;
  v0h = B2B_IV[1] | 0;
  v1l = B2B_IV[2] | 0;
  v1h = B2B_IV[3] | 0;
  v2l = B2B_IV[4] | 0;
  v2h = B2B_IV[5] | 0;
  v3l = B2B_IV[6] | 0;
  v3h = B2B_IV[7] | 0;
  v4l = B2B_IV[8] | 0;
  v4h = B2B_IV[9] | 0;
  v5l = B2B_IV[10] | 0;
  v5h = B2B_IV[11] | 0;
  v6l = B2B_IV[12] | 0;
  v6h = B2B_IV[13] | 0;
  v7l = B2B_IV[14] | 0;
  v7h = B2B_IV[15] | 0;
  constructor(opts = {}) {
    const olen = opts.dkLen === void 0 ? 64 : opts.dkLen;
    super(128, olen);
    checkBlake2Opts(olen, opts, 64, 16, 16);
    let { key, personalization, salt } = opts;
    let keyLength = 0;
    if (key !== void 0) {
      abytes(key, void 0, "key");
      keyLength = key.length;
    }
    this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
    if (salt !== void 0) {
      abytes(salt, void 0, "salt");
      const slt = u32(salt);
      this.v4l ^= swap8IfBE(slt[0]);
      this.v4h ^= swap8IfBE(slt[1]);
      this.v5l ^= swap8IfBE(slt[2]);
      this.v5h ^= swap8IfBE(slt[3]);
    }
    if (personalization !== void 0) {
      abytes(personalization, void 0, "personalization");
      const pers = u32(personalization);
      this.v6l ^= swap8IfBE(pers[0]);
      this.v6h ^= swap8IfBE(pers[1]);
      this.v7l ^= swap8IfBE(pers[2]);
      this.v7h ^= swap8IfBE(pers[3]);
    }
    if (key !== void 0) {
      const tmp = new Uint8Array(this.blockLen);
      tmp.set(key);
      this.update(tmp);
    }
  }
  // prettier-ignore
  get() {
    let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
  }
  // prettier-ignore
  set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
    this.v0l = v0l | 0;
    this.v0h = v0h | 0;
    this.v1l = v1l | 0;
    this.v1h = v1h | 0;
    this.v2l = v2l | 0;
    this.v2h = v2h | 0;
    this.v3l = v3l | 0;
    this.v3h = v3h | 0;
    this.v4l = v4l | 0;
    this.v4h = v4h | 0;
    this.v5l = v5l | 0;
    this.v5h = v5h | 0;
    this.v6l = v6l | 0;
    this.v6h = v6h | 0;
    this.v7l = v7l | 0;
    this.v7h = v7h | 0;
  }
  compress(msg, offset, isLast) {
    this.get().forEach((v, i) => BBUF[i] = v);
    BBUF.set(B2B_IV, 16);
    let { h, l } = fromBig(BigInt(this.length));
    BBUF[24] = B2B_IV[8] ^ l;
    BBUF[25] = B2B_IV[9] ^ h;
    if (isLast) {
      BBUF[28] = ~BBUF[28];
      BBUF[29] = ~BBUF[29];
    }
    let j = 0;
    const s = BSIGMA;
    for (let i = 0; i < 12; i++) {
      G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
    }
    this.v0l ^= BBUF[0] ^ BBUF[16];
    this.v0h ^= BBUF[1] ^ BBUF[17];
    this.v1l ^= BBUF[2] ^ BBUF[18];
    this.v1h ^= BBUF[3] ^ BBUF[19];
    this.v2l ^= BBUF[4] ^ BBUF[20];
    this.v2h ^= BBUF[5] ^ BBUF[21];
    this.v3l ^= BBUF[6] ^ BBUF[22];
    this.v3h ^= BBUF[7] ^ BBUF[23];
    this.v4l ^= BBUF[8] ^ BBUF[24];
    this.v4h ^= BBUF[9] ^ BBUF[25];
    this.v5l ^= BBUF[10] ^ BBUF[26];
    this.v5h ^= BBUF[11] ^ BBUF[27];
    this.v6l ^= BBUF[12] ^ BBUF[28];
    this.v6h ^= BBUF[13] ^ BBUF[29];
    this.v7l ^= BBUF[14] ^ BBUF[30];
    this.v7h ^= BBUF[15] ^ BBUF[31];
    clean(BBUF);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer32);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var blake2b = /* @__PURE__ */ createHasher((opts) => new _BLAKE2b(opts));

// node_modules/@mysten/sui/dist/transactions/hash.mjs
function hashTypedData(typeTag, data) {
  const typeTagBytes = Array.from(`${typeTag}::`).map((e) => e.charCodeAt(0));
  const dataWithTag = new Uint8Array(typeTagBytes.length + data.length);
  dataWithTag.set(typeTagBytes);
  dataWithTag.set(data, typeTagBytes.length);
  return blake2b(dataWithTag, { dkLen: 32 });
}

// node_modules/@mysten/sui/dist/transactions/TransactionData.mjs
function prepareSuiAddress(address) {
  return normalizeSuiAddress(address).replace("0x", "");
}
var TransactionDataBuilder = class TransactionDataBuilder2 {
  static fromKindBytes(bytes) {
    const programmableTx = suiBcs.TransactionKind.parse(bytes).ProgrammableTransaction;
    if (!programmableTx) throw new Error("Unable to deserialize from bytes.");
    return TransactionDataBuilder2.restore({
      version: 2,
      sender: null,
      expiration: null,
      gasData: {
        budget: null,
        owner: null,
        payment: null,
        price: null
      },
      inputs: programmableTx.inputs,
      commands: programmableTx.commands
    });
  }
  static fromBytes(bytes) {
    const data = suiBcs.TransactionData.parse(bytes)?.V1;
    const programmableTx = data.kind.ProgrammableTransaction;
    if (!data || !programmableTx) throw new Error("Unable to deserialize from bytes.");
    return TransactionDataBuilder2.restore({
      version: 2,
      sender: data.sender,
      expiration: data.expiration,
      gasData: data.gasData,
      inputs: programmableTx.inputs,
      commands: programmableTx.commands
    });
  }
  static restore(data) {
    if (data.version === 2) return new TransactionDataBuilder2(parse(TransactionDataSchema, data));
    else return new TransactionDataBuilder2(parse(TransactionDataSchema, transactionDataFromV1(data)));
  }
  /**
  * Generate transaction digest.
  *
  * @param bytes BCS serialized transaction data
  * @returns transaction digest.
  */
  static getDigestFromBytes(bytes) {
    return toBase58(hashTypedData("TransactionData", bytes));
  }
  constructor(clone) {
    this.version = 2;
    this.sender = clone?.sender ?? null;
    this.expiration = clone?.expiration ?? null;
    this.inputs = clone?.inputs ?? [];
    this.commands = clone?.commands ?? [];
    this.gasData = clone?.gasData ?? {
      budget: null,
      price: null,
      owner: null,
      payment: null
    };
  }
  build({ maxSizeBytes = Infinity, overrides, onlyTransactionKind } = {}) {
    const inputs = this.inputs;
    const commands = this.commands;
    const kind = { ProgrammableTransaction: {
      inputs,
      commands
    } };
    if (onlyTransactionKind) return suiBcs.TransactionKind.serialize(kind, { maxSize: maxSizeBytes }).toBytes();
    const expiration = overrides?.expiration ?? this.expiration;
    const sender = overrides?.sender ?? this.sender;
    const gasData = {
      ...this.gasData,
      ...overrides?.gasData
    };
    if (!sender) throw new Error("Missing transaction sender");
    if (!gasData.budget) throw new Error("Missing gas budget");
    if (!gasData.payment) throw new Error("Missing gas payment");
    if (!gasData.price) throw new Error("Missing gas price");
    const transactionData = {
      sender: prepareSuiAddress(sender),
      expiration: expiration ? expiration : { None: true },
      gasData: {
        payment: gasData.payment,
        owner: prepareSuiAddress(this.gasData.owner ?? sender),
        price: BigInt(gasData.price),
        budget: BigInt(gasData.budget)
      },
      kind: { ProgrammableTransaction: {
        inputs,
        commands
      } }
    };
    return suiBcs.TransactionData.serialize({ V1: transactionData }, { maxSize: maxSizeBytes }).toBytes();
  }
  addInput(type, arg) {
    const index = this.inputs.length;
    this.inputs.push(arg);
    return {
      Input: index,
      type,
      $kind: "Input"
    };
  }
  getInputUses(index, fn) {
    this.mapArguments((arg, command) => {
      if (arg.$kind === "Input" && arg.Input === index) fn(arg, command);
      return arg;
    });
  }
  mapCommandArguments(index, fn) {
    const command = this.commands[index];
    switch (command.$kind) {
      case "MoveCall":
        command.MoveCall.arguments = command.MoveCall.arguments.map((arg) => fn(arg, command, index));
        break;
      case "TransferObjects":
        command.TransferObjects.objects = command.TransferObjects.objects.map((arg) => fn(arg, command, index));
        command.TransferObjects.address = fn(command.TransferObjects.address, command, index);
        break;
      case "SplitCoins":
        command.SplitCoins.coin = fn(command.SplitCoins.coin, command, index);
        command.SplitCoins.amounts = command.SplitCoins.amounts.map((arg) => fn(arg, command, index));
        break;
      case "MergeCoins":
        command.MergeCoins.destination = fn(command.MergeCoins.destination, command, index);
        command.MergeCoins.sources = command.MergeCoins.sources.map((arg) => fn(arg, command, index));
        break;
      case "MakeMoveVec":
        command.MakeMoveVec.elements = command.MakeMoveVec.elements.map((arg) => fn(arg, command, index));
        break;
      case "Upgrade":
        command.Upgrade.ticket = fn(command.Upgrade.ticket, command, index);
        break;
      case "$Intent":
        const inputs = command.$Intent.inputs;
        command.$Intent.inputs = {};
        for (const [key, value] of Object.entries(inputs)) command.$Intent.inputs[key] = Array.isArray(value) ? value.map((arg) => fn(arg, command, index)) : fn(value, command, index);
        break;
      case "Publish":
        break;
      default:
        throw new Error(`Unexpected transaction kind: ${command.$kind}`);
    }
  }
  mapArguments(fn) {
    for (const commandIndex of this.commands.keys()) this.mapCommandArguments(commandIndex, fn);
  }
  replaceCommand(index, replacement, resultIndex = index) {
    if (!Array.isArray(replacement)) {
      this.commands[index] = replacement;
      return;
    }
    const sizeDiff = replacement.length - 1;
    this.commands.splice(index, 1, ...structuredClone(replacement));
    this.mapArguments((arg, _command, commandIndex) => {
      if (commandIndex < index + replacement.length) return arg;
      if (typeof resultIndex !== "number") {
        if (arg.$kind === "Result" && arg.Result === index || arg.$kind === "NestedResult" && arg.NestedResult[0] === index) if (!("NestedResult" in arg) || arg.NestedResult[1] === 0) return parse(ArgumentSchema, structuredClone(resultIndex));
        else throw new Error(`Cannot replace command ${index} with a specific result type: NestedResult[${index}, ${arg.NestedResult[1]}] references a nested element that cannot be mapped to the replacement result`);
      }
      switch (arg.$kind) {
        case "Result":
          if (arg.Result === index && typeof resultIndex === "number") arg.Result = resultIndex;
          if (arg.Result > index) arg.Result += sizeDiff;
          break;
        case "NestedResult":
          if (arg.NestedResult[0] === index && typeof resultIndex === "number") return {
            $kind: "NestedResult",
            NestedResult: [resultIndex, arg.NestedResult[1]]
          };
          if (arg.NestedResult[0] > index) arg.NestedResult[0] += sizeDiff;
          break;
      }
      return arg;
    });
  }
  replaceCommandWithTransaction(index, otherTransaction, result) {
    if (result.$kind !== "Result" && result.$kind !== "NestedResult") throw new Error("Result must be of kind Result or NestedResult");
    this.insertTransaction(index, otherTransaction);
    this.replaceCommand(index + otherTransaction.commands.length, [], "Result" in result ? { NestedResult: [result.Result + index, 0] } : { NestedResult: [result.NestedResult[0] + index, result.NestedResult[1]] });
  }
  insertTransaction(atCommandIndex, otherTransaction) {
    const inputMapping = /* @__PURE__ */ new Map();
    const commandMapping = /* @__PURE__ */ new Map();
    for (let i = 0; i < otherTransaction.inputs.length; i++) {
      const otherInput = otherTransaction.inputs[i];
      const id = getIdFromCallArg(otherInput);
      let existingIndex = -1;
      if (id !== void 0) {
        existingIndex = this.inputs.findIndex((input) => getIdFromCallArg(input) === id);
        if (existingIndex !== -1 && this.inputs[existingIndex].Object?.SharedObject && otherInput.Object?.SharedObject) this.inputs[existingIndex].Object.SharedObject.mutable = this.inputs[existingIndex].Object.SharedObject.mutable || otherInput.Object.SharedObject.mutable;
      }
      if (existingIndex !== -1) inputMapping.set(i, existingIndex);
      else {
        const newIndex = this.inputs.length;
        this.inputs.push(otherInput);
        inputMapping.set(i, newIndex);
      }
    }
    for (let i = 0; i < otherTransaction.commands.length; i++) commandMapping.set(i, atCommandIndex + i);
    const remappedCommands = [];
    for (let i = 0; i < otherTransaction.commands.length; i++) {
      const command = structuredClone(otherTransaction.commands[i]);
      remapCommandArguments(command, inputMapping, commandMapping);
      remappedCommands.push(command);
    }
    this.commands.splice(atCommandIndex, 0, ...remappedCommands);
    const sizeDiff = remappedCommands.length;
    if (sizeDiff > 0) this.mapArguments((arg, _command, commandIndex) => {
      if (commandIndex >= atCommandIndex && commandIndex < atCommandIndex + remappedCommands.length) return arg;
      switch (arg.$kind) {
        case "Result":
          if (arg.Result >= atCommandIndex) arg.Result += sizeDiff;
          break;
        case "NestedResult":
          if (arg.NestedResult[0] >= atCommandIndex) arg.NestedResult[0] += sizeDiff;
          break;
      }
      return arg;
    });
  }
  getDigest() {
    const bytes = this.build({ onlyTransactionKind: false });
    return TransactionDataBuilder2.getDigestFromBytes(bytes);
  }
  snapshot() {
    return parse(TransactionDataSchema, this);
  }
  shallowClone() {
    return new TransactionDataBuilder2({
      version: this.version,
      sender: this.sender,
      expiration: this.expiration,
      gasData: { ...this.gasData },
      inputs: [...this.inputs],
      commands: [...this.commands]
    });
  }
  applyResolvedData(resolved) {
    if (!this.sender) this.sender = resolved.sender ?? null;
    if (!this.expiration) this.expiration = resolved.expiration ?? null;
    if (!this.gasData.budget) this.gasData.budget = resolved.gasData.budget;
    if (!this.gasData.owner) this.gasData.owner = resolved.gasData.owner ?? null;
    if (!this.gasData.payment) this.gasData.payment = resolved.gasData.payment;
    if (!this.gasData.price) this.gasData.price = resolved.gasData.price;
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      const resolvedInput = resolved.inputs[i];
      switch (input.$kind) {
        case "UnresolvedPure":
          if (resolvedInput.$kind !== "Pure") throw new Error(`Expected input at index ${i} to resolve to a Pure argument, but got ${JSON.stringify(resolvedInput)}`);
          this.inputs[i] = resolvedInput;
          break;
        case "UnresolvedObject":
          if (resolvedInput.$kind !== "Object") throw new Error(`Expected input at index ${i} to resolve to an Object argument, but got ${JSON.stringify(resolvedInput)}`);
          if (resolvedInput.Object.$kind === "ImmOrOwnedObject" || resolvedInput.Object.$kind === "Receiving") {
            const original = input.UnresolvedObject;
            const resolved$1 = resolvedInput.Object.ImmOrOwnedObject ?? resolvedInput.Object.Receiving;
            if (normalizeSuiAddress(original.objectId) !== normalizeSuiAddress(resolved$1.objectId) || original.version != null && original.version !== resolved$1.version || original.digest != null && original.digest !== resolved$1.digest || original.mutable != null || original.initialSharedVersion != null) throw new Error(`Input at index ${i} did not match unresolved object. ${JSON.stringify(original)} is not compatible with ${JSON.stringify(resolved$1)}`);
          } else if (resolvedInput.Object.$kind === "SharedObject") {
            const original = input.UnresolvedObject;
            const resolved$1 = resolvedInput.Object.SharedObject;
            if (normalizeSuiAddress(original.objectId) !== normalizeSuiAddress(resolved$1.objectId) || original.initialSharedVersion != null && original.initialSharedVersion !== resolved$1.initialSharedVersion || original.mutable != null && original.mutable !== resolved$1.mutable || original.version != null || original.digest != null) throw new Error(`Input at index ${i} did not match unresolved object. ${JSON.stringify(original)} is not compatible with ${JSON.stringify(resolved$1)}`);
          } else throw new Error(`Input at index ${i} resolved to an unexpected Object kind: ${JSON.stringify(resolvedInput.Object)}`);
          this.inputs[i] = resolvedInput;
          break;
      }
    }
  }
};

// node_modules/@mysten/sui/dist/transactions/Commands.mjs
var TransactionCommands = {
  MoveCall(input) {
    const [pkg, mod = "", fn = ""] = "target" in input ? input.target.split("::") : [
      input.package,
      input.module,
      input.function
    ];
    return {
      $kind: "MoveCall",
      MoveCall: {
        package: pkg,
        module: mod,
        function: fn,
        typeArguments: input.typeArguments ?? [],
        arguments: input.arguments ?? []
      }
    };
  },
  TransferObjects(objects, address) {
    return {
      $kind: "TransferObjects",
      TransferObjects: {
        objects: objects.map((o) => parse(ArgumentSchema, o)),
        address: parse(ArgumentSchema, address)
      }
    };
  },
  SplitCoins(coin, amounts) {
    return {
      $kind: "SplitCoins",
      SplitCoins: {
        coin: parse(ArgumentSchema, coin),
        amounts: amounts.map((o) => parse(ArgumentSchema, o))
      }
    };
  },
  MergeCoins(destination, sources) {
    return {
      $kind: "MergeCoins",
      MergeCoins: {
        destination: parse(ArgumentSchema, destination),
        sources: sources.map((o) => parse(ArgumentSchema, o))
      }
    };
  },
  Publish({ modules, dependencies }) {
    return {
      $kind: "Publish",
      Publish: {
        modules: modules.map((module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))),
        dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep))
      }
    };
  },
  Upgrade({ modules, dependencies, package: packageId, ticket }) {
    return {
      $kind: "Upgrade",
      Upgrade: {
        modules: modules.map((module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))),
        dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep)),
        package: packageId,
        ticket: parse(ArgumentSchema, ticket)
      }
    };
  },
  MakeMoveVec({ type, elements }) {
    return {
      $kind: "MakeMoveVec",
      MakeMoveVec: {
        type: type ?? null,
        elements: elements.map((o) => parse(ArgumentSchema, o))
      }
    };
  },
  Intent({ name, inputs = {}, data = {} }) {
    return {
      $kind: "$Intent",
      $Intent: {
        name,
        inputs: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Array.isArray(value) ? value.map((o) => parse(ArgumentSchema, o)) : parse(ArgumentSchema, value)])),
        data
      }
    };
  }
};

// node_modules/@mysten/sui/dist/transactions/Inputs.mjs
function Pure(data) {
  return {
    $kind: "Pure",
    Pure: { bytes: data instanceof Uint8Array ? toBase64(data) : data.toBase64() }
  };
}
var Inputs = {
  Pure,
  ObjectRef({ objectId, digest, version }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "ImmOrOwnedObject",
        ImmOrOwnedObject: {
          digest,
          version,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  SharedObjectRef({ objectId, mutable, initialSharedVersion }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "SharedObject",
        SharedObject: {
          mutable,
          initialSharedVersion,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  ReceivingRef({ objectId, digest, version }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "Receiving",
        Receiving: {
          digest,
          version,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  FundsWithdrawal({ reservation, typeArg, withdrawFrom }) {
    return {
      $kind: "FundsWithdrawal",
      FundsWithdrawal: {
        reservation,
        typeArg,
        withdrawFrom
      }
    };
  }
};

// node_modules/@mysten/sui/dist/utils/constants.mjs
var MIST_PER_SUI = BigInt(1e9);
var MOVE_STDLIB_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000001";
var SUI_FRAMEWORK_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000002";
var SUI_SYSTEM_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000003";
var SUI_CLOCK_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";
var SUI_TYPE_ARG = `${SUI_FRAMEWORK_ADDRESS}::sui::SUI`;
var SUI_SYSTEM_STATE_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000005";
var SUI_RANDOM_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000008";
var SUI_DENY_LIST_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000403";

// node_modules/@mysten/sui/dist/transactions/serializer.mjs
function parseTypeName(typeName) {
  const parts = typeName.split("::");
  if (parts.length !== 3) throw new Error(`Invalid type name format: ${typeName}`);
  return {
    package: parts[0],
    module: parts[1],
    name: parts[2]
  };
}
function isTxContext(param) {
  if (param.body.$kind !== "datatype") return false;
  const { package: pkg, module, name } = parseTypeName(param.body.datatype.typeName);
  return normalizeSuiAddress(pkg) === SUI_FRAMEWORK_ADDRESS && module === "tx_context" && name === "TxContext";
}
function getPureBcsSchema(typeSignature) {
  switch (typeSignature.$kind) {
    case "address":
      return suiBcs.Address;
    case "bool":
      return suiBcs.Bool;
    case "u8":
      return suiBcs.U8;
    case "u16":
      return suiBcs.U16;
    case "u32":
      return suiBcs.U32;
    case "u64":
      return suiBcs.U64;
    case "u128":
      return suiBcs.U128;
    case "u256":
      return suiBcs.U256;
    case "vector": {
      if (typeSignature.vector.$kind === "u8") return suiBcs.byteVector().transform({
        input: (val) => typeof val === "string" ? new TextEncoder().encode(val) : val,
        output: (val) => val
      });
      const type = getPureBcsSchema(typeSignature.vector);
      return type ? suiBcs.vector(type) : null;
    }
    case "datatype": {
      const { package: pkg, module, name } = parseTypeName(typeSignature.datatype.typeName);
      const normalizedPkg = normalizeSuiAddress(pkg);
      if (normalizedPkg === MOVE_STDLIB_ADDRESS) {
        if (module === "ascii" && name === "String") return suiBcs.String;
        if (module === "string" && name === "String") return suiBcs.String;
        if (module === "option" && name === "Option") {
          const type = getPureBcsSchema(typeSignature.datatype.typeParameters[0]);
          return type ? suiBcs.vector(type) : null;
        }
      }
      if (normalizedPkg === SUI_FRAMEWORK_ADDRESS) {
        if (module === "object" && name === "ID") return suiBcs.Address;
      }
      return null;
    }
    case "typeParameter":
    case "unknown":
      return null;
  }
}

// node_modules/@mysten/sui/dist/transactions/intents/CoinWithBalance.mjs
var COIN_WITH_BALANCE = "CoinWithBalance";
var SUI_TYPE = normalizeStructTag("0x2::sui::SUI");
function coinWithBalance({ type = SUI_TYPE, balance, useGasCoin = true }) {
  let coinResult = null;
  return (tx) => {
    if (coinResult) return coinResult;
    tx.addIntentResolver(COIN_WITH_BALANCE, resolveCoinBalance);
    const coinType = type === "gas" ? type : normalizeStructTag(type);
    coinResult = tx.add(TransactionCommands.Intent({
      name: COIN_WITH_BALANCE,
      inputs: {},
      data: {
        type: coinType === SUI_TYPE && useGasCoin ? "gas" : coinType,
        balance: BigInt(balance),
        outputKind: "coin"
      }
    }));
    return coinResult;
  };
}
function createBalance({ type = SUI_TYPE, balance, useGasCoin = true }) {
  let balanceResult = null;
  return (tx) => {
    if (balanceResult) return balanceResult;
    tx.addIntentResolver(COIN_WITH_BALANCE, resolveCoinBalance);
    const coinType = type === "gas" ? type : normalizeStructTag(type);
    balanceResult = tx.add(TransactionCommands.Intent({
      name: COIN_WITH_BALANCE,
      inputs: {},
      data: {
        type: coinType === SUI_TYPE && useGasCoin ? "gas" : coinType,
        balance: BigInt(balance),
        outputKind: "balance"
      }
    }));
    return balanceResult;
  };
}
var CoinWithBalanceData = object({
  type: string(),
  balance: bigint(),
  outputKind: optional(picklist(["coin", "balance"]))
});
async function resolveCoinBalance(transactionData, buildOptions, next) {
  const coinTypes = /* @__PURE__ */ new Set();
  const totalByType = /* @__PURE__ */ new Map();
  const intentsByType = /* @__PURE__ */ new Map();
  if (!transactionData.sender) throw new Error("Sender must be set to resolve CoinWithBalance");
  for (const [i, command] of transactionData.commands.entries()) {
    if (command.$kind !== "$Intent" || command.$Intent.name !== COIN_WITH_BALANCE) continue;
    const { type, balance, outputKind } = parse(CoinWithBalanceData, command.$Intent.data);
    if (balance === 0n) {
      const coinType = type === "gas" ? SUI_TYPE : type;
      transactionData.replaceCommand(i, TransactionCommands.MoveCall({
        target: (outputKind ?? "coin") === "balance" ? "0x2::balance::zero" : "0x2::coin::zero",
        typeArguments: [coinType]
      }));
      continue;
    }
    if (type !== "gas") coinTypes.add(type);
    totalByType.set(type, (totalByType.get(type) ?? 0n) + balance);
    if (!intentsByType.has(type)) intentsByType.set(type, []);
    intentsByType.get(type).push({
      balance,
      outputKind: outputKind ?? "coin"
    });
  }
  if (totalByType.has("gas") && totalByType.has(SUI_TYPE)) throw new Error("Cannot mix SUI CoinWithBalance intents that use the gas coin with ones that do not (useGasCoin: false). Use one or the other.");
  const usedIds = /* @__PURE__ */ new Set();
  for (const input of transactionData.inputs) {
    if (input.Object?.ImmOrOwnedObject) usedIds.add(input.Object.ImmOrOwnedObject.objectId);
    if (input.UnresolvedObject?.objectId) usedIds.add(input.UnresolvedObject.objectId);
  }
  const coinsByType = /* @__PURE__ */ new Map();
  const addressBalanceByType = /* @__PURE__ */ new Map();
  const client = buildOptions.client;
  if (!client) throw new Error("Client must be provided to build or serialize transactions with CoinWithBalance intents");
  await Promise.all([...[...coinTypes].map(async (coinType) => {
    const { coins, addressBalance } = await getCoinsAndBalanceOfType({
      coinType,
      balance: totalByType.get(coinType),
      client,
      owner: transactionData.sender,
      usedIds
    });
    coinsByType.set(coinType, coins);
    addressBalanceByType.set(coinType, addressBalance);
  }), totalByType.has("gas") ? await client.core.getBalance({
    owner: transactionData.sender,
    coinType: SUI_TYPE
  }).then(({ balance }) => {
    addressBalanceByType.set("gas", BigInt(balance.addressBalance));
  }) : null]);
  const mergedCoins = /* @__PURE__ */ new Map();
  const exactBalanceByType = /* @__PURE__ */ new Map();
  const usedAddressBalance = /* @__PURE__ */ new Set();
  const typeState = /* @__PURE__ */ new Map();
  let index = 0;
  while (index < transactionData.commands.length) {
    const transaction = transactionData.commands[index];
    if (transaction.$kind !== "$Intent" || transaction.$Intent.name !== COIN_WITH_BALANCE) {
      index++;
      continue;
    }
    const { type, balance } = transaction.$Intent.data;
    const coinType = type === "gas" ? SUI_TYPE : type;
    const totalRequired = totalByType.get(type);
    const addressBalance = addressBalanceByType.get(type) ?? 0n;
    const commands = [];
    let intentResult;
    const intentsForType = intentsByType.get(type) ?? [];
    if (intentsForType.every((i) => i.outputKind === "balance") && addressBalance >= totalRequired) {
      commands.push(TransactionCommands.MoveCall({
        target: "0x2::balance::redeem_funds",
        typeArguments: [coinType],
        arguments: [transactionData.addInput("withdrawal", Inputs.FundsWithdrawal({
          reservation: {
            $kind: "MaxAmountU64",
            MaxAmountU64: String(balance)
          },
          typeArg: {
            $kind: "Balance",
            Balance: coinType
          },
          withdrawFrom: {
            $kind: "Sender",
            Sender: true
          }
        }))]
      }));
      intentResult = {
        $kind: "NestedResult",
        NestedResult: [index + commands.length - 1, 0]
      };
    } else {
      if (!typeState.has(type)) {
        const intents = intentsForType;
        const sources = [];
        if (addressBalance >= totalRequired) {
          usedAddressBalance.add(type);
          commands.push(TransactionCommands.MoveCall({
            target: "0x2::coin::redeem_funds",
            typeArguments: [coinType],
            arguments: [transactionData.addInput("withdrawal", Inputs.FundsWithdrawal({
              reservation: {
                $kind: "MaxAmountU64",
                MaxAmountU64: String(totalRequired)
              },
              typeArg: {
                $kind: "Balance",
                Balance: coinType
              },
              withdrawFrom: {
                $kind: "Sender",
                Sender: true
              }
            }))]
          }));
          sources.push({
            $kind: "Result",
            Result: index + commands.length - 1
          });
        } else if (type === "gas") sources.push({
          $kind: "GasCoin",
          GasCoin: true
        });
        else {
          const coins = coinsByType.get(type);
          const loadedCoinBalance = coins.reduce((sum, c) => sum + BigInt(c.balance), 0n);
          const abNeeded = totalRequired > loadedCoinBalance ? totalRequired - loadedCoinBalance : 0n;
          exactBalanceByType.set(type, loadedCoinBalance + abNeeded === totalRequired);
          for (const coin of coins) sources.push(transactionData.addInput("object", Inputs.ObjectRef({
            objectId: coin.objectId,
            digest: coin.digest,
            version: coin.version
          })));
          if (abNeeded > 0n) {
            usedAddressBalance.add(type);
            commands.push(TransactionCommands.MoveCall({
              target: "0x2::coin::redeem_funds",
              typeArguments: [coinType],
              arguments: [transactionData.addInput("withdrawal", Inputs.FundsWithdrawal({
                reservation: {
                  $kind: "MaxAmountU64",
                  MaxAmountU64: String(abNeeded)
                },
                typeArg: {
                  $kind: "Balance",
                  Balance: coinType
                },
                withdrawFrom: {
                  $kind: "Sender",
                  Sender: true
                }
              }))]
            }));
            sources.push({
              $kind: "Result",
              Result: index + commands.length - 1
            });
          }
        }
        const baseCoin = sources[0];
        const rest = sources.slice(1);
        for (let i = 0; i < rest.length; i += 500) commands.push(TransactionCommands.MergeCoins(baseCoin, rest.slice(i, i + 500)));
        mergedCoins.set(type, baseCoin);
        const splitCmdIndex = index + commands.length;
        commands.push(TransactionCommands.SplitCoins(baseCoin, intents.map((i) => transactionData.addInput("pure", Inputs.Pure(suiBcs.u64().serialize(i.balance))))));
        const results = [];
        for (let i = 0; i < intents.length; i++) {
          const splitResult = {
            $kind: "NestedResult",
            NestedResult: [splitCmdIndex, i]
          };
          if (intents[i].outputKind === "balance") {
            commands.push(TransactionCommands.MoveCall({
              target: "0x2::coin::into_balance",
              typeArguments: [coinType],
              arguments: [splitResult]
            }));
            results.push({
              $kind: "NestedResult",
              NestedResult: [index + commands.length - 1, 0]
            });
          } else results.push(splitResult);
        }
        typeState.set(type, {
          results,
          nextIntent: 0
        });
      }
      const state = typeState.get(type);
      intentResult = state.results[state.nextIntent++];
    }
    transactionData.replaceCommand(index, commands, intentResult);
    index += commands.length;
  }
  for (const [type, mergedCoin] of mergedCoins) {
    if (type === "gas" && !usedAddressBalance.has(type)) continue;
    const coinType = type === "gas" ? SUI_TYPE : type;
    const hasBalanceIntent = intentsByType.get(type)?.some((i) => i.outputKind === "balance");
    const sourcedFromAB = usedAddressBalance.has(type);
    if (hasBalanceIntent || sourcedFromAB) transactionData.commands.push(TransactionCommands.MoveCall({
      target: "0x2::coin::send_funds",
      typeArguments: [coinType],
      arguments: [mergedCoin, transactionData.addInput("pure", Inputs.Pure(suiBcs.Address.serialize(transactionData.sender)))]
    }));
    else if (exactBalanceByType.get(type)) transactionData.commands.push(TransactionCommands.MoveCall({
      target: "0x2::coin::destroy_zero",
      typeArguments: [coinType],
      arguments: [mergedCoin]
    }));
  }
  return next();
}
async function getCoinsAndBalanceOfType({ coinType, balance, client, owner, usedIds }) {
  let remainingBalance = balance;
  const coins = [];
  const balanceRequest = client.core.getBalance({
    owner,
    coinType
  }).then(({ balance: balance$1 }) => {
    remainingBalance -= BigInt(balance$1.addressBalance);
    return balance$1;
  });
  const [allCoins, balanceResponse] = await Promise.all([loadMoreCoins(), balanceRequest]);
  if (BigInt(balanceResponse.balance) < balance) throw new Error(`Insufficient balance of ${coinType} for owner ${owner}. Required: ${balance}, Available: ${balance - remainingBalance}`);
  return {
    coins: allCoins,
    balance: BigInt(balanceResponse.coinBalance),
    addressBalance: BigInt(balanceResponse.addressBalance),
    coinBalance: BigInt(balanceResponse.coinBalance)
  };
  async function loadMoreCoins(cursor = null) {
    const { objects, hasNextPage, cursor: nextCursor } = await client.core.listCoins({
      owner,
      coinType,
      cursor
    });
    await balanceRequest;
    for (const coin of objects) {
      if (usedIds.has(coin.objectId)) continue;
      coins.push(coin);
      remainingBalance -= BigInt(coin.balance);
    }
    if (remainingBalance > 0n && hasNextPage) return loadMoreCoins(nextCursor);
    return coins;
  }
}

// node_modules/@mysten/sui/dist/transactions/data/v2.mjs
function enumUnion(options) {
  return union(Object.entries(options).map(([key, value]) => object({ [key]: value })));
}
var Argument2 = enumUnion({
  GasCoin: literal(true),
  Input: pipe(number(), integer()),
  Result: pipe(number(), integer()),
  NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())])
});
var GasData2 = object({
  budget: nullable(JsonU64),
  price: nullable(JsonU64),
  owner: nullable(SuiAddress),
  payment: nullable(array(ObjectRefSchema))
});
var ProgrammableMoveCall2 = object({
  package: ObjectID,
  module: string(),
  function: string(),
  typeArguments: array(string()),
  arguments: array(Argument2)
});
var $Intent2 = object({
  name: string(),
  inputs: record(string(), union([Argument2, array(Argument2)])),
  data: record(string(), unknown())
});
var Command2 = enumUnion({
  MoveCall: ProgrammableMoveCall2,
  TransferObjects: object({
    objects: array(Argument2),
    address: Argument2
  }),
  SplitCoins: object({
    coin: Argument2,
    amounts: array(Argument2)
  }),
  MergeCoins: object({
    destination: Argument2,
    sources: array(Argument2)
  }),
  Publish: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID)
  }),
  MakeMoveVec: object({
    type: nullable(string()),
    elements: array(Argument2)
  }),
  Upgrade: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID),
    package: ObjectID,
    ticket: Argument2
  }),
  $Intent: $Intent2
});
var CallArg2 = enumUnion({
  Object: enumUnion({
    ImmOrOwnedObject: ObjectRefSchema,
    SharedObject: object({
      objectId: ObjectID,
      initialSharedVersion: JsonU64,
      mutable: boolean()
    }),
    Receiving: ObjectRefSchema
  }),
  Pure: object({ bytes: BCSBytes }),
  UnresolvedPure: object({ value: unknown() }),
  UnresolvedObject: object({
    objectId: ObjectID,
    version: optional(nullable(JsonU64)),
    digest: optional(nullable(string())),
    initialSharedVersion: optional(nullable(JsonU64)),
    mutable: optional(nullable(boolean()))
  }),
  FundsWithdrawal: FundsWithdrawalArgSchema
});
var TransactionExpiration4 = enumUnion({
  None: literal(true),
  Epoch: JsonU64,
  ValidDuring: ValidDuringSchema
});
var SerializedTransactionDataV2Schema = object({
  version: literal(2),
  sender: nullish(SuiAddress),
  expiration: nullish(TransactionExpiration4),
  gasData: GasData2,
  inputs: array(CallArg2),
  commands: array(Command2),
  digest: optional(nullable(string()))
});

// node_modules/@mysten/sui/dist/client/errors.mjs
var SuiClientError = class extends Error {
};
var SimulationError = class extends SuiClientError {
  constructor(message, options) {
    super(message, { cause: options?.cause });
    this.executionError = options?.executionError;
  }
};
var ObjectError = class ObjectError2 extends SuiClientError {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  static fromResponse(response, objectId) {
    switch (response.code) {
      case "notExists":
        return new ObjectError2(response.code, `Object ${response.object_id} does not exist`);
      case "dynamicFieldNotFound":
        return new ObjectError2(response.code, `Dynamic field not found for object ${response.parent_object_id}`);
      case "deleted":
        return new ObjectError2(response.code, `Object ${response.object_id} has been deleted`);
      case "displayError":
        return new ObjectError2(response.code, `Display error: ${response.error}`);
      case "unknown":
      default:
        return new ObjectError2(response.code, `Unknown error while loading object${objectId ? ` ${objectId}` : ""}`);
    }
  }
};

// node_modules/@mysten/sui/dist/utils/dynamic-fields.mjs
function deriveDynamicFieldID(parentId, typeTag, key) {
  const address = suiBcs.Address.serialize(parentId).toBytes();
  const tag = suiBcs.TypeTag.serialize(typeTag).toBytes();
  const keyLength = suiBcs.u64().serialize(key.length).toBytes();
  const hash = blake2b.create({ dkLen: 32 });
  hash.update(new Uint8Array([240]));
  hash.update(address);
  hash.update(keyLength);
  hash.update(key);
  hash.update(tag);
  return `0x${toHex(hash.digest().slice(0, 32))}`;
}

// node_modules/@mysten/sui/dist/utils/coin-reservation.mjs
var SUI_ACCUMULATOR_ROOT_OBJECT_ID = normalizeSuiAddress("0xacc");
var ACCUMULATOR_KEY_TYPE_TAG = TypeTagSerializer.parseFromStr("0x2::accumulator::Key<0x2::balance::Balance<0x2::sui::SUI>>");
var COIN_RESERVATION_MAGIC = new Uint8Array([
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172
]);
function isCoinReservationDigest(digestBase58) {
  return fromBase58(digestBase58).slice(12, 32).every((byte, i) => byte === COIN_RESERVATION_MAGIC[i]);
}
function deriveReservationObjectId(owner, chainIdentifier) {
  const accBytes = fromHex(deriveDynamicFieldID(SUI_ACCUMULATOR_ROOT_OBJECT_ID, ACCUMULATOR_KEY_TYPE_TAG, suiBcs.Address.serialize(owner).toBytes()).slice(2));
  const chainBytes = fromBase58(chainIdentifier);
  if (chainBytes.length !== 32) throw new Error(`Invalid chain identifier length: expected 32 bytes, got ${chainBytes.length}`);
  const xored = new Uint8Array(32);
  for (let i = 0; i < 32; i++) xored[i] = accBytes[i] ^ chainBytes[i];
  return `0x${toHex(xored)}`;
}
function createCoinReservationRef(reservedBalance, owner, chainIdentifier, epoch) {
  const digestBytes = new Uint8Array(32);
  const view = new DataView(digestBytes.buffer);
  view.setBigUint64(0, reservedBalance, true);
  const epochNum = Number(epoch);
  if (!Number.isSafeInteger(epochNum) || epochNum < 0 || epochNum > 4294967295) throw new Error(`Epoch ${epoch} out of u32 range for coin reservation digest`);
  view.setUint32(8, epochNum, true);
  digestBytes.set(COIN_RESERVATION_MAGIC, 12);
  return parse(ObjectRefSchema, {
    objectId: deriveReservationObjectId(owner, chainIdentifier),
    version: "0",
    digest: toBase58(digestBytes)
  });
}

// node_modules/@mysten/sui/dist/client/core-resolver.mjs
var MAX_OBJECTS_PER_FETCH = 50;
var GAS_SAFE_OVERHEAD = 1000n;
var MAX_GAS = 5e10;
function computeGasBudget(gasUsed, gasPrice = 1n) {
  const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(gasPrice);
  const baseComputationCostWithOverhead = BigInt(gasUsed.computationCost) + safeOverhead;
  const gasBudget = baseComputationCostWithOverhead + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);
  return String(gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead);
}
function getClient(options) {
  if (!options.client) throw new Error(`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`);
  return options.client;
}
async function coreClientResolveTransactionPlugin(transactionData, options, next) {
  const client = getClient(options);
  const needsGasPrice = !options.onlyTransactionKind && !transactionData.gasData.price;
  const needsPayment = !options.onlyTransactionKind && !transactionData.gasData.payment;
  const gasPayer = transactionData.gasData.owner ?? transactionData.sender;
  let usesGasCoin = false;
  let withdrawals = 0n;
  transactionData.mapArguments((arg) => {
    if (arg.$kind === "GasCoin") usesGasCoin = true;
    return arg;
  });
  const normalizedGasPayer = gasPayer ? normalizeSuiAddress(gasPayer) : null;
  for (const input of transactionData.inputs) {
    if (input.$kind !== "FundsWithdrawal" || !normalizedGasPayer) continue;
    if (normalizeStructTag(input.FundsWithdrawal.typeArg.Balance) !== SUI_TYPE_ARG) continue;
    const withdrawalOwner = input.FundsWithdrawal.withdrawFrom.Sender ? transactionData.sender : gasPayer;
    if (withdrawalOwner && normalizeSuiAddress(withdrawalOwner) === normalizedGasPayer && input.FundsWithdrawal.reservation.$kind === "MaxAmountU64") withdrawals += BigInt(input.FundsWithdrawal.reservation.MaxAmountU64);
  }
  const needsSimulateExpiration = !options.onlyTransactionKind && !transactionData.expiration && !transactionData.gasData.budget;
  const needsSystemState = needsGasPrice || needsPayment && usesGasCoin || needsSimulateExpiration;
  const needsChainId = needsPayment && usesGasCoin || needsSimulateExpiration;
  const [, systemStateResult, balanceResult, coinsResult, chainIdResult] = await Promise.all([
    normalizeInputs(transactionData, client),
    needsSystemState ? client.core.getCurrentSystemState() : null,
    needsPayment && gasPayer ? client.core.getBalance({ owner: gasPayer }) : null,
    needsPayment && gasPayer ? client.core.listCoins({
      owner: gasPayer,
      coinType: SUI_TYPE_ARG
    }) : null,
    needsChainId ? client.core.getChainIdentifier() : null
  ]);
  await resolveObjectReferences(transactionData, client);
  if (!options.onlyTransactionKind) {
    const systemState = systemStateResult?.systemState ?? null;
    const chainIdentifier = chainIdResult?.chainIdentifier ?? null;
    if (systemState && !transactionData.gasData.price) transactionData.gasData.price = systemState.referenceGasPrice;
    await setGasBudget(transactionData, client, needsSimulateExpiration && systemState && chainIdentifier ? buildValidDuringExpiration(systemState, chainIdentifier) : void 0);
    if (needsPayment) {
      if (!balanceResult || !coinsResult) throw new Error("Could not resolve gas payment: a gas owner or sender must be set to fetch balance and coins.");
      setGasPayment({
        transactionData,
        balance: balanceResult,
        coins: coinsResult,
        usesGasCoin,
        withdrawals,
        gasPayer,
        chainIdentifier,
        epoch: systemState?.epoch ?? null
      });
    }
    if (!transactionData.expiration && transactionData.gasData.payment?.length === 0) await setExpiration(transactionData, client, systemState, chainIdentifier);
  }
  return await next();
}
async function setGasBudget(transactionData, client, simulateExpiration) {
  if (transactionData.gasData.budget) return;
  const simulateResult = await client.core.simulateTransaction({
    transaction: transactionData.build({ overrides: {
      gasData: {
        budget: String(MAX_GAS),
        payment: []
      },
      ...simulateExpiration && { expiration: simulateExpiration }
    } }),
    include: { effects: true }
  });
  if (simulateResult.$kind === "FailedTransaction") {
    const executionError = simulateResult.FailedTransaction.status.error ?? void 0;
    throw new SimulationError(`Transaction resolution failed: ${executionError?.message ?? "Unknown error"}`, {
      cause: simulateResult,
      executionError
    });
  }
  transactionData.gasData.budget = computeGasBudget(simulateResult.Transaction.effects.gasUsed, transactionData.gasData.price ? String(transactionData.gasData.price) : void 0);
}
function setGasPayment({ transactionData, balance, coins, usesGasCoin, withdrawals, gasPayer, chainIdentifier, epoch }) {
  const budget = BigInt(transactionData.gasData.budget);
  const addressBalance = BigInt(balance.balance.addressBalance);
  if (budget === 0n || !usesGasCoin && addressBalance >= budget + withdrawals) {
    transactionData.gasData.payment = [];
    return;
  }
  const filteredCoins = coins.objects.filter((coin) => {
    return !transactionData.inputs.find((input) => {
      if (input.Object?.ImmOrOwnedObject) return coin.objectId === input.Object.ImmOrOwnedObject.objectId;
      return false;
    });
  });
  const paymentCoins = filteredCoins.map((coin) => ({
    objectId: coin.objectId,
    digest: coin.digest,
    version: coin.version
  }));
  const reservationAmount = addressBalance - withdrawals;
  if (usesGasCoin && reservationAmount > 0n && chainIdentifier && epoch) transactionData.gasData.payment = [createCoinReservationRef(reservationAmount, gasPayer, chainIdentifier, epoch), ...paymentCoins];
  else if (!filteredCoins.length) throw new Error("No valid gas coins found for the transaction.");
  else transactionData.gasData.payment = paymentCoins;
}
async function setExpiration(transactionData, client, systemState, existingChainIdentifier = null) {
  const [chainIdentifier, resolvedSystemState] = await Promise.all([existingChainIdentifier ?? client.core.getChainIdentifier().then((r) => r.chainIdentifier), systemState ?? client.core.getCurrentSystemState().then((r) => r.systemState)]);
  transactionData.expiration = buildValidDuringExpiration(resolvedSystemState, chainIdentifier);
}
function buildValidDuringExpiration(systemState, chainIdentifier) {
  const currentEpoch = BigInt(systemState.epoch);
  return {
    $kind: "ValidDuring",
    ValidDuring: {
      minEpoch: String(currentEpoch),
      maxEpoch: String(currentEpoch + 1n),
      minTimestamp: null,
      maxTimestamp: null,
      chain: chainIdentifier,
      nonce: Math.random() * 4294967296 >>> 0
    }
  };
}
async function resolveObjectReferences(transactionData, client) {
  const objectsToResolve = transactionData.inputs.filter((input) => {
    return input.UnresolvedObject && !(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion);
  });
  const dedupedIds = [...new Set(objectsToResolve.map((input) => normalizeSuiObjectId(input.UnresolvedObject.objectId)))];
  const objectChunks = dedupedIds.length ? chunk(dedupedIds, MAX_OBJECTS_PER_FETCH) : [];
  const resolved = (await Promise.all(objectChunks.map((chunkIds) => client.core.getObjects({ objectIds: chunkIds })))).flatMap((result) => result.objects);
  const responsesById = new Map(dedupedIds.map((id, index) => {
    return [id, resolved[index]];
  }));
  const invalidObjects = Array.from(responsesById).filter(([_, obj]) => obj instanceof Error).map(([_, obj]) => obj.message);
  if (invalidObjects.length) throw new Error(`The following input objects are invalid: ${invalidObjects.join(", ")}`);
  const objects = resolved.map((object2) => {
    if (object2 instanceof Error) throw new Error(`Failed to fetch object: ${object2.message}`);
    const owner = object2.owner;
    const initialSharedVersion = owner && typeof owner === "object" ? owner.$kind === "Shared" ? owner.Shared.initialSharedVersion : owner.$kind === "ConsensusAddressOwner" ? owner.ConsensusAddressOwner.startVersion : null : null;
    return {
      objectId: object2.objectId,
      digest: object2.digest,
      version: object2.version,
      initialSharedVersion
    };
  });
  const objectsById = new Map(dedupedIds.map((id, index) => {
    return [id, objects[index]];
  }));
  for (const [index, input] of transactionData.inputs.entries()) {
    if (!input.UnresolvedObject) continue;
    let updated;
    const id = normalizeSuiAddress(input.UnresolvedObject.objectId);
    const object2 = objectsById.get(id);
    if (input.UnresolvedObject.initialSharedVersion ?? object2?.initialSharedVersion) updated = Inputs.SharedObjectRef({
      objectId: id,
      initialSharedVersion: input.UnresolvedObject.initialSharedVersion || object2?.initialSharedVersion,
      mutable: input.UnresolvedObject.mutable || isUsedAsMutable(transactionData, index)
    });
    else if (isUsedAsReceiving(transactionData, index)) updated = Inputs.ReceivingRef({
      objectId: id,
      digest: input.UnresolvedObject.digest ?? object2?.digest,
      version: input.UnresolvedObject.version ?? object2?.version
    });
    transactionData.inputs[transactionData.inputs.indexOf(input)] = updated ?? Inputs.ObjectRef({
      objectId: id,
      digest: input.UnresolvedObject.digest ?? object2?.digest,
      version: input.UnresolvedObject.version ?? object2?.version
    });
  }
}
async function normalizeInputs(transactionData, client) {
  const { inputs, commands } = transactionData;
  const moveCallsToResolve = [];
  const moveFunctionsToResolve = /* @__PURE__ */ new Set();
  commands.forEach((command) => {
    if (command.MoveCall) {
      if (command.MoveCall._argumentTypes) return;
      if (command.MoveCall.arguments.map((arg) => {
        if (arg.$kind === "Input") return transactionData.inputs[arg.Input];
        return null;
      }).some((input) => input?.UnresolvedPure || input?.UnresolvedObject && typeof input?.UnresolvedObject.mutable !== "boolean")) {
        const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
        moveFunctionsToResolve.add(functionName);
        moveCallsToResolve.push(command.MoveCall);
      }
    }
  });
  const moveFunctionParameters = /* @__PURE__ */ new Map();
  if (moveFunctionsToResolve.size > 0) await Promise.all([...moveFunctionsToResolve].map(async (functionName) => {
    const [packageId, moduleName, name] = functionName.split("::");
    const { function: def } = await client.core.getMoveFunction({
      packageId,
      moduleName,
      name
    });
    moveFunctionParameters.set(functionName, def.parameters);
  }));
  if (moveCallsToResolve.length) await Promise.all(moveCallsToResolve.map(async (moveCall) => {
    const parameters = moveFunctionParameters.get(`${moveCall.package}::${moveCall.module}::${moveCall.function}`);
    if (!parameters) return;
    moveCall._argumentTypes = parameters.length > 0 && isTxContext(parameters.at(-1)) ? parameters.slice(0, parameters.length - 1) : parameters;
  }));
  commands.forEach((command) => {
    if (!command.MoveCall) return;
    const moveCall = command.MoveCall;
    const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
    const params = moveCall._argumentTypes;
    if (!params) return;
    if (params.length !== command.MoveCall.arguments.length) throw new Error(`Incorrect number of arguments for ${fnName}`);
    params.forEach((param, i) => {
      const arg = moveCall.arguments[i];
      if (arg.$kind !== "Input") return;
      const input = inputs[arg.Input];
      if (!input.UnresolvedPure && !input.UnresolvedObject) return;
      const inputValue = input.UnresolvedPure?.value ?? input.UnresolvedObject?.objectId;
      const schema = getPureBcsSchema(param.body);
      if (schema) {
        arg.type = "pure";
        inputs[inputs.indexOf(input)] = Inputs.Pure(schema.serialize(inputValue));
        return;
      }
      if (typeof inputValue !== "string") throw new Error(`Expect the argument to be an object id string, got ${JSON.stringify(inputValue, null, 2)}`);
      arg.type = "object";
      const unresolvedObject = input.UnresolvedPure ? {
        $kind: "UnresolvedObject",
        UnresolvedObject: { objectId: inputValue }
      } : input;
      inputs[arg.Input] = unresolvedObject;
    });
  });
}
function isUsedAsMutable(transactionData, index) {
  let usedAsMutable = false;
  transactionData.getInputUses(index, (arg, tx) => {
    if (tx.MoveCall && tx.MoveCall._argumentTypes) {
      const argIndex = tx.MoveCall.arguments.indexOf(arg);
      usedAsMutable = tx.MoveCall._argumentTypes[argIndex].reference !== "immutable" || usedAsMutable;
    }
    if (tx.$kind === "MakeMoveVec" || tx.$kind === "MergeCoins" || tx.$kind === "SplitCoins" || tx.$kind === "TransferObjects") usedAsMutable = true;
  });
  return usedAsMutable;
}
function isUsedAsReceiving(transactionData, index) {
  let usedAsReceiving = false;
  transactionData.getInputUses(index, (arg, tx) => {
    if (tx.MoveCall && tx.MoveCall._argumentTypes) {
      const argIndex = tx.MoveCall.arguments.indexOf(arg);
      usedAsReceiving = isReceivingType(tx.MoveCall._argumentTypes[argIndex]) || usedAsReceiving;
    }
  });
  return usedAsReceiving;
}
var RECEIVING_TYPE = "0x0000000000000000000000000000000000000000000000000000000000000002::transfer::Receiving";
function isReceivingType(type) {
  if (type.body.$kind !== "datatype") return false;
  return type.body.datatype.typeName === RECEIVING_TYPE;
}

// node_modules/@mysten/sui/dist/transactions/resolve.mjs
function needsTransactionResolution(data, options) {
  if (data.inputs.some((input) => {
    return input.UnresolvedObject || input.UnresolvedPure;
  })) return true;
  if (!options.onlyTransactionKind) {
    if (!data.gasData.price || !data.gasData.budget || !data.gasData.payment) return true;
    if (data.gasData.payment.length === 0 && !data.expiration) return true;
  }
  return false;
}
async function resolveTransactionPlugin(transactionData, options, next) {
  normalizeRawArguments(transactionData);
  if (!needsTransactionResolution(transactionData, options)) {
    await validate(transactionData);
    return next();
  }
  return (getClient2(options).core?.resolveTransactionPlugin() ?? coreClientResolveTransactionPlugin)(transactionData, options, async () => {
    await validate(transactionData);
    await next();
  });
}
function validate(transactionData) {
  transactionData.inputs.forEach((input, index) => {
    if (input.$kind !== "Object" && input.$kind !== "Pure" && input.$kind !== "FundsWithdrawal") throw new Error(`Input at index ${index} has not been resolved.  Expected a Pure, Object, or FundsWithdrawal input, but found ${JSON.stringify(input)}`);
  });
}
function getClient2(options) {
  if (!options.client) throw new Error(`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`);
  return options.client;
}
function normalizeRawArguments(transactionData) {
  for (const command of transactionData.commands) switch (command.$kind) {
    case "SplitCoins":
      command.SplitCoins.amounts.forEach((amount) => {
        normalizeRawArgument(amount, suiBcs.U64, transactionData);
      });
      break;
    case "TransferObjects":
      normalizeRawArgument(command.TransferObjects.address, suiBcs.Address, transactionData);
      break;
  }
}
function normalizeRawArgument(arg, schema, transactionData) {
  if (arg.$kind !== "Input") return;
  const input = transactionData.inputs[arg.Input];
  if (input.$kind !== "UnresolvedPure") return;
  transactionData.inputs[arg.Input] = Inputs.Pure(schema.serialize(input.UnresolvedPure.value));
}

// node_modules/@mysten/sui/dist/transactions/object.mjs
function createObjectMethods(makeObject) {
  function object2(value) {
    return makeObject(value);
  }
  object2.system = (options) => {
    const mutable = options?.mutable;
    if (mutable !== void 0) return object2(Inputs.SharedObjectRef({
      objectId: SUI_SYSTEM_STATE_OBJECT_ID,
      initialSharedVersion: 1,
      mutable
    }));
    return object2({
      $kind: "UnresolvedObject",
      UnresolvedObject: {
        objectId: SUI_SYSTEM_STATE_OBJECT_ID,
        initialSharedVersion: 1
      }
    });
  };
  object2.clock = () => object2(Inputs.SharedObjectRef({
    objectId: SUI_CLOCK_OBJECT_ID,
    initialSharedVersion: 1,
    mutable: false
  }));
  object2.random = () => object2({
    $kind: "UnresolvedObject",
    UnresolvedObject: {
      objectId: SUI_RANDOM_OBJECT_ID,
      mutable: false
    }
  });
  object2.denyList = (options) => {
    return object2({
      $kind: "UnresolvedObject",
      UnresolvedObject: {
        objectId: SUI_DENY_LIST_OBJECT_ID,
        mutable: options?.mutable
      }
    });
  };
  object2.option = ({ type, value }) => (tx) => tx.moveCall({
    typeArguments: [type],
    target: `${MOVE_STDLIB_ADDRESS}::option::${value === null ? "none" : "some"}`,
    arguments: value === null ? [] : [tx.object(value)]
  });
  return object2;
}

// node_modules/@mysten/sui/dist/transactions/pure.mjs
function createPure(makePure) {
  function pure(typeOrSerializedValue, value) {
    if (typeof typeOrSerializedValue === "string") return makePure(pureBcsSchemaFromTypeName(typeOrSerializedValue).serialize(value));
    if (typeOrSerializedValue instanceof Uint8Array || isSerializedBcs(typeOrSerializedValue)) return makePure(typeOrSerializedValue);
    throw new Error("tx.pure must be called either a bcs type name, or a serialized bcs value");
  }
  pure.u8 = (value) => makePure(suiBcs.U8.serialize(value));
  pure.u16 = (value) => makePure(suiBcs.U16.serialize(value));
  pure.u32 = (value) => makePure(suiBcs.U32.serialize(value));
  pure.u64 = (value) => makePure(suiBcs.U64.serialize(value));
  pure.u128 = (value) => makePure(suiBcs.U128.serialize(value));
  pure.u256 = (value) => makePure(suiBcs.U256.serialize(value));
  pure.bool = (value) => makePure(suiBcs.Bool.serialize(value));
  pure.string = (value) => makePure(suiBcs.String.serialize(value));
  pure.address = (value) => makePure(suiBcs.Address.serialize(value));
  pure.id = pure.address;
  pure.vector = (type, value) => {
    return makePure(suiBcs.vector(pureBcsSchemaFromTypeName(type)).serialize(value));
  };
  pure.option = (type, value) => {
    return makePure(suiBcs.option(pureBcsSchemaFromTypeName(type)).serialize(value));
  };
  return pure;
}

// node_modules/@mysten/sui/dist/version.mjs
var PACKAGE_VERSION = "2.17.0";

// node_modules/@mysten/sui/dist/client/mvr.mjs
var NAME_SEPARATOR2 = "/";
var MVR_API_HEADER = { "Mvr-Source": `@mysten/sui@${PACKAGE_VERSION}` };
var MvrClient = class {
  #cache;
  #url;
  #pageSize;
  #overrides;
  constructor({ cache, url, pageSize = 50, overrides }) {
    this.#cache = cache;
    this.#url = url;
    this.#pageSize = pageSize;
    this.#overrides = {
      packages: overrides?.packages,
      types: overrides?.types
    };
    validateOverrides(this.#overrides);
  }
  get #mvrPackageDataLoader() {
    return this.#cache.readSync(["#mvrPackageDataLoader", this.#url ?? ""], () => {
      const loader = new DataLoader(async (packages) => {
        if (!this.#url) throw new Error(`MVR Api URL is not set for the current client (resolving ${packages.join(", ")})`);
        const resolved = await this.#resolvePackages(packages);
        return packages.map((pkg) => resolved[pkg] ?? /* @__PURE__ */ new Error(`Failed to resolve package: ${pkg}`));
      });
      const overrides = this.#overrides?.packages;
      if (overrides) for (const [pkg, id] of Object.entries(overrides)) loader.prime(pkg, id);
      return loader;
    });
  }
  get #mvrTypeDataLoader() {
    return this.#cache.readSync(["#mvrTypeDataLoader", this.#url ?? ""], () => {
      const loader = new DataLoader(async (types) => {
        if (!this.#url) throw new Error(`MVR Api URL is not set for the current client (resolving ${types.join(", ")})`);
        const resolved = await this.#resolveTypes(types);
        return types.map((type) => resolved[type] ?? /* @__PURE__ */ new Error(`Failed to resolve type: ${type}`));
      });
      const overrides = this.#overrides?.types;
      if (overrides) for (const [type, id] of Object.entries(overrides)) loader.prime(type, id);
      return loader;
    });
  }
  async #resolvePackages(packages) {
    if (packages.length === 0) return {};
    const batches = chunk(packages, this.#pageSize);
    const results = {};
    await Promise.all(batches.map(async (batch) => {
      const data = await this.#fetch("/v1/resolution/bulk", { names: batch });
      if (!data?.resolution) return;
      for (const pkg of Object.keys(data?.resolution)) {
        const pkgData = data.resolution[pkg]?.package_id;
        if (!pkgData) continue;
        results[pkg] = pkgData;
      }
    }));
    return results;
  }
  async #resolveTypes(types) {
    if (types.length === 0) return {};
    const batches = chunk(types, this.#pageSize);
    const results = {};
    await Promise.all(batches.map(async (batch) => {
      const data = await this.#fetch("/v1/struct-definition/bulk", { types: batch });
      if (!data?.resolution) return;
      for (const type of Object.keys(data?.resolution)) {
        const typeData = data.resolution[type]?.type_tag;
        if (!typeData) continue;
        results[type] = typeData;
      }
    }));
    return results;
  }
  async #fetch(url, body) {
    if (!this.#url) throw new Error("MVR Api URL is not set for the current client");
    const response = await fetch(`${this.#url}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...MVR_API_HEADER
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Failed to resolve types: ${errorBody?.message}`);
    }
    return response.json();
  }
  async resolvePackage({ package: name }) {
    if (!hasMvrName(name)) return { package: name };
    return { package: await this.#mvrPackageDataLoader.load(name) };
  }
  async resolveType({ type }) {
    if (!hasMvrName(type)) return { type };
    const mvrTypes = [...extractMvrTypes(type)];
    const resolvedTypes = await this.#mvrTypeDataLoader.loadMany(mvrTypes);
    const typeMap = {};
    for (let i = 0; i < mvrTypes.length; i++) {
      const resolvedType = resolvedTypes[i];
      if (resolvedType instanceof Error) throw resolvedType;
      typeMap[mvrTypes[i]] = resolvedType;
    }
    return { type: replaceMvrNames(type, typeMap) };
  }
  async resolve({ types = [], packages = [] }) {
    const mvrTypes = /* @__PURE__ */ new Set();
    for (const type of types ?? []) extractMvrTypes(type, mvrTypes);
    const typesArray = [...mvrTypes];
    const [resolvedTypes, resolvedPackages] = await Promise.all([typesArray.length > 0 ? this.#mvrTypeDataLoader.loadMany(typesArray) : [], packages.length > 0 ? this.#mvrPackageDataLoader.loadMany(packages) : []]);
    const typeMap = { ...this.#overrides?.types };
    for (const [i, type] of typesArray.entries()) {
      const resolvedType = resolvedTypes[i];
      if (resolvedType instanceof Error) throw resolvedType;
      typeMap[type] = resolvedType;
    }
    const replacedTypes = {};
    for (const type of types ?? []) replacedTypes[type] = { type: replaceMvrNames(type, typeMap) };
    const replacedPackages = {};
    for (const [i, pkg] of (packages ?? []).entries()) {
      const resolvedPkg = this.#overrides?.packages?.[pkg] ?? resolvedPackages[i];
      if (resolvedPkg instanceof Error) throw resolvedPkg;
      replacedPackages[pkg] = { package: resolvedPkg };
    }
    return {
      types: replacedTypes,
      packages: replacedPackages
    };
  }
};
function validateOverrides(overrides) {
  if (overrides?.packages) for (const [pkg, id] of Object.entries(overrides.packages)) {
    if (!isValidNamedPackage(pkg)) throw new Error(`Invalid package name: ${pkg}`);
    if (!isValidSuiAddress(normalizeSuiAddress(id))) throw new Error(`Invalid package ID: ${id}`);
  }
  if (overrides?.types) for (const [type, val] of Object.entries(overrides.types)) {
    if (parseStructTag(type).typeParams.length > 0) throw new Error("Type overrides must be first-level only. If you want to supply generic types, just pass each type individually.");
    if (!isValidSuiAddress(parseStructTag(val).address)) throw new Error(`Invalid type: ${val}`);
  }
}
function extractMvrTypes(type, types = /* @__PURE__ */ new Set()) {
  if (typeof type === "string" && !hasMvrName(type)) return types;
  if (typeof type === "string" && type.startsWith("vector<") && type.endsWith(">")) return extractMvrTypes(type.slice(7, -1), types);
  const tag = isStructTag(type) ? type : parseStructTag(type);
  if (hasMvrName(tag.address)) types.add(`${tag.address}::${tag.module}::${tag.name}`);
  for (const param of tag.typeParams) extractMvrTypes(param, types);
  return types;
}
function replaceMvrNames(tag, typeCache) {
  if (typeof tag === "string" && !tag.includes("::")) return tag;
  if (typeof tag === "string" && tag.startsWith("vector<") && tag.endsWith(">")) return `vector<${replaceMvrNames(tag.slice(7, -1), typeCache)}>`;
  const type = isStructTag(tag) ? tag : parseStructTag(tag);
  const cacheHit = typeCache[`${type.address}::${type.module}::${type.name}`];
  return normalizeStructTag({
    ...type,
    address: cacheHit ? cacheHit.split("::")[0] : type.address,
    typeParams: type.typeParams.map((param) => replaceMvrNames(param, typeCache))
  });
}
function hasMvrName(nameOrType) {
  return nameOrType.includes(NAME_SEPARATOR2) || nameOrType.includes("@") || nameOrType.includes(".sui");
}
function isStructTag(type) {
  return typeof type === "object" && "address" in type && "module" in type && "name" in type && "typeParams" in type;
}
function findNamesInTransaction(builder) {
  const packages = /* @__PURE__ */ new Set();
  const types = /* @__PURE__ */ new Set();
  for (const command of builder.commands) switch (command.$kind) {
    case "MakeMoveVec":
      if (command.MakeMoveVec.type) getNamesFromTypeList([command.MakeMoveVec.type]).forEach((type) => {
        types.add(type);
      });
      break;
    case "MoveCall":
      const moveCall = command.MoveCall;
      const pkg = moveCall.package.split("::")[0];
      if (hasMvrName(pkg)) {
        if (!isValidNamedPackage(pkg)) throw new Error(`Invalid package name: ${pkg}`);
        packages.add(pkg);
      }
      getNamesFromTypeList(moveCall.typeArguments ?? []).forEach((type) => {
        types.add(type);
      });
      break;
    default:
      break;
  }
  return {
    packages: [...packages],
    types: [...types]
  };
}
function replaceNames(builder, resolved) {
  for (const command of builder.commands) {
    if (command.MakeMoveVec?.type) {
      if (!hasMvrName(command.MakeMoveVec.type)) continue;
      if (!resolved.types[command.MakeMoveVec.type]) throw new Error(`No resolution found for type: ${command.MakeMoveVec.type}`);
      command.MakeMoveVec.type = resolved.types[command.MakeMoveVec.type].type;
    }
    const tx = command.MoveCall;
    if (!tx) continue;
    const nameParts = tx.package.split("::");
    const name = nameParts[0];
    if (hasMvrName(name) && !resolved.packages[name]) throw new Error(`No address found for package: ${name}`);
    if (hasMvrName(name)) {
      nameParts[0] = resolved.packages[name].package;
      tx.package = nameParts.join("::");
    }
    const types = tx.typeArguments;
    if (!types) continue;
    for (let i = 0; i < types.length; i++) {
      if (!hasMvrName(types[i])) continue;
      if (!resolved.types[types[i]]) throw new Error(`No resolution found for type: ${types[i]}`);
      types[i] = resolved.types[types[i]].type;
    }
    tx.typeArguments = types;
  }
}
function getNamesFromTypeList(types) {
  const names = /* @__PURE__ */ new Set();
  for (const type of types) if (hasMvrName(type)) {
    if (!isValidNamedType(type)) throw new Error(`Invalid type with names: ${type}`);
    names.add(type);
  }
  return names;
}

// node_modules/@mysten/sui/dist/transactions/plugins/NamedPackagesPlugin.mjs
function namedPackagesPlugin() {
  return async (transactionData, buildOptions, next) => {
    const names = findNamesInTransaction(transactionData);
    if (names.types.length === 0 && names.packages.length === 0) return next();
    if (!buildOptions.client) throw new Error(`Transaction contains MVR names but no client was provided to resolve them. Please pass a client to Transaction#build()`);
    replaceNames(transactionData, await buildOptions.client.core.mvr.resolve({
      types: names.types,
      packages: names.packages
    }));
    await next();
  };
}

// node_modules/@mysten/sui/dist/transactions/Transaction.mjs
function createTransactionResult(index, length = Infinity) {
  const baseResult = {
    $kind: "Result",
    get Result() {
      return typeof index === "function" ? index() : index;
    }
  };
  const nestedResults = [];
  const nestedResultFor = (resultIndex) => nestedResults[resultIndex] ??= {
    $kind: "NestedResult",
    get NestedResult() {
      return [typeof index === "function" ? index() : index, resultIndex];
    }
  };
  return new Proxy(baseResult, {
    set() {
      throw new Error("The transaction result is a proxy, and does not support setting properties directly");
    },
    get(target, property) {
      if (property in target) return Reflect.get(target, property);
      if (property === Symbol.iterator) return function* () {
        let i = 0;
        while (i < length) {
          yield nestedResultFor(i);
          i++;
        }
      };
      if (typeof property === "symbol") return;
      const resultIndex = parseInt(property, 10);
      if (Number.isNaN(resultIndex) || resultIndex < 0) return;
      return nestedResultFor(resultIndex);
    }
  });
}
var TRANSACTION_BRAND = /* @__PURE__ */ Symbol.for("@mysten/transaction");
function isTransaction(obj) {
  return !!obj && typeof obj === "object" && obj[TRANSACTION_BRAND] === true;
}
var Transaction = class Transaction2 {
  #serializationPlugins;
  #buildPlugins;
  #intentResolvers = /* @__PURE__ */ new Map();
  #inputSection = [];
  #commandSection = [];
  #availableResults = /* @__PURE__ */ new Set();
  #pendingPromises = /* @__PURE__ */ new Set();
  #added = /* @__PURE__ */ new Map();
  /**
  * Converts from a serialize transaction kind (built with `build({ onlyTransactionKind: true })`) to a `Transaction` class.
  * Supports either a byte array, or base64-encoded bytes.
  */
  static fromKind(serialized) {
    const tx = new Transaction2();
    tx.#data = TransactionDataBuilder.fromKindBytes(typeof serialized === "string" ? fromBase64(serialized) : serialized);
    tx.#inputSection = tx.#data.inputs.slice();
    tx.#commandSection = tx.#data.commands.slice();
    tx.#availableResults = new Set(tx.#commandSection.map((_, i) => i));
    return tx;
  }
  /**
  * Converts from a serialized transaction format to a `Transaction` class.
  * There are two supported serialized formats:
  * - A string returned from `Transaction#serialize`. The serialized format must be compatible, or it will throw an error.
  * - A byte array (or base64-encoded bytes) containing BCS transaction data.
  */
  static from(transaction) {
    const newTransaction = new Transaction2();
    if (isTransaction(transaction)) newTransaction.#data = TransactionDataBuilder.restore(transaction.getData());
    else if (typeof transaction !== "string" || !transaction.startsWith("{")) newTransaction.#data = TransactionDataBuilder.fromBytes(typeof transaction === "string" ? fromBase64(transaction) : transaction);
    else newTransaction.#data = TransactionDataBuilder.restore(JSON.parse(transaction));
    newTransaction.#inputSection = newTransaction.#data.inputs.slice();
    newTransaction.#commandSection = newTransaction.#data.commands.slice();
    newTransaction.#availableResults = new Set(newTransaction.#commandSection.map((_, i) => i));
    if (!newTransaction.isPreparedForSerialization({ supportedIntents: [COIN_WITH_BALANCE] })) throw new Error("Transaction has unresolved intents or async thunks. Call `prepareForSerialization` before copying.");
    if (newTransaction.#data.commands.some((cmd) => cmd.$Intent?.name === COIN_WITH_BALANCE)) newTransaction.addIntentResolver(COIN_WITH_BALANCE, resolveCoinBalance);
    return newTransaction;
  }
  addSerializationPlugin(step) {
    this.#serializationPlugins.push(step);
  }
  addBuildPlugin(step) {
    this.#buildPlugins.push(step);
  }
  addIntentResolver(intent, resolver) {
    if (this.#intentResolvers.has(intent) && this.#intentResolvers.get(intent) !== resolver) throw new Error(`Intent resolver for ${intent} already exists`);
    this.#intentResolvers.set(intent, resolver);
  }
  setSender(sender) {
    this.#data.sender = sender;
  }
  /**
  * Sets the sender only if it has not already been set.
  * This is useful for sponsored transaction flows where the sender may not be the same as the signer address.
  */
  setSenderIfNotSet(sender) {
    if (!this.#data.sender) this.#data.sender = sender;
  }
  setExpiration(expiration) {
    this.#data.expiration = expiration ? parse(TransactionExpiration2, expiration) : null;
  }
  setGasPrice(price) {
    this.#data.gasData.price = String(price);
  }
  setGasBudget(budget) {
    this.#data.gasData.budget = String(budget);
  }
  setGasBudgetIfNotSet(budget) {
    if (this.#data.gasData.budget == null) this.#data.gasData.budget = String(budget);
  }
  setGasOwner(owner) {
    this.#data.gasData.owner = owner;
  }
  setGasPayment(payments) {
    this.#data.gasData.payment = payments.map((payment) => parse(ObjectRefSchema, payment));
  }
  #data;
  /** Get a snapshot of the transaction data, in JSON form: */
  getData() {
    return this.#data.snapshot();
  }
  get [TRANSACTION_BRAND]() {
    return true;
  }
  get pure() {
    Object.defineProperty(this, "pure", {
      enumerable: false,
      value: createPure((value) => {
        if (isSerializedBcs(value)) return this.#addInput("pure", {
          $kind: "Pure",
          Pure: { bytes: value.toBase64() }
        });
        return this.#addInput("pure", is(NormalizedCallArg, value) ? parse(NormalizedCallArg, value) : value instanceof Uint8Array ? Inputs.Pure(value) : {
          $kind: "UnresolvedPure",
          UnresolvedPure: { value }
        });
      })
    });
    return this.pure;
  }
  constructor() {
    this.object = createObjectMethods((value) => {
      if (typeof value === "function") return this.object(this.add(value));
      if (typeof value === "object" && is(ArgumentSchema, value)) return value;
      const id = getIdFromCallArg(value);
      const inserted = this.#data.inputs.find((i) => id === getIdFromCallArg(i));
      if (inserted?.Object?.SharedObject && typeof value === "object" && value.Object?.SharedObject) inserted.Object.SharedObject.mutable = inserted.Object.SharedObject.mutable || value.Object.SharedObject.mutable;
      return inserted ? {
        $kind: "Input",
        Input: this.#data.inputs.indexOf(inserted),
        type: "object"
      } : this.#addInput("object", typeof value === "string" ? {
        $kind: "UnresolvedObject",
        UnresolvedObject: { objectId: normalizeSuiAddress(value) }
      } : value);
    });
    this.#data = new TransactionDataBuilder();
    this.#buildPlugins = [];
    this.#serializationPlugins = [];
  }
  /** Returns an argument for the gas coin, to be used in a transaction. */
  get gas() {
    return {
      $kind: "GasCoin",
      GasCoin: true
    };
  }
  /**
  * Creates a coin of the specified type and balance.
  * Sourced from address balance when available, falling back to owned coins.
  */
  coin({ type, balance, useGasCoin }) {
    return this.add(coinWithBalance({
      type,
      balance,
      useGasCoin
    }));
  }
  /**
  * Creates a Balance object of the specified type and balance.
  * Sourced from address balance when available, falling back to owned coins.
  */
  balance({ type, balance, useGasCoin }) {
    return this.add(createBalance({
      type,
      balance,
      useGasCoin
    }));
  }
  /**
  * Add a new object input to the transaction using the fully-resolved object reference.
  * If you only have an object ID, use `builder.object(id)` instead.
  */
  objectRef(...args) {
    return this.object(Inputs.ObjectRef(...args));
  }
  /**
  * Add a new receiving input to the transaction using the fully-resolved object reference.
  * If you only have an object ID, use `builder.object(id)` instead.
  */
  receivingRef(...args) {
    return this.object(Inputs.ReceivingRef(...args));
  }
  /**
  * Add a new shared object input to the transaction using the fully-resolved shared object reference.
  * If you only have an object ID, use `builder.object(id)` instead.
  */
  sharedObjectRef(...args) {
    return this.object(Inputs.SharedObjectRef(...args));
  }
  #fork() {
    const fork = new Transaction2();
    fork.#data = this.#data;
    fork.#serializationPlugins = this.#serializationPlugins;
    fork.#buildPlugins = this.#buildPlugins;
    fork.#intentResolvers = this.#intentResolvers;
    fork.#pendingPromises = this.#pendingPromises;
    fork.#availableResults = new Set(this.#availableResults);
    fork.#added = this.#added;
    this.#inputSection.push(fork.#inputSection);
    this.#commandSection.push(fork.#commandSection);
    return fork;
  }
  add(command) {
    if (typeof command === "function") {
      if (this.#added.has(command)) return this.#added.get(command);
      const fork = this.#fork();
      const result = command(fork);
      if (!(result && typeof result === "object" && "then" in result)) {
        this.#availableResults = fork.#availableResults;
        this.#added.set(command, result);
        return result;
      }
      const placeholder = this.#addCommand({
        $kind: "$Intent",
        $Intent: {
          name: "AsyncTransactionThunk",
          inputs: {},
          data: {
            resultIndex: this.#data.commands.length,
            result: null
          }
        }
      });
      this.#pendingPromises.add(Promise.resolve(result).then((result$1) => {
        placeholder.$Intent.data.result = result$1;
      }));
      const txResult = createTransactionResult(() => placeholder.$Intent.data.resultIndex);
      this.#added.set(command, txResult);
      return txResult;
    } else this.#addCommand(command);
    return createTransactionResult(this.#data.commands.length - 1);
  }
  #addCommand(command) {
    const resultIndex = this.#data.commands.length;
    this.#commandSection.push(command);
    this.#availableResults.add(resultIndex);
    this.#data.commands.push(command);
    this.#data.mapCommandArguments(resultIndex, (arg) => {
      if (arg.$kind === "Result" && !this.#availableResults.has(arg.Result)) throw new Error(`Result { Result: ${arg.Result} } is not available to use in the current transaction`);
      if (arg.$kind === "NestedResult" && !this.#availableResults.has(arg.NestedResult[0])) throw new Error(`Result { NestedResult: [${arg.NestedResult[0]}, ${arg.NestedResult[1]}] } is not available to use in the current transaction`);
      if (arg.$kind === "Input" && arg.Input >= this.#data.inputs.length) throw new Error(`Input { Input: ${arg.Input} } references an input that does not exist in the current transaction`);
      return arg;
    });
    return command;
  }
  #addInput(type, input) {
    this.#inputSection.push(input);
    return this.#data.addInput(type, input);
  }
  #normalizeTransactionArgument(arg) {
    if (isSerializedBcs(arg)) return this.pure(arg);
    return this.#resolveArgument(arg);
  }
  #resolveArgument(arg) {
    if (typeof arg === "function") {
      const resolved = this.add(arg);
      if (typeof resolved === "function") return this.#resolveArgument(resolved);
      return parse(ArgumentSchema, resolved);
    }
    return parse(ArgumentSchema, arg);
  }
  splitCoins(coin, amounts) {
    const command = TransactionCommands.SplitCoins(typeof coin === "string" ? this.object(coin) : this.#resolveArgument(coin), amounts.map((amount) => typeof amount === "number" || typeof amount === "bigint" || typeof amount === "string" ? this.pure.u64(amount) : this.#normalizeTransactionArgument(amount)));
    this.#addCommand(command);
    return createTransactionResult(this.#data.commands.length - 1, amounts.length);
  }
  mergeCoins(destination, sources) {
    return this.add(TransactionCommands.MergeCoins(this.object(destination), sources.map((src) => this.object(src))));
  }
  publish({ modules, dependencies }) {
    return this.add(TransactionCommands.Publish({
      modules,
      dependencies
    }));
  }
  upgrade({ modules, dependencies, package: packageId, ticket }) {
    return this.add(TransactionCommands.Upgrade({
      modules,
      dependencies,
      package: packageId,
      ticket: this.object(ticket)
    }));
  }
  moveCall({ arguments: args, ...input }) {
    return this.add(TransactionCommands.MoveCall({
      ...input,
      arguments: args?.map((arg) => this.#normalizeTransactionArgument(arg))
    }));
  }
  transferObjects(objects, address) {
    return this.add(TransactionCommands.TransferObjects(objects.map((obj) => this.object(obj)), typeof address === "string" ? this.pure.address(address) : this.#normalizeTransactionArgument(address)));
  }
  makeMoveVec({ type, elements }) {
    return this.add(TransactionCommands.MakeMoveVec({
      type,
      elements: elements.map((obj) => this.object(obj))
    }));
  }
  /**
  * Create a FundsWithdrawal input for withdrawing Balance<T> from an address balance accumulator.
  * This is used for gas payments from address balances.
  *
  * @param options.amount - The Amount to withdraw (u64).
  * @param options.type - The balance type (e.g., "0x2::sui::SUI"). Defaults to SUI.
  */
  withdrawal({ amount, type }) {
    const input = {
      $kind: "FundsWithdrawal",
      FundsWithdrawal: {
        reservation: {
          $kind: "MaxAmountU64",
          MaxAmountU64: String(amount)
        },
        typeArg: {
          $kind: "Balance",
          Balance: type ?? "0x2::sui::SUI"
        },
        withdrawFrom: {
          $kind: "Sender",
          Sender: true
        }
      }
    };
    return this.#addInput("object", input);
  }
  /**
  * @deprecated Use toJSON instead.
  * For synchronous serialization, you can use `getData()`
  * */
  serialize() {
    return JSON.stringify(serializeV1TransactionData(this.#data.snapshot()));
  }
  async toJSON(options = {}) {
    await this.prepareForSerialization(options);
    const fullyResolved = this.isFullyResolved();
    return JSON.stringify(parse(SerializedTransactionDataV2Schema, fullyResolved ? {
      ...this.#data.snapshot(),
      digest: this.#data.getDigest()
    } : this.#data.snapshot()), (_key, value) => typeof value === "bigint" ? value.toString() : value, 2);
  }
  /** Build the transaction to BCS bytes, and sign it with the provided keypair. */
  async sign(options) {
    const { signer, ...buildOptions } = options;
    const bytes = await this.build(buildOptions);
    return signer.signTransaction(bytes);
  }
  /**
  * Checks if the transaction is prepared for serialization to JSON.
  * This means:
  *  - All async thunks have been fully resolved
  *  - All transaction intents have been resolved (unless in supportedIntents)
  *
  * Unlike `isFullyResolved()`, this does not require the sender, gas payment,
  * budget, or object versions to be set.
  */
  isPreparedForSerialization(options = {}) {
    if (this.#pendingPromises.size > 0) return false;
    if (this.#data.commands.some((cmd) => cmd.$Intent && !options.supportedIntents?.includes(cmd.$Intent.name))) return false;
    return true;
  }
  /**
  *  Ensures that:
  *  - All objects have been fully resolved to a specific version
  *  - All pure inputs have been serialized to bytes
  *  - All async thunks have been fully resolved
  *  - All transaction intents have been resolved
  * 	- The gas payment, budget, and price have been set
  *  - The transaction sender has been set
  *
  *  When true, the transaction will always be built to the same bytes and digest (unless the transaction is mutated)
  */
  isFullyResolved() {
    if (!this.isPreparedForSerialization()) return false;
    if (!this.#data.sender) return false;
    if (needsTransactionResolution(this.#data, {})) return false;
    return true;
  }
  /** Build the transaction to BCS bytes. */
  async build(options = {}) {
    await this.prepareForSerialization(options);
    await this.#prepareBuild(options);
    return this.#data.build({ onlyTransactionKind: options.onlyTransactionKind });
  }
  /** Derive transaction digest */
  async getDigest(options = {}) {
    await this.prepareForSerialization(options);
    await this.#prepareBuild(options);
    return this.#data.getDigest();
  }
  /**
  * Prepare the transaction by validating the transaction data and resolving all inputs
  * so that it can be built into bytes.
  */
  async #prepareBuild(options) {
    if (!options.onlyTransactionKind && !this.#data.sender) throw new Error("Missing transaction sender");
    await this.#runPlugins([...this.#buildPlugins, resolveTransactionPlugin], options);
  }
  async #runPlugins(plugins, options) {
    try {
      const createNext = (i) => {
        if (i >= plugins.length) return () => {
        };
        const plugin = plugins[i];
        return async () => {
          const next = createNext(i + 1);
          let calledNext = false;
          let nextResolved = false;
          await plugin(this.#data, options, async () => {
            if (calledNext) throw new Error(`next() was call multiple times in TransactionPlugin ${i}`);
            calledNext = true;
            await next();
            nextResolved = true;
          });
          if (!calledNext) throw new Error(`next() was not called in TransactionPlugin ${i}`);
          if (!nextResolved) throw new Error(`next() was not awaited in TransactionPlugin ${i}`);
        };
      };
      await createNext(0)();
    } finally {
      this.#inputSection = this.#data.inputs.slice();
      this.#commandSection = this.#data.commands.slice();
      this.#availableResults = new Set(this.#commandSection.map((_, i) => i));
    }
  }
  async #waitForPendingTasks() {
    while (this.#pendingPromises.size > 0) {
      const newPromise = Promise.all(this.#pendingPromises);
      this.#pendingPromises.clear();
      this.#pendingPromises.add(newPromise);
      await newPromise;
      this.#pendingPromises.delete(newPromise);
    }
  }
  #sortCommandsAndInputs() {
    const unorderedCommands = this.#data.commands;
    const unorderedInputs = this.#data.inputs;
    const orderedCommands = this.#commandSection.flat(Infinity);
    const orderedInputs = this.#inputSection.flat(Infinity);
    if (orderedCommands.length !== unorderedCommands.length) throw new Error("Unexpected number of commands found in transaction data");
    if (orderedInputs.length !== unorderedInputs.length) throw new Error("Unexpected number of inputs found in transaction data");
    const filteredCommands = orderedCommands.filter((cmd) => cmd.$Intent?.name !== "AsyncTransactionThunk");
    this.#data.commands = filteredCommands;
    this.#data.inputs = orderedInputs;
    this.#commandSection = filteredCommands;
    this.#inputSection = orderedInputs;
    this.#availableResults = new Set(filteredCommands.map((_, i) => i));
    function getOriginalIndex(index) {
      const command = unorderedCommands[index];
      if (command.$Intent?.name === "AsyncTransactionThunk") {
        const result = command.$Intent.data.result;
        if (result == null) throw new Error("AsyncTransactionThunk has not been resolved");
        return getOriginalIndex(result.Result);
      }
      const updated = filteredCommands.indexOf(command);
      if (updated === -1) throw new Error("Unable to find original index for command");
      return updated;
    }
    this.#data.mapArguments((arg) => {
      if (arg.$kind === "Input") {
        const updated = orderedInputs.indexOf(unorderedInputs[arg.Input]);
        if (updated === -1) throw new Error("Input has not been resolved");
        return {
          ...arg,
          Input: updated
        };
      } else if (arg.$kind === "Result") {
        const updated = getOriginalIndex(arg.Result);
        return {
          ...arg,
          Result: updated
        };
      } else if (arg.$kind === "NestedResult") {
        const updated = getOriginalIndex(arg.NestedResult[0]);
        return {
          ...arg,
          NestedResult: [updated, arg.NestedResult[1]]
        };
      }
      return arg;
    });
    for (const [i, cmd] of unorderedCommands.entries()) if (cmd.$Intent?.name === "AsyncTransactionThunk") try {
      cmd.$Intent.data.resultIndex = getOriginalIndex(i);
    } catch {
    }
  }
  async prepareForSerialization(options) {
    await this.#waitForPendingTasks();
    this.#sortCommandsAndInputs();
    const intents = /* @__PURE__ */ new Set();
    for (const command of this.#data.commands) if (command.$Intent) intents.add(command.$Intent.name);
    const steps = [...this.#serializationPlugins];
    for (const intent of intents) {
      if (options.supportedIntents?.includes(intent)) continue;
      if (!this.#intentResolvers.has(intent)) throw new Error(`Missing intent resolver for ${intent}`);
      steps.push(this.#intentResolvers.get(intent));
    }
    steps.push(namedPackagesPlugin());
    await this.#runPlugins(steps, options);
  }
};

// node_modules/@mysten/wallet-standard/dist/wallet.mjs
async function signAndExecuteTransaction(wallet, input) {
  if (wallet.features["sui:signAndExecuteTransaction"]) return wallet.features["sui:signAndExecuteTransaction"].signAndExecuteTransaction(input);
  if (!wallet.features["sui:signAndExecuteTransactionBlock"]) throw new Error(`Provided wallet (${wallet.name}) does not support the signAndExecuteTransaction feature.`);
  const { signAndExecuteTransactionBlock } = wallet.features["sui:signAndExecuteTransactionBlock"];
  const transactionBlock = Transaction.from(await input.transaction.toJSON());
  const { digest, rawEffects, rawTransaction } = await signAndExecuteTransactionBlock({
    account: input.account,
    chain: input.chain,
    transactionBlock,
    options: {
      showRawEffects: true,
      showRawInput: true
    }
  });
  const [{ txSignatures: [signature], intentMessage: { value: bcsTransaction } }] = suiBcs.SenderSignedData.parse(fromBase64(rawTransaction));
  return {
    digest,
    signature,
    bytes: suiBcs.TransactionData.serialize(bcsTransaction).toBase64(),
    effects: toBase64(new Uint8Array(rawEffects))
  };
}

// node_modules/@mysten/wallet-standard/dist/chains.mjs
var SUI_DEVNET_CHAIN = "sui:devnet";
var SUI_TESTNET_CHAIN = "sui:testnet";
var SUI_LOCALNET_CHAIN = "sui:localnet";
var SUI_MAINNET_CHAIN = "sui:mainnet";

// node_modules/@mysten/sui/dist/jsonRpc/errors.mjs
var CODE_TO_ERROR_TYPE = {
  "-32700": "ParseError",
  "-32701": "OversizedRequest",
  "-32702": "OversizedResponse",
  "-32600": "InvalidRequest",
  "-32601": "MethodNotFound",
  "-32602": "InvalidParams",
  "-32603": "InternalError",
  "-32604": "ServerBusy",
  "-32000": "CallExecutionFailed",
  "-32001": "UnknownError",
  "-32003": "SubscriptionClosed",
  "-32004": "SubscriptionClosedWithError",
  "-32005": "BatchesNotSupported",
  "-32006": "TooManySubscriptions",
  "-32050": "TransientError",
  "-32002": "TransactionExecutionClientError"
};
var SuiHTTPTransportError = class extends Error {
};
var JsonRpcError = class extends SuiHTTPTransportError {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.type = CODE_TO_ERROR_TYPE[code] ?? "ServerError";
  }
};
var SuiHTTPStatusError = class extends SuiHTTPTransportError {
  constructor(message, status, statusText) {
    super(message);
    this.status = status;
    this.statusText = statusText;
  }
};

// node_modules/@mysten/sui/dist/jsonRpc/http-transport.mjs
var JsonRpcHTTPTransport = class {
  #requestId = 0;
  #options;
  constructor(options) {
    this.#options = options;
  }
  fetch(input, init) {
    const fetchFn = this.#options.fetch ?? fetch;
    if (!fetchFn) throw new Error("The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport.");
    return fetchFn(input, init);
  }
  async request(input) {
    this.#requestId += 1;
    const res = await this.fetch(this.#options.rpc?.url ?? this.#options.url, {
      method: "POST",
      signal: input.signal,
      headers: {
        "Content-Type": "application/json",
        "Client-Sdk-Type": "typescript",
        "Client-Sdk-Version": PACKAGE_VERSION,
        "Client-Request-Method": input.method,
        ...this.#options.rpc?.headers
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.#requestId,
        method: input.method,
        params: input.params
      })
    });
    if (!res.ok) throw new SuiHTTPStatusError(`Unexpected status code: ${res.status}`, res.status, res.statusText);
    const data = await res.json();
    if ("error" in data && data.error != null) throw new JsonRpcError(data.error.message, data.error.code);
    return data.result;
  }
};

// node_modules/@mysten/sui/dist/client/cache.mjs
var ClientCache = class ClientCache2 {
  #prefix;
  #cache;
  constructor({ prefix, cache } = {}) {
    this.#prefix = prefix ?? [];
    this.#cache = cache ?? /* @__PURE__ */ new Map();
  }
  read(key, load) {
    const cacheKey = [this.#prefix, ...key].join(":");
    if (this.#cache.has(cacheKey)) return this.#cache.get(cacheKey);
    const result = load();
    this.#cache.set(cacheKey, result);
    if (typeof result === "object" && result !== null && "then" in result) return Promise.resolve(result).then((v) => {
      this.#cache.set(cacheKey, v);
      return v;
    }).catch((err) => {
      this.#cache.delete(cacheKey);
      throw err;
    });
    return result;
  }
  readSync(key, load) {
    const cacheKey = [this.#prefix, ...key].join(":");
    if (this.#cache.has(cacheKey)) return this.#cache.get(cacheKey);
    const result = load();
    this.#cache.set(cacheKey, result);
    return result;
  }
  clear(prefix) {
    const prefixKey = [...this.#prefix, ...prefix ?? []].join(":");
    if (!prefixKey) {
      this.#cache.clear();
      return;
    }
    for (const key of this.#cache.keys()) if (key.startsWith(prefixKey)) this.#cache.delete(key);
  }
  scope(prefix) {
    return new ClientCache2({
      prefix: [...this.#prefix, ...Array.isArray(prefix) ? prefix : [prefix]],
      cache: this.#cache
    });
  }
};

// node_modules/@mysten/sui/dist/client/client.mjs
var BaseClient = class {
  constructor({ network, base, cache = base?.cache ?? new ClientCache() }) {
    this.network = network;
    this.base = base ?? this;
    this.cache = cache;
  }
  $extend(...registrations) {
    const extensions = Object.fromEntries(registrations.map((registration) => {
      return [registration.name, registration.register(this)];
    }));
    const methodCache = /* @__PURE__ */ new Map();
    return new Proxy(this, { get(target, prop, receiver) {
      if (typeof prop === "string" && prop in extensions) return extensions[prop];
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        if (prop === "$extend") return value.bind(receiver);
        if (!methodCache.has(prop)) methodCache.set(prop, value.bind(target));
        return methodCache.get(prop);
      }
      return value;
    } });
  }
};

// node_modules/@mysten/sui/dist/client/core.mjs
var DEFAULT_MVR_URLS = {
  mainnet: "https://mainnet.mvr.mystenlabs.com",
  testnet: "https://testnet.mvr.mystenlabs.com"
};
var CoreClient = class extends BaseClient {
  constructor(options) {
    super(options);
    this.core = this;
    this.mvr = new MvrClient({
      cache: this.cache.scope("core.mvr"),
      url: options.mvr?.url ?? DEFAULT_MVR_URLS[this.network],
      pageSize: options.mvr?.pageSize,
      overrides: options.mvr?.overrides
    });
  }
  async getObject(options) {
    const { objectId } = options;
    const { objects: [result] } = await this.getObjects({
      objectIds: [objectId],
      signal: options.signal,
      include: options.include
    });
    if (result instanceof Error) throw result;
    return { object: result };
  }
  async getDynamicField(options) {
    const normalizedNameType = TypeTagSerializer.parseFromStr((await this.core.mvr.resolveType({ type: options.name.type })).type);
    const fieldId = deriveDynamicFieldID(options.parentId, normalizedNameType, options.name.bcs);
    const { objects: [fieldObject] } = await this.getObjects({
      objectIds: [fieldId],
      signal: options.signal,
      include: {
        previousTransaction: true,
        content: true
      }
    });
    if (fieldObject instanceof Error) throw fieldObject;
    const fieldType = parseStructTag(fieldObject.type);
    const content = await fieldObject.content;
    const nameTypeParam = fieldType.typeParams[0];
    const isDynamicObject = typeof nameTypeParam !== "string" && nameTypeParam.module === "dynamic_object_field" && nameTypeParam.name === "Wrapper";
    const valueBcs = content.slice(SUI_ADDRESS_LENGTH + options.name.bcs.length);
    const valueType = typeof fieldType.typeParams[1] === "string" ? fieldType.typeParams[1] : normalizeStructTag(fieldType.typeParams[1]);
    return { dynamicField: {
      $kind: isDynamicObject ? "DynamicObject" : "DynamicField",
      fieldId: fieldObject.objectId,
      digest: fieldObject.digest,
      version: fieldObject.version,
      type: fieldObject.type,
      previousTransaction: fieldObject.previousTransaction,
      name: {
        type: typeof nameTypeParam === "string" ? nameTypeParam : normalizeStructTag(nameTypeParam),
        bcs: options.name.bcs
      },
      value: {
        type: valueType,
        bcs: valueBcs
      },
      childId: isDynamicObject ? suiBcs.Address.parse(valueBcs) : void 0
    } };
  }
  async getDynamicObjectField(options) {
    const wrappedType = `0x2::dynamic_object_field::Wrapper<${(await this.core.mvr.resolveType({ type: options.name.type })).type}>`;
    const { dynamicField } = await this.getDynamicField({
      parentId: options.parentId,
      name: {
        type: wrappedType,
        bcs: options.name.bcs
      },
      signal: options.signal
    });
    const { object: object2 } = await this.getObject({
      objectId: dynamicField.childId,
      signal: options.signal,
      include: options.include
    });
    return { object: object2 };
  }
  async waitForTransaction(options) {
    const { signal, timeout = 60 * 1e3, pollSchedule, include } = options;
    const digest = "result" in options && options.result ? (options.result.Transaction ?? options.result.FailedTransaction).digest : options.digest;
    const abortSignal = signal ? AbortSignal.any([AbortSignal.timeout(timeout), signal]) : AbortSignal.timeout(timeout);
    const abortPromise = new Promise((_, reject) => {
      abortSignal.addEventListener("abort", () => reject(abortSignal.reason));
    });
    abortPromise.catch(() => {
    });
    const schedule = pollSchedule ?? [
      0,
      300,
      600,
      1500,
      3500
    ];
    const t0 = Date.now();
    let scheduleIndex = 0;
    const lastInterval = schedule.length > 0 ? schedule[schedule.length - 1] - (schedule[schedule.length - 2] ?? 0) : 2e3;
    while (true) {
      if (scheduleIndex < schedule.length) {
        const remaining = t0 + schedule[scheduleIndex] - Date.now();
        scheduleIndex++;
        if (remaining > 0) await Promise.race([new Promise((resolve) => setTimeout(resolve, remaining)), abortPromise]);
      } else await Promise.race([new Promise((resolve) => setTimeout(resolve, lastInterval)), abortPromise]);
      abortSignal.throwIfAborted();
      try {
        return await this.getTransaction({
          digest,
          include,
          signal: abortSignal
        });
      } catch {
      }
    }
  }
  async signAndExecuteTransaction({ transaction, signer, additionalSignatures = [], ...input }) {
    let transactionBytes;
    if (transaction instanceof Uint8Array) transactionBytes = transaction;
    else {
      transaction.setSenderIfNotSet(signer.toSuiAddress());
      transactionBytes = await transaction.build({ client: this });
    }
    const { signature } = await signer.signTransaction(transactionBytes);
    return this.executeTransaction({
      transaction: transactionBytes,
      signatures: [signature, ...additionalSignatures],
      ...input
    });
  }
};

// node_modules/@mysten/sui/dist/client/utils.mjs
var ordinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });
var ordinalSuffixes = /* @__PURE__ */ new Map([
  ["one", "st"],
  ["two", "nd"],
  ["few", "rd"],
  ["other", "th"]
]);
function formatOrdinal(n) {
  return `${n}${ordinalSuffixes.get(ordinalRules.select(n))}`;
}
function formatMoveAbortMessage(options) {
  const { command, location, abortCode, cleverError } = options;
  const parts = [];
  if (command != null) parts.push(`MoveAbort in ${formatOrdinal(command + 1)} command`);
  else parts.push("MoveAbort");
  if (cleverError?.constantName) {
    const errorStr = cleverError.value ? `'${cleverError.constantName}': ${cleverError.value}` : `'${cleverError.constantName}'`;
    parts.push(errorStr);
  } else parts.push(`abort code: ${abortCode}`);
  if (location?.package && location?.module) {
    const locationStr = [`in '${[
      location.package.startsWith("0x") ? location.package : `0x${location.package}`,
      location.module,
      location.functionName
    ].filter(Boolean).join("::")}'`];
    if (cleverError?.lineNumber != null) locationStr.push(`(line ${cleverError.lineNumber})`);
    else if (location.instruction != null) locationStr.push(`(instruction ${location.instruction})`);
    parts.push(locationStr.join(" "));
  }
  return parts.join(", ");
}
var MinimalEffectsWithError = suiBcs.struct("MinimalEffectsWithError", { status: ExecutionStatus });
var MinimalTransactionEffectsWithError = suiBcs.enum("MinimalTransactionEffectsWithError", {
  V1: MinimalEffectsWithError,
  V2: MinimalEffectsWithError
});
var MinimalExecutionStatusNoError = suiBcs.enum("MinimalExecutionStatusNoError", {
  Success: null,
  Failed: null
});
var MinimalEffectsNoError = suiBcs.struct("MinimalEffectsNoError", { status: MinimalExecutionStatusNoError });
var MinimalTransactionEffectsNoError = suiBcs.enum("MinimalTransactionEffectsNoError", {
  V1: MinimalEffectsNoError,
  V2: MinimalEffectsNoError
});
function formatErrorMessage($kind, data) {
  if (data !== null && data !== void 0 && typeof data !== "boolean") return `${$kind}(${JSON.stringify(data, (_key, value) => typeof value === "bigint" ? value.toString() : value)})`;
  return $kind;
}
function parseBcsExecutionError(failure) {
  const error = failure.error;
  const command = failure.command != null ? Number(failure.command) : void 0;
  switch (error.$kind) {
    case "MoveAbort": {
      const [location, abortCode] = error.MoveAbort;
      const moveLocation = {
        package: location.module.address,
        module: location.module.name,
        function: location.function,
        functionName: location.functionName ?? void 0,
        instruction: location.instruction
      };
      return {
        $kind: "MoveAbort",
        message: formatMoveAbortMessage({
          command,
          location: moveLocation,
          abortCode: String(abortCode)
        }),
        command,
        MoveAbort: {
          abortCode: String(abortCode),
          location: moveLocation
        }
      };
    }
    case "MoveObjectTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MoveObjectTooBig", error.MoveObjectTooBig),
        command,
        SizeError: {
          name: "ObjectTooBig",
          size: Number(error.MoveObjectTooBig.objectSize),
          maxSize: Number(error.MoveObjectTooBig.maxObjectSize)
        }
      };
    case "MovePackageTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MovePackageTooBig", error.MovePackageTooBig),
        command,
        SizeError: {
          name: "PackageTooBig",
          size: Number(error.MovePackageTooBig.objectSize),
          maxSize: Number(error.MovePackageTooBig.maxObjectSize)
        }
      };
    case "EffectsTooLarge":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("EffectsTooLarge", error.EffectsTooLarge),
        command,
        SizeError: {
          name: "EffectsTooLarge",
          size: Number(error.EffectsTooLarge.currentSize),
          maxSize: Number(error.EffectsTooLarge.maxSize)
        }
      };
    case "WrittenObjectsTooLarge":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("WrittenObjectsTooLarge", error.WrittenObjectsTooLarge),
        command,
        SizeError: {
          name: "WrittenObjectsTooLarge",
          size: Number(error.WrittenObjectsTooLarge.currentSize),
          maxSize: Number(error.WrittenObjectsTooLarge.maxSize)
        }
      };
    case "MoveVectorElemTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MoveVectorElemTooBig", error.MoveVectorElemTooBig),
        command,
        SizeError: {
          name: "MoveVectorElemTooBig",
          size: Number(error.MoveVectorElemTooBig.valueSize),
          maxSize: Number(error.MoveVectorElemTooBig.maxScaledSize)
        }
      };
    case "MoveRawValueTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MoveRawValueTooBig", error.MoveRawValueTooBig),
        command,
        SizeError: {
          name: "MoveRawValueTooBig",
          size: Number(error.MoveRawValueTooBig.valueSize),
          maxSize: Number(error.MoveRawValueTooBig.maxScaledSize)
        }
      };
    case "CommandArgumentError":
      return {
        $kind: "CommandArgumentError",
        message: formatErrorMessage("CommandArgumentError", error.CommandArgumentError),
        command,
        CommandArgumentError: {
          argument: error.CommandArgumentError.argIdx,
          name: error.CommandArgumentError.kind.$kind
        }
      };
    case "TypeArgumentError":
      return {
        $kind: "TypeArgumentError",
        message: formatErrorMessage("TypeArgumentError", error.TypeArgumentError),
        command,
        TypeArgumentError: {
          typeArgument: error.TypeArgumentError.argumentIdx,
          name: error.TypeArgumentError.kind.$kind
        }
      };
    case "PackageUpgradeError": {
      const upgradeError = error.PackageUpgradeError.upgradeError;
      return {
        $kind: "PackageUpgradeError",
        message: formatErrorMessage("PackageUpgradeError", error.PackageUpgradeError),
        command,
        PackageUpgradeError: {
          name: upgradeError.$kind,
          packageId: upgradeError.$kind === "UnableToFetchPackage" ? upgradeError.UnableToFetchPackage.packageId : void 0,
          digest: upgradeError.$kind === "DigestDoesNotMatch" ? toBase64(upgradeError.DigestDoesNotMatch.digest) : void 0
        }
      };
    }
    case "ExecutionCancelledDueToSharedObjectCongestion":
      return {
        $kind: "CongestedObjects",
        message: formatErrorMessage("ExecutionCancelledDueToSharedObjectCongestion", error.ExecutionCancelledDueToSharedObjectCongestion),
        command,
        CongestedObjects: {
          name: "ExecutionCanceledDueToConsensusObjectCongestion",
          objects: error.ExecutionCancelledDueToSharedObjectCongestion.congested_objects
        }
      };
    case "AddressDeniedForCoin":
      return {
        $kind: "CoinDenyListError",
        message: formatErrorMessage("AddressDeniedForCoin", error.AddressDeniedForCoin),
        command,
        CoinDenyListError: {
          name: "AddressDeniedForCoin",
          address: error.AddressDeniedForCoin.address,
          coinType: error.AddressDeniedForCoin.coinType
        }
      };
    case "CoinTypeGlobalPause":
      return {
        $kind: "CoinDenyListError",
        message: formatErrorMessage("CoinTypeGlobalPause", error.CoinTypeGlobalPause),
        command,
        CoinDenyListError: {
          name: "CoinTypeGlobalPause",
          coinType: error.CoinTypeGlobalPause.coinType
        }
      };
    case "CircularObjectOwnership":
      return {
        $kind: "ObjectIdError",
        message: formatErrorMessage("CircularObjectOwnership", error.CircularObjectOwnership),
        command,
        ObjectIdError: {
          name: "CircularObjectOwnership",
          objectId: error.CircularObjectOwnership.object
        }
      };
    case "InvalidGasObject":
      return {
        $kind: "ObjectIdError",
        message: "InvalidGasObject",
        command,
        ObjectIdError: {
          name: "InvalidGasObject",
          objectId: ""
        }
      };
    case "InputObjectDeleted":
      return {
        $kind: "ObjectIdError",
        message: "InputObjectDeleted",
        command,
        ObjectIdError: {
          name: "InputObjectDeleted",
          objectId: ""
        }
      };
    case "InvalidTransferObject":
      return {
        $kind: "ObjectIdError",
        message: "InvalidTransferObject",
        command,
        ObjectIdError: {
          name: "InvalidTransferObject",
          objectId: ""
        }
      };
    case "NonExclusiveWriteInputObjectModified":
      return {
        $kind: "Unknown",
        message: formatErrorMessage("NonExclusiveWriteInputObjectModified", error.NonExclusiveWriteInputObjectModified),
        command,
        Unknown: null
      };
    case "InsufficientGas":
    case "InvariantViolation":
    case "FeatureNotYetSupported":
    case "InsufficientCoinBalance":
    case "CoinBalanceOverflow":
    case "PublishErrorNonZeroAddress":
    case "SuiMoveVerificationError":
    case "MovePrimitiveRuntimeError":
    case "VMVerificationOrDeserializationError":
    case "VMInvariantViolation":
    case "FunctionNotFound":
    case "ArityMismatch":
    case "TypeArityMismatch":
    case "NonEntryFunctionInvoked":
    case "UnusedValueWithoutDrop":
    case "InvalidPublicFunctionReturnType":
    case "PublishUpgradeMissingDependency":
    case "PublishUpgradeDependencyDowngrade":
    case "CertificateDenied":
    case "SuiMoveVerificationTimedout":
    case "SharedObjectOperationNotAllowed":
    case "ExecutionCancelledDueToRandomnessUnavailable":
    case "InvalidLinkage":
    case "InsufficientBalanceForWithdraw":
      return {
        $kind: "Unknown",
        message: error.$kind,
        command,
        Unknown: null
      };
    default:
      return {
        $kind: "Unknown",
        message: "Unknown error",
        command,
        Unknown: null
      };
  }
}
function parseTransactionBcs(bytes, onlyTransactionKind = false) {
  return (onlyTransactionKind ? TransactionDataBuilder.fromKindBytes(bytes) : TransactionDataBuilder.fromBytes(bytes)).snapshot();
}
function parseTransactionEffectsBcs(effects) {
  const parsed = suiBcs.TransactionEffects.parse(effects);
  switch (parsed.$kind) {
    case "V1":
      return parseTransactionEffectsV1({
        bytes: effects,
        effects: parsed.V1
      });
    case "V2":
      return parseTransactionEffectsV2({
        bytes: effects,
        effects: parsed.V2
      });
    default:
      throw new Error(`Unknown transaction effects version: ${parsed.$kind}`);
  }
}
function parseTransactionEffectsV1(_) {
  throw new Error("V1 effects are not supported yet");
}
function parseTransactionEffectsV2({ bytes, effects }) {
  const changedObjects = effects.changedObjects.map(([id, change]) => {
    return {
      objectId: id,
      inputState: change.inputState.$kind === "Exist" ? "Exists" : "DoesNotExist",
      inputVersion: change.inputState.Exist?.[0][0] ?? null,
      inputDigest: change.inputState.Exist?.[0][1] ?? null,
      inputOwner: change.inputState.Exist?.[1] ?? null,
      outputState: change.outputState.$kind === "NotExist" ? "DoesNotExist" : change.outputState.$kind,
      outputVersion: change.outputState.$kind === "PackageWrite" ? change.outputState.PackageWrite?.[0] : change.outputState.$kind === "ObjectWrite" ? effects.lamportVersion : null,
      outputDigest: change.outputState.$kind === "PackageWrite" ? change.outputState.PackageWrite?.[1] : change.outputState.$kind === "ObjectWrite" ? change.outputState.ObjectWrite?.[0] ?? null : null,
      outputOwner: change.outputState.$kind === "ObjectWrite" ? change.outputState.ObjectWrite[1] : null,
      idOperation: change.idOperation.$kind
    };
  });
  return {
    bcs: bytes,
    version: 2,
    status: effects.status.$kind === "Success" ? {
      success: true,
      error: null
    } : {
      success: false,
      error: parseBcsExecutionError(effects.status.Failure)
    },
    gasUsed: effects.gasUsed,
    transactionDigest: effects.transactionDigest,
    gasObject: effects.gasObjectIndex === null ? null : changedObjects[effects.gasObjectIndex] ?? null,
    eventsDigest: effects.eventsDigest,
    dependencies: effects.dependencies,
    lamportVersion: effects.lamportVersion,
    changedObjects,
    unchangedConsensusObjects: effects.unchangedConsensusObjects.map(([objectId, object2]) => {
      return {
        kind: object2.$kind,
        objectId,
        version: object2.$kind === "ReadOnlyRoot" ? object2.ReadOnlyRoot[0] : object2[object2.$kind],
        digest: object2.$kind === "ReadOnlyRoot" ? object2.ReadOnlyRoot[1] : null
      };
    }),
    auxiliaryDataDigest: effects.auxDataDigest
  };
}

// node_modules/@mysten/sui/dist/jsonRpc/core.mjs
var MAX_GAS2 = 5e10;
function parseJsonRpcExecutionStatus(status, abortError) {
  if (status.status === "success") return {
    success: true,
    error: null
  };
  const rawMessage = status.error ?? "Unknown";
  if (abortError) {
    const commandMatch = rawMessage.match(/in command (\d+)/);
    const command = commandMatch ? parseInt(commandMatch[1], 10) : void 0;
    const instructionMatch = rawMessage.match(/instruction:\s*(\d+)/);
    const instruction = instructionMatch ? parseInt(instructionMatch[1], 10) : void 0;
    const moduleParts = abortError.module_id?.split("::") ?? [];
    const pkg = moduleParts[0] ? normalizeSuiAddress(moduleParts[0]) : void 0;
    const module = moduleParts[1];
    return {
      success: false,
      error: {
        $kind: "MoveAbort",
        message: formatMoveAbortMessage({
          command,
          location: pkg && module ? {
            package: pkg,
            module,
            functionName: abortError.function ?? void 0,
            instruction
          } : void 0,
          abortCode: String(abortError.error_code ?? 0),
          cleverError: abortError.line != null ? { lineNumber: abortError.line } : void 0
        }),
        command,
        MoveAbort: {
          abortCode: String(abortError.error_code ?? 0),
          location: abortError.module_id ? {
            package: normalizeSuiAddress(abortError.module_id.split("::")[0] ?? ""),
            module: abortError.module_id.split("::")[1] ?? "",
            functionName: abortError.function ?? void 0,
            instruction
          } : void 0
        }
      }
    };
  }
  return {
    success: false,
    error: {
      $kind: "Unknown",
      message: rawMessage,
      Unknown: null
    }
  };
}
var JSONRpcCoreClient = class extends CoreClient {
  #jsonRpcClient;
  constructor({ jsonRpcClient, mvr }) {
    super({
      network: jsonRpcClient.network,
      base: jsonRpcClient,
      mvr
    });
    this.#jsonRpcClient = jsonRpcClient;
  }
  async getObjects(options) {
    const batches = chunk(options.objectIds, 50);
    const results = [];
    for (const batch of batches) {
      const objects = await this.#jsonRpcClient.multiGetObjects({
        ids: batch,
        options: {
          showOwner: true,
          showType: true,
          showBcs: options.include?.content || options.include?.objectBcs ? true : false,
          showPreviousTransaction: options.include?.previousTransaction || options.include?.objectBcs ? true : false,
          showStorageRebate: options.include?.objectBcs ?? false,
          showContent: options.include?.json ?? false,
          showDisplay: options.include?.display ?? false
        },
        signal: options.signal
      });
      for (const [idx, object2] of objects.entries()) if (object2.error) results.push(ObjectError.fromResponse(object2.error, batch[idx]));
      else results.push(parseObject(object2.data, options.include));
    }
    return { objects: results };
  }
  async listOwnedObjects(options) {
    let filter = null;
    if (options.type) {
      const parts = options.type.split("::");
      if (parts.length === 1) filter = { Package: options.type };
      else if (parts.length === 2) filter = { MoveModule: {
        package: parts[0],
        module: parts[1]
      } };
      else filter = { StructType: options.type };
    }
    const objects = await this.#jsonRpcClient.getOwnedObjects({
      owner: options.owner,
      limit: options.limit,
      cursor: options.cursor,
      options: {
        showOwner: true,
        showType: true,
        showBcs: options.include?.content || options.include?.objectBcs ? true : false,
        showPreviousTransaction: options.include?.previousTransaction || options.include?.objectBcs ? true : false,
        showStorageRebate: options.include?.objectBcs ?? false,
        showContent: options.include?.json ?? false,
        showDisplay: options.include?.display ?? false
      },
      filter,
      signal: options.signal
    });
    return {
      objects: objects.data.map((result) => {
        if (result.error) throw ObjectError.fromResponse(result.error);
        return parseObject(result.data, options.include);
      }),
      hasNextPage: objects.hasNextPage,
      cursor: objects.nextCursor ?? null
    };
  }
  async listCoins(options) {
    const coins = await this.#jsonRpcClient.getCoins({
      owner: options.owner,
      coinType: options.coinType,
      limit: options.limit,
      cursor: options.cursor,
      signal: options.signal
    });
    return {
      objects: coins.data.map((coin) => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
        balance: coin.balance,
        type: normalizeStructTag(`0x2::coin::Coin<${coin.coinType}>`),
        owner: {
          $kind: "AddressOwner",
          AddressOwner: options.owner
        }
      })),
      hasNextPage: coins.hasNextPage,
      cursor: coins.nextCursor ?? null
    };
  }
  async getBalance(options) {
    const balance = await this.#jsonRpcClient.getBalance({
      owner: options.owner,
      coinType: options.coinType,
      signal: options.signal
    });
    const addressBalance = balance.fundsInAddressBalance ?? "0";
    const coinBalance = String(BigInt(balance.totalBalance) - BigInt(addressBalance));
    return { balance: {
      coinType: normalizeStructTag(balance.coinType),
      balance: balance.totalBalance,
      coinBalance,
      addressBalance
    } };
  }
  async getCoinMetadata(options) {
    const coinType = (await this.mvr.resolveType({ type: options.coinType })).type;
    const result = await this.#jsonRpcClient.getCoinMetadata({
      coinType,
      signal: options.signal
    });
    if (!result) return { coinMetadata: null };
    return { coinMetadata: {
      id: result.id ?? null,
      decimals: result.decimals,
      name: result.name,
      symbol: result.symbol,
      description: result.description,
      iconUrl: result.iconUrl ?? null
    } };
  }
  async listBalances(options) {
    return {
      balances: (await this.#jsonRpcClient.getAllBalances({
        owner: options.owner,
        signal: options.signal
      })).map((balance) => {
        const addressBalance = balance.fundsInAddressBalance ?? "0";
        const coinBalance = String(BigInt(balance.totalBalance) - BigInt(addressBalance));
        return {
          coinType: normalizeStructTag(balance.coinType),
          balance: balance.totalBalance,
          coinBalance,
          addressBalance
        };
      }),
      hasNextPage: false,
      cursor: null
    };
  }
  async getTransaction(options) {
    return parseTransaction(await this.#jsonRpcClient.getTransactionBlock({
      digest: options.digest,
      options: {
        showRawInput: true,
        showEffects: true,
        showObjectChanges: options.include?.objectTypes ?? false,
        showRawEffects: options.include?.effects ?? false,
        showEvents: options.include?.events ?? false,
        showBalanceChanges: options.include?.balanceChanges ?? false
      },
      signal: options.signal
    }), options.include);
  }
  async executeTransaction(options) {
    return parseTransaction(await this.#jsonRpcClient.executeTransactionBlock({
      transactionBlock: options.transaction,
      signature: options.signatures,
      options: {
        showRawInput: true,
        showEffects: true,
        showRawEffects: options.include?.effects ?? false,
        showEvents: options.include?.events ?? false,
        showObjectChanges: options.include?.objectTypes ?? false,
        showBalanceChanges: options.include?.balanceChanges ?? false
      },
      signal: options.signal
    }), options.include);
  }
  async simulateTransaction(options) {
    if (!(options.transaction instanceof Uint8Array)) await options.transaction.build({
      client: this,
      onlyTransactionKind: true
    });
    const tx = Transaction.from(options.transaction);
    const data = options.transaction instanceof Uint8Array ? null : TransactionDataBuilder.restore(options.transaction.getData());
    const transactionBytes = data ? data.build({ overrides: { gasData: {
      budget: data.gasData.budget ?? String(MAX_GAS2),
      price: data.gasData.price ?? String(await this.#jsonRpcClient.getReferenceGasPrice()),
      payment: data.gasData.payment ?? []
    } } }) : options.transaction;
    const sender = tx.getData().sender ?? normalizeSuiAddress("0x0");
    const checksDisabled = options.checksEnabled === false;
    let dryRunResult = null;
    try {
      dryRunResult = await this.#jsonRpcClient.dryRunTransactionBlock({
        transactionBlock: transactionBytes,
        signal: options.signal
      });
    } catch (e) {
      if (!checksDisabled) throw e;
    }
    let devInspectResult = null;
    if (options.include?.commandResults || checksDisabled) try {
      devInspectResult = await this.#jsonRpcClient.devInspectTransactionBlock({
        sender,
        transactionBlock: tx,
        signal: options.signal
      });
    } catch {
    }
    const dryRunFailed = !dryRunResult || dryRunResult.effects.status.status !== "success";
    const effectsSource = checksDisabled && dryRunFailed && devInspectResult ? devInspectResult : dryRunResult ?? devInspectResult;
    if (!effectsSource) throw new Error("simulateTransaction failed: no results from dryRun or devInspect");
    const { effects, objectTypes } = parseTransactionEffectsJson({
      effects: effectsSource.effects,
      objectChanges: (!dryRunFailed ? dryRunResult?.objectChanges : null) ?? []
    });
    let parsedTransaction;
    if (options.include?.transaction) {
      parsedTransaction = parseTransactionBcs(transactionBytes);
      if (data && !dryRunFailed && effects.gasUsed) {
        if (!data.gasData.budget) parsedTransaction.gasData.budget = computeGasBudget(effects.gasUsed);
      }
    }
    const transactionData = {
      digest: TransactionDataBuilder.getDigestFromBytes(transactionBytes),
      epoch: null,
      status: effects.status,
      effects: options.include?.effects ? effects : void 0,
      objectTypes: options.include?.objectTypes ? objectTypes : void 0,
      signatures: [],
      transaction: parsedTransaction ?? void 0,
      bcs: options.include?.bcs ? transactionBytes : void 0,
      balanceChanges: options.include?.balanceChanges && dryRunResult && !dryRunFailed ? dryRunResult.balanceChanges.map((change) => ({
        coinType: normalizeStructTag(change.coinType),
        address: parseOwnerAddress(change.owner),
        amount: change.amount
      })) : void 0,
      events: options.include?.events ? effectsSource.events?.map((event) => ({
        packageId: event.packageId,
        module: event.transactionModule,
        sender: event.sender,
        eventType: event.type,
        bcs: "bcs" in event ? fromBase64(event.bcs) : new Uint8Array(),
        json: event.parsedJson ?? null
      })) ?? [] : void 0
    };
    let commandResults;
    if (options.include?.commandResults && devInspectResult?.results) commandResults = devInspectResult.results.map((result) => ({
      returnValues: (result.returnValues ?? []).map(([bytes]) => ({ bcs: new Uint8Array(bytes) })),
      mutatedReferences: (result.mutableReferenceOutputs ?? []).map(([, bytes]) => ({ bcs: new Uint8Array(bytes) }))
    }));
    return effects.status.success ? {
      $kind: "Transaction",
      Transaction: transactionData,
      commandResults
    } : {
      $kind: "FailedTransaction",
      FailedTransaction: transactionData,
      commandResults
    };
  }
  async getReferenceGasPrice(options) {
    const referenceGasPrice = await this.#jsonRpcClient.getReferenceGasPrice({ signal: options?.signal });
    return { referenceGasPrice: String(referenceGasPrice) };
  }
  async getProtocolConfig(options) {
    const result = await this.#jsonRpcClient.getProtocolConfig({ signal: options?.signal });
    const attributes = {};
    for (const [key, value] of Object.entries(result.attributes)) if (value === null) attributes[key] = null;
    else if ("u16" in value) attributes[key] = value.u16;
    else if ("u32" in value) attributes[key] = value.u32;
    else if ("u64" in value) attributes[key] = value.u64;
    else if ("f64" in value) attributes[key] = value.f64;
    else if ("bool" in value) attributes[key] = value.bool;
    else {
      const entries = Object.entries(value);
      attributes[key] = entries.length === 1 ? String(entries[0][1]) : JSON.stringify(value);
    }
    return { protocolConfig: {
      protocolVersion: result.protocolVersion,
      featureFlags: { ...result.featureFlags },
      attributes
    } };
  }
  async getCurrentSystemState(options) {
    const systemState = await this.#jsonRpcClient.getLatestSuiSystemState({ signal: options?.signal });
    return { systemState: {
      systemStateVersion: systemState.systemStateVersion,
      epoch: systemState.epoch,
      protocolVersion: systemState.protocolVersion,
      referenceGasPrice: systemState.referenceGasPrice?.toString() ?? null,
      epochStartTimestampMs: systemState.epochStartTimestampMs,
      safeMode: systemState.safeMode,
      safeModeStorageRewards: systemState.safeModeStorageRewards,
      safeModeComputationRewards: systemState.safeModeComputationRewards,
      safeModeStorageRebates: systemState.safeModeStorageRebates,
      safeModeNonRefundableStorageFee: systemState.safeModeNonRefundableStorageFee,
      parameters: {
        epochDurationMs: systemState.epochDurationMs,
        stakeSubsidyStartEpoch: systemState.stakeSubsidyStartEpoch,
        maxValidatorCount: systemState.maxValidatorCount,
        minValidatorJoiningStake: systemState.minValidatorJoiningStake,
        validatorLowStakeThreshold: systemState.validatorLowStakeThreshold,
        validatorLowStakeGracePeriod: systemState.validatorLowStakeGracePeriod
      },
      storageFund: {
        totalObjectStorageRebates: systemState.storageFundTotalObjectStorageRebates,
        nonRefundableBalance: systemState.storageFundNonRefundableBalance
      },
      stakeSubsidy: {
        balance: systemState.stakeSubsidyBalance,
        distributionCounter: systemState.stakeSubsidyDistributionCounter,
        currentDistributionAmount: systemState.stakeSubsidyCurrentDistributionAmount,
        stakeSubsidyPeriodLength: systemState.stakeSubsidyPeriodLength,
        stakeSubsidyDecreaseRate: systemState.stakeSubsidyDecreaseRate
      }
    } };
  }
  async listDynamicFields(options) {
    const dynamicFields = await this.#jsonRpcClient.getDynamicFields({
      parentId: options.parentId,
      limit: options.limit,
      cursor: options.cursor
    });
    return {
      dynamicFields: dynamicFields.data.map((dynamicField) => {
        const isDynamicObject = dynamicField.type === "DynamicObject";
        const fullType = isDynamicObject ? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${dynamicField.name.type}>, 0x2::object::ID>` : `0x2::dynamic_field::Field<${dynamicField.name.type}, ${dynamicField.objectType}>`;
        const bcsBytes = fromBase64(dynamicField.bcsName);
        const derivedNameType = isDynamicObject ? `0x2::dynamic_object_field::Wrapper<${dynamicField.name.type}>` : dynamicField.name.type;
        return {
          $kind: isDynamicObject ? "DynamicObject" : "DynamicField",
          fieldId: deriveDynamicFieldID(options.parentId, derivedNameType, bcsBytes),
          type: normalizeStructTag(fullType),
          name: {
            type: dynamicField.name.type,
            bcs: bcsBytes
          },
          valueType: dynamicField.objectType,
          childId: isDynamicObject ? dynamicField.objectId : void 0
        };
      }),
      hasNextPage: dynamicFields.hasNextPage,
      cursor: dynamicFields.nextCursor
    };
  }
  async verifyZkLoginSignature(options) {
    const result = await this.#jsonRpcClient.verifyZkLoginSignature({
      bytes: options.bytes,
      signature: options.signature,
      intentScope: options.intentScope,
      author: options.address
    });
    return {
      success: result.success,
      errors: result.errors
    };
  }
  async defaultNameServiceName(options) {
    return { data: { name: (await this.#jsonRpcClient.resolveNameServiceNames(options)).data[0] ?? null } };
  }
  resolveTransactionPlugin() {
    return coreClientResolveTransactionPlugin;
  }
  async getMoveFunction(options) {
    const resolvedPackageId = (await this.mvr.resolvePackage({ package: options.packageId })).package;
    const result = await this.#jsonRpcClient.getNormalizedMoveFunction({
      package: resolvedPackageId,
      module: options.moduleName,
      function: options.name
    });
    return { function: {
      packageId: normalizeSuiAddress(resolvedPackageId),
      moduleName: options.moduleName,
      name: options.name,
      visibility: parseVisibility(result.visibility),
      isEntry: result.isEntry,
      typeParameters: result.typeParameters.map((abilities) => ({
        isPhantom: false,
        constraints: parseAbilities(abilities)
      })),
      parameters: result.parameters.map((param) => parseNormalizedSuiMoveType(param)),
      returns: result.return.map((ret) => parseNormalizedSuiMoveType(ret))
    } };
  }
  async getChainIdentifier(_options) {
    return this.cache.read(["chainIdentifier"], async () => {
      return { chainIdentifier: (await this.#jsonRpcClient.getCheckpoint({ id: "0" })).digest };
    });
  }
};
function serializeObjectToBcs(object2) {
  if (object2.bcs?.dataType !== "moveObject") return;
  try {
    const typeStr = normalizeStructTag(object2.bcs.type);
    let moveObjectType;
    const normalizedSuiFramework = normalizeSuiAddress(SUI_FRAMEWORK_ADDRESS);
    const gasCoinType = normalizeStructTag(`${SUI_FRAMEWORK_ADDRESS}::coin::Coin<${SUI_FRAMEWORK_ADDRESS}::sui::SUI>`);
    const stakedSuiType = normalizeStructTag(`${SUI_SYSTEM_ADDRESS}::staking_pool::StakedSui`);
    const coinPrefix = `${normalizedSuiFramework}::coin::Coin<`;
    if (typeStr === gasCoinType) moveObjectType = { GasCoin: null };
    else if (typeStr === stakedSuiType) moveObjectType = { StakedSui: null };
    else if (typeStr.startsWith(coinPrefix)) {
      const innerTypeMatch = typeStr.match(/* @__PURE__ */ new RegExp(`${normalizedSuiFramework.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}::coin::Coin<(.+)>$`));
      if (innerTypeMatch) moveObjectType = { Coin: TypeTagSerializer.parseFromStr(innerTypeMatch[1], true) };
      else throw new Error("Failed to parse Coin type");
    } else {
      const typeTag = TypeTagSerializer.parseFromStr(typeStr, true);
      if (typeof typeTag !== "object" || !("struct" in typeTag)) throw new Error("Expected struct type tag");
      moveObjectType = { Other: typeTag.struct };
    }
    const contents = fromBase64(object2.bcs.bcsBytes);
    const owner = convertOwnerToBcs(object2.owner);
    return suiBcs.Object.serialize({
      data: { Move: {
        type: moveObjectType,
        hasPublicTransfer: object2.bcs.hasPublicTransfer,
        version: object2.bcs.version,
        contents
      } },
      owner,
      previousTransaction: object2.previousTransaction,
      storageRebate: object2.storageRebate
    }).toBytes();
  } catch {
    return;
  }
}
function parseObject(object2, include) {
  const bcsContent = object2.bcs?.dataType === "moveObject" ? fromBase64(object2.bcs.bcsBytes) : void 0;
  const objectBcs = include?.objectBcs ? serializeObjectToBcs(object2) : void 0;
  const type = object2.type && object2.type.includes("::") ? normalizeStructTag(object2.type) : object2.type ?? "";
  const jsonContent = include?.json && object2.content?.dataType === "moveObject" ? object2.content.fields : include?.json ? null : void 0;
  const displayData = include?.display ? object2.display?.data != null ? {
    output: object2.display.data,
    errors: null
  } : null : void 0;
  return {
    objectId: object2.objectId,
    version: object2.version,
    digest: object2.digest,
    type,
    content: include?.content ? bcsContent : void 0,
    owner: parseOwner(object2.owner),
    previousTransaction: include?.previousTransaction ? object2.previousTransaction ?? void 0 : void 0,
    objectBcs,
    json: jsonContent,
    display: displayData
  };
}
function parseOwner(owner) {
  if (owner === "Immutable") return {
    $kind: "Immutable",
    Immutable: true
  };
  if ("ConsensusAddressOwner" in owner) return {
    $kind: "ConsensusAddressOwner",
    ConsensusAddressOwner: {
      owner: owner.ConsensusAddressOwner.owner,
      startVersion: owner.ConsensusAddressOwner.start_version
    }
  };
  if ("AddressOwner" in owner) return {
    $kind: "AddressOwner",
    AddressOwner: owner.AddressOwner
  };
  if ("ObjectOwner" in owner) return {
    $kind: "ObjectOwner",
    ObjectOwner: owner.ObjectOwner
  };
  if ("Shared" in owner) return {
    $kind: "Shared",
    Shared: { initialSharedVersion: owner.Shared.initial_shared_version }
  };
  throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}
function convertOwnerToBcs(owner) {
  if (owner === "Immutable") return { Immutable: null };
  if ("AddressOwner" in owner) return { AddressOwner: owner.AddressOwner };
  if ("ObjectOwner" in owner) return { ObjectOwner: owner.ObjectOwner };
  if ("Shared" in owner) return { Shared: { initialSharedVersion: owner.Shared.initial_shared_version } };
  if (typeof owner === "object" && owner !== null && "ConsensusAddressOwner" in owner) return { ConsensusAddressOwner: {
    startVersion: owner.ConsensusAddressOwner.start_version,
    owner: owner.ConsensusAddressOwner.owner
  } };
  throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}
function parseOwnerAddress(owner) {
  if (owner === "Immutable") return null;
  if ("ConsensusAddressOwner" in owner) return owner.ConsensusAddressOwner.owner;
  if ("AddressOwner" in owner) return owner.AddressOwner;
  if ("ObjectOwner" in owner) return owner.ObjectOwner;
  if ("Shared" in owner) return null;
  throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}
function parseTransaction(transaction, include) {
  const objectTypes = {};
  if (include?.objectTypes) transaction.objectChanges?.forEach((change) => {
    if (change.type !== "published") objectTypes[change.objectId] = normalizeStructTag(change.objectType);
  });
  let transactionData;
  let signatures = [];
  let bcsBytes;
  if (transaction.rawTransaction) {
    const parsedTx = suiBcs.SenderSignedData.parse(fromBase64(transaction.rawTransaction))[0];
    signatures = parsedTx.txSignatures;
    if (include?.transaction || include?.bcs) {
      const bytes = suiBcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes();
      if (include?.bcs) bcsBytes = bytes;
      if (include?.transaction) transactionData = { ...TransactionDataBuilder.restore({
        version: 2,
        sender: parsedTx.intentMessage.value.V1.sender,
        expiration: parsedTx.intentMessage.value.V1.expiration,
        gasData: parsedTx.intentMessage.value.V1.gasData,
        inputs: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction.inputs,
        commands: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction.commands
      }) };
    }
  }
  const status = transaction.effects?.status ? parseJsonRpcExecutionStatus(transaction.effects.status, transaction.effects.abortError) : {
    success: false,
    error: {
      $kind: "Unknown",
      message: "Unknown",
      Unknown: null
    }
  };
  const effectsBytes = transaction.rawEffects ? new Uint8Array(transaction.rawEffects) : null;
  const result = {
    digest: transaction.digest,
    epoch: transaction.effects?.executedEpoch ?? null,
    status,
    effects: include?.effects && effectsBytes ? parseTransactionEffectsBcs(effectsBytes) : void 0,
    objectTypes: include?.objectTypes ? objectTypes : void 0,
    transaction: transactionData,
    bcs: bcsBytes,
    signatures,
    balanceChanges: include?.balanceChanges ? transaction.balanceChanges?.map((change) => ({
      coinType: normalizeStructTag(change.coinType),
      address: parseOwnerAddress(change.owner),
      amount: change.amount
    })) ?? [] : void 0,
    events: include?.events ? transaction.events?.map((event) => ({
      packageId: event.packageId,
      module: event.transactionModule,
      sender: event.sender,
      eventType: event.type,
      bcs: "bcs" in event ? fromBase64(event.bcs) : new Uint8Array(),
      json: event.parsedJson ?? null
    })) ?? [] : void 0
  };
  return status.success ? {
    $kind: "Transaction",
    Transaction: result
  } : {
    $kind: "FailedTransaction",
    FailedTransaction: result
  };
}
function parseTransactionEffectsJson({ bytes, effects, objectChanges }) {
  const changedObjects = [];
  const unchangedConsensusObjects = [];
  const objectTypes = {};
  objectChanges?.forEach((change) => {
    switch (change.type) {
      case "published":
        changedObjects.push({
          objectId: change.packageId,
          inputState: "DoesNotExist",
          inputVersion: null,
          inputDigest: null,
          inputOwner: null,
          outputState: "PackageWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: null,
          idOperation: "Created"
        });
        break;
      case "transferred":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.version,
          inputDigest: change.digest,
          inputOwner: {
            $kind: "AddressOwner",
            AddressOwner: change.sender
          },
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: parseOwner(change.recipient),
          idOperation: "None"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "mutated":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.previousVersion,
          inputDigest: null,
          inputOwner: parseOwner(change.owner),
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: parseOwner(change.owner),
          idOperation: "None"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "deleted":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.version,
          inputDigest: effects.deleted?.find((d) => d.objectId === change.objectId)?.digest ?? null,
          inputOwner: null,
          outputState: "DoesNotExist",
          outputVersion: null,
          outputDigest: null,
          outputOwner: null,
          idOperation: "Deleted"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "wrapped":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.version,
          inputDigest: null,
          inputOwner: {
            $kind: "AddressOwner",
            AddressOwner: change.sender
          },
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: effects.wrapped?.find((w) => w.objectId === change.objectId)?.digest ?? null,
          outputOwner: {
            $kind: "ObjectOwner",
            ObjectOwner: change.sender
          },
          idOperation: "None"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "created":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "DoesNotExist",
          inputVersion: null,
          inputDigest: null,
          inputOwner: null,
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: parseOwner(change.owner),
          idOperation: "Created"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
    }
  });
  return {
    objectTypes,
    effects: {
      bcs: bytes ?? null,
      version: 2,
      status: parseJsonRpcExecutionStatus(effects.status, effects.abortError),
      gasUsed: effects.gasUsed,
      transactionDigest: effects.transactionDigest,
      gasObject: {
        objectId: effects.gasObject?.reference.objectId,
        inputState: "Exists",
        inputVersion: null,
        inputDigest: null,
        inputOwner: null,
        outputState: "ObjectWrite",
        outputVersion: effects.gasObject.reference.version,
        outputDigest: effects.gasObject.reference.digest,
        outputOwner: parseOwner(effects.gasObject.owner),
        idOperation: "None"
      },
      eventsDigest: effects.eventsDigest ?? null,
      dependencies: effects.dependencies ?? [],
      lamportVersion: effects.gasObject.reference.version,
      changedObjects,
      unchangedConsensusObjects,
      auxiliaryDataDigest: null
    }
  };
}
function parseNormalizedSuiMoveType(type) {
  if (typeof type !== "string") {
    if ("Reference" in type) return {
      reference: "immutable",
      body: parseNormalizedSuiMoveTypeBody(type.Reference)
    };
    if ("MutableReference" in type) return {
      reference: "mutable",
      body: parseNormalizedSuiMoveTypeBody(type.MutableReference)
    };
  }
  return {
    reference: null,
    body: parseNormalizedSuiMoveTypeBody(type)
  };
}
function parseNormalizedSuiMoveTypeBody(type) {
  switch (type) {
    case "Address":
      return { $kind: "address" };
    case "Bool":
      return { $kind: "bool" };
    case "U8":
      return { $kind: "u8" };
    case "U16":
      return { $kind: "u16" };
    case "U32":
      return { $kind: "u32" };
    case "U64":
      return { $kind: "u64" };
    case "U128":
      return { $kind: "u128" };
    case "U256":
      return { $kind: "u256" };
  }
  if (typeof type === "string") throw new Error(`Unknown type: ${type}`);
  if ("Vector" in type) return {
    $kind: "vector",
    vector: parseNormalizedSuiMoveTypeBody(type.Vector)
  };
  if ("Struct" in type) return {
    $kind: "datatype",
    datatype: {
      typeName: `${normalizeSuiAddress(type.Struct.address)}::${type.Struct.module}::${type.Struct.name}`,
      typeParameters: type.Struct.typeArguments.map((t) => parseNormalizedSuiMoveTypeBody(t))
    }
  };
  if ("TypeParameter" in type) return {
    $kind: "typeParameter",
    index: type.TypeParameter
  };
  throw new Error(`Unknown type: ${JSON.stringify(type)}`);
}
function parseAbilities(abilitySet) {
  return abilitySet.abilities.map((ability) => {
    switch (ability) {
      case "Copy":
        return "copy";
      case "Drop":
        return "drop";
      case "Store":
        return "store";
      case "Key":
        return "key";
      default:
        return "unknown";
    }
  });
}
function parseVisibility(visibility) {
  switch (visibility) {
    case "Public":
      return "public";
    case "Private":
      return "private";
    case "Friend":
      return "friend";
    default:
      return "unknown";
  }
}

// node_modules/@mysten/sui/dist/jsonRpc/client.mjs
var SUI_CLIENT_BRAND = /* @__PURE__ */ Symbol.for("@mysten/SuiJsonRpcClient");
var SuiJsonRpcClient = class extends BaseClient {
  get [SUI_CLIENT_BRAND]() {
    return true;
  }
  /**
  * Establish a connection to a Sui RPC endpoint
  *
  * @param options configuration options for the API Client
  */
  constructor(options) {
    super({ network: options.network });
    this.jsonRpc = this;
    this.transport = options.transport ?? new JsonRpcHTTPTransport({ url: options.url });
    this.core = new JSONRpcCoreClient({
      jsonRpcClient: this,
      mvr: options.mvr
    });
  }
  async getRpcApiVersion({ signal } = {}) {
    return (await this.transport.request({
      method: "rpc.discover",
      params: [],
      signal
    })).info.version;
  }
  /**
  * Get all Coin<`coin_type`> objects owned by an address.
  */
  async getCoins({ coinType, owner, cursor, limit, signal }) {
    if (!owner || !isValidSuiAddress(normalizeSuiAddress(owner))) throw new Error("Invalid Sui address");
    if (coinType && hasMvrName(coinType)) coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    const result = await this.transport.request({
      method: "suix_getCoins",
      params: [
        owner,
        coinType,
        cursor,
        limit
      ],
      signal
    });
    return {
      ...result,
      data: result.data.filter((coin) => !isCoinReservationDigest(coin.digest))
    };
  }
  /**
  * Get all Coin objects owned by an address.
  */
  async getAllCoins(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) throw new Error("Invalid Sui address");
    const result = await this.transport.request({
      method: "suix_getAllCoins",
      params: [
        input.owner,
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
    return {
      ...result,
      data: result.data.filter((coin) => !isCoinReservationDigest(coin.digest))
    };
  }
  /**
  * Get the total coin balance for one coin type, owned by the address owner.
  */
  async getBalance({ owner, coinType, signal }) {
    if (!owner || !isValidSuiAddress(normalizeSuiAddress(owner))) throw new Error("Invalid Sui address");
    if (coinType && hasMvrName(coinType)) coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    return await this.transport.request({
      method: "suix_getBalance",
      params: [owner, coinType],
      signal
    });
  }
  /**
  * Get the total coin balance for all coin types, owned by the address owner.
  */
  async getAllBalances(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) throw new Error("Invalid Sui address");
    return await this.transport.request({
      method: "suix_getAllBalances",
      params: [input.owner],
      signal: input.signal
    });
  }
  /**
  * Fetch CoinMetadata for a given coin type
  */
  async getCoinMetadata({ coinType, signal }) {
    if (coinType && hasMvrName(coinType)) coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    return await this.transport.request({
      method: "suix_getCoinMetadata",
      params: [coinType],
      signal
    });
  }
  /**
  *  Fetch total supply for a coin
  */
  async getTotalSupply({ coinType, signal }) {
    if (coinType && hasMvrName(coinType)) coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    return await this.transport.request({
      method: "suix_getTotalSupply",
      params: [coinType],
      signal
    });
  }
  /**
  * Invoke any RPC method
  * @param method the method to be invoked
  * @param args the arguments to be passed to the RPC request
  */
  async call(method, params, { signal } = {}) {
    return await this.transport.request({
      method,
      params,
      signal
    });
  }
  /**
  * Get Move function argument types like read, write and full access
  */
  async getMoveFunctionArgTypes({ package: pkg, module, function: fn, signal }) {
    if (pkg && isValidNamedPackage(pkg)) pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getMoveFunctionArgTypes",
      params: [
        pkg,
        module,
        fn
      ],
      signal
    });
  }
  /**
  * Get a map from module name to
  * structured representations of Move modules
  */
  async getNormalizedMoveModulesByPackage({ package: pkg, signal }) {
    if (pkg && isValidNamedPackage(pkg)) pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveModulesByPackage",
      params: [pkg],
      signal
    });
  }
  /**
  * Get a structured representation of Move module
  */
  async getNormalizedMoveModule({ package: pkg, module, signal }) {
    if (pkg && isValidNamedPackage(pkg)) pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveModule",
      params: [pkg, module],
      signal
    });
  }
  /**
  * Get a structured representation of Move function
  */
  async getNormalizedMoveFunction({ package: pkg, module, function: fn, signal }) {
    if (pkg && isValidNamedPackage(pkg)) pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveFunction",
      params: [
        pkg,
        module,
        fn
      ],
      signal
    });
  }
  /**
  * Get a structured representation of Move struct
  */
  async getNormalizedMoveStruct({ package: pkg, module, struct, signal }) {
    if (pkg && isValidNamedPackage(pkg)) pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveStruct",
      params: [
        pkg,
        module,
        struct
      ],
      signal
    });
  }
  /**
  * Get all objects owned by an address
  */
  async getOwnedObjects(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) throw new Error("Invalid Sui address");
    const filter = input.filter ? { ...input.filter } : void 0;
    if (filter && "MoveModule" in filter && isValidNamedPackage(filter.MoveModule.package)) filter.MoveModule = {
      module: filter.MoveModule.module,
      package: (await this.core.mvr.resolvePackage({ package: filter.MoveModule.package })).package
    };
    else if (filter && "StructType" in filter && hasMvrName(filter.StructType)) filter.StructType = (await this.core.mvr.resolveType({ type: filter.StructType })).type;
    return await this.transport.request({
      method: "suix_getOwnedObjects",
      params: [
        input.owner,
        {
          filter,
          options: input.options
        },
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
  }
  /**
  * Get details about an object
  */
  async getObject(input) {
    if (!input.id || !isValidSuiObjectId(normalizeSuiObjectId(input.id))) throw new Error("Invalid Sui Object id");
    return await this.transport.request({
      method: "sui_getObject",
      params: [input.id, input.options],
      signal: input.signal
    });
  }
  async tryGetPastObject(input) {
    return await this.transport.request({
      method: "sui_tryGetPastObject",
      params: [
        input.id,
        input.version,
        input.options
      ],
      signal: input.signal
    });
  }
  /**
  * Batch get details about a list of objects. If any of the object ids are duplicates the call will fail
  */
  async multiGetObjects(input) {
    input.ids.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) throw new Error(`Invalid Sui Object id ${id}`);
    });
    if (input.ids.length !== new Set(input.ids).size) throw new Error(`Duplicate object ids in batch call ${input.ids}`);
    return await this.transport.request({
      method: "sui_multiGetObjects",
      params: [input.ids, input.options],
      signal: input.signal
    });
  }
  /**
  * Get transaction blocks for a given query criteria
  */
  async queryTransactionBlocks({ filter, options, cursor, limit, order, signal }) {
    if (filter && "MoveFunction" in filter && isValidNamedPackage(filter.MoveFunction.package)) filter = {
      ...filter,
      MoveFunction: { package: (await this.core.mvr.resolvePackage({ package: filter.MoveFunction.package })).package }
    };
    return await this.transport.request({
      method: "suix_queryTransactionBlocks",
      params: [
        {
          filter,
          options
        },
        cursor,
        limit,
        (order || "descending") === "descending"
      ],
      signal
    });
  }
  async getTransactionBlock(input) {
    if (!isValidTransactionDigest(input.digest)) throw new Error("Invalid Transaction digest");
    return await this.transport.request({
      method: "sui_getTransactionBlock",
      params: [input.digest, input.options],
      signal: input.signal
    });
  }
  async multiGetTransactionBlocks(input) {
    input.digests.forEach((d) => {
      if (!isValidTransactionDigest(d)) throw new Error(`Invalid Transaction digest ${d}`);
    });
    if (input.digests.length !== new Set(input.digests).size) throw new Error(`Duplicate digests in batch call ${input.digests}`);
    return await this.transport.request({
      method: "sui_multiGetTransactionBlocks",
      params: [input.digests, input.options],
      signal: input.signal
    });
  }
  async executeTransactionBlock({ transactionBlock, signature, options, signal }) {
    return await this.transport.request({
      method: "sui_executeTransactionBlock",
      params: [
        typeof transactionBlock === "string" ? transactionBlock : toBase64(transactionBlock),
        Array.isArray(signature) ? signature : [signature],
        options
      ],
      signal
    });
  }
  async signAndExecuteTransaction({ transaction, signer, ...input }) {
    let transactionBytes;
    if (transaction instanceof Uint8Array) transactionBytes = transaction;
    else {
      transaction.setSenderIfNotSet(signer.toSuiAddress());
      transactionBytes = await transaction.build({ client: this });
    }
    const { signature, bytes } = await signer.signTransaction(transactionBytes);
    return this.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      ...input
    });
  }
  /**
  * Get total number of transactions
  */
  async getTotalTransactionBlocks({ signal } = {}) {
    const resp = await this.transport.request({
      method: "sui_getTotalTransactionBlocks",
      params: [],
      signal
    });
    return BigInt(resp);
  }
  /**
  * Getting the reference gas price for the network
  */
  async getReferenceGasPrice({ signal } = {}) {
    const resp = await this.transport.request({
      method: "suix_getReferenceGasPrice",
      params: [],
      signal
    });
    return BigInt(resp);
  }
  /**
  * Return the delegated stakes for an address
  */
  async getStakes(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) throw new Error("Invalid Sui address");
    return await this.transport.request({
      method: "suix_getStakes",
      params: [input.owner],
      signal: input.signal
    });
  }
  /**
  * Return the delegated stakes queried by id.
  */
  async getStakesByIds(input) {
    input.stakedSuiIds.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) throw new Error(`Invalid Sui Stake id ${id}`);
    });
    return await this.transport.request({
      method: "suix_getStakesByIds",
      params: [input.stakedSuiIds],
      signal: input.signal
    });
  }
  /**
  * Return the latest system state content.
  */
  async getLatestSuiSystemState({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getLatestSuiSystemState",
      params: [],
      signal
    });
  }
  /**
  * Get events for a given query criteria
  */
  async queryEvents({ query, cursor, limit, order, signal }) {
    if (query && "MoveEventType" in query && hasMvrName(query.MoveEventType)) query = {
      ...query,
      MoveEventType: (await this.core.mvr.resolveType({ type: query.MoveEventType })).type
    };
    if (query && "MoveEventModule" in query && isValidNamedPackage(query.MoveEventModule.package)) query = {
      ...query,
      MoveEventModule: {
        module: query.MoveEventModule.module,
        package: (await this.core.mvr.resolvePackage({ package: query.MoveEventModule.package })).package
      }
    };
    if ("MoveModule" in query && isValidNamedPackage(query.MoveModule.package)) query = {
      ...query,
      MoveModule: {
        module: query.MoveModule.module,
        package: (await this.core.mvr.resolvePackage({ package: query.MoveModule.package })).package
      }
    };
    return await this.transport.request({
      method: "suix_queryEvents",
      params: [
        query,
        cursor,
        limit,
        (order || "descending") === "descending"
      ],
      signal
    });
  }
  /**
  * Runs the transaction block in dev-inspect mode. Which allows for nearly any
  * transaction (or Move call) with any arguments. Detailed results are
  * provided, including both the transaction effects and any return values.
  */
  async devInspectTransactionBlock(input) {
    let devInspectTxBytes;
    if (isTransaction(input.transactionBlock)) {
      input.transactionBlock.setSenderIfNotSet(input.sender);
      devInspectTxBytes = toBase64(await input.transactionBlock.build({
        client: this,
        onlyTransactionKind: true
      }));
    } else if (typeof input.transactionBlock === "string") devInspectTxBytes = input.transactionBlock;
    else if (input.transactionBlock instanceof Uint8Array) devInspectTxBytes = toBase64(input.transactionBlock);
    else throw new Error("Unknown transaction block format.");
    input.signal?.throwIfAborted();
    return await this.transport.request({
      method: "sui_devInspectTransactionBlock",
      params: [
        input.sender,
        devInspectTxBytes,
        input.gasPrice?.toString(),
        input.epoch
      ],
      signal: input.signal
    });
  }
  /**
  * Dry run a transaction block and return the result.
  */
  async dryRunTransactionBlock(input) {
    return await this.transport.request({
      method: "sui_dryRunTransactionBlock",
      params: [typeof input.transactionBlock === "string" ? input.transactionBlock : toBase64(input.transactionBlock)]
    });
  }
  /**
  * Return the list of dynamic field objects owned by an object
  */
  async getDynamicFields(input) {
    if (!input.parentId || !isValidSuiObjectId(normalizeSuiObjectId(input.parentId))) throw new Error("Invalid Sui Object id");
    return await this.transport.request({
      method: "suix_getDynamicFields",
      params: [
        input.parentId,
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
  }
  /**
  * Return the dynamic field object information for a specified object
  */
  async getDynamicFieldObject(input) {
    return await this.transport.request({
      method: "suix_getDynamicFieldObject",
      params: [input.parentId, input.name],
      signal: input.signal
    });
  }
  /**
  * Get the sequence number of the latest checkpoint that has been executed
  */
  async getLatestCheckpointSequenceNumber({ signal } = {}) {
    const resp = await this.transport.request({
      method: "sui_getLatestCheckpointSequenceNumber",
      params: [],
      signal
    });
    return String(resp);
  }
  /**
  * Returns information about a given checkpoint
  */
  async getCheckpoint(input) {
    return await this.transport.request({
      method: "sui_getCheckpoint",
      params: [input.id],
      signal: input.signal
    });
  }
  /**
  * Returns historical checkpoints paginated
  */
  async getCheckpoints(input) {
    return await this.transport.request({
      method: "sui_getCheckpoints",
      params: [
        input.cursor,
        input?.limit,
        input.descendingOrder
      ],
      signal: input.signal
    });
  }
  /**
  * Return the committee information for the asked epoch
  */
  async getCommitteeInfo(input) {
    return await this.transport.request({
      method: "suix_getCommitteeInfo",
      params: [input?.epoch],
      signal: input?.signal
    });
  }
  async getNetworkMetrics({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getNetworkMetrics",
      params: [],
      signal
    });
  }
  async getAddressMetrics({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getLatestAddressMetrics",
      params: [],
      signal
    });
  }
  async getEpochMetrics(input) {
    return await this.transport.request({
      method: "suix_getEpochMetrics",
      params: [
        input?.cursor,
        input?.limit,
        input?.descendingOrder
      ],
      signal: input?.signal
    });
  }
  async getAllEpochAddressMetrics(input) {
    return await this.transport.request({
      method: "suix_getAllEpochAddressMetrics",
      params: [input?.descendingOrder],
      signal: input?.signal
    });
  }
  /**
  * Return the committee information for the asked epoch
  */
  async getEpochs(input) {
    return await this.transport.request({
      method: "suix_getEpochs",
      params: [
        input?.cursor,
        input?.limit,
        input?.descendingOrder
      ],
      signal: input?.signal
    });
  }
  /**
  * Returns list of top move calls by usage
  */
  async getMoveCallMetrics({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getMoveCallMetrics",
      params: [],
      signal
    });
  }
  /**
  * Return the committee information for the asked epoch
  */
  async getCurrentEpoch({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getCurrentEpoch",
      params: [],
      signal
    });
  }
  /**
  * Return the Validators APYs
  */
  async getValidatorsApy({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getValidatorsApy",
      params: [],
      signal
    });
  }
  async getChainIdentifier({ signal } = {}) {
    return toHex(fromBase58((await this.getCheckpoint({
      id: "0",
      signal
    })).digest).slice(0, 4));
  }
  async resolveNameServiceAddress(input) {
    return await this.transport.request({
      method: "suix_resolveNameServiceAddress",
      params: [input.name],
      signal: input.signal
    });
  }
  async resolveNameServiceNames({ format = "dot", ...input }) {
    const { nextCursor, hasNextPage, data } = await this.transport.request({
      method: "suix_resolveNameServiceNames",
      params: [
        input.address,
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
    return {
      hasNextPage,
      nextCursor,
      data: data.map((name) => normalizeSuiNSName(name, format))
    };
  }
  async getProtocolConfig(input) {
    return await this.transport.request({
      method: "sui_getProtocolConfig",
      params: [input?.version],
      signal: input?.signal
    });
  }
  async verifyZkLoginSignature(input) {
    return await this.transport.request({
      method: "sui_verifyZkLoginSignature",
      params: [
        input.bytes,
        input.signature,
        input.intentScope,
        input.author
      ],
      signal: input.signal
    });
  }
  /**
  * Wait for a transaction block result to be available over the API.
  * This can be used in conjunction with `executeTransactionBlock` to wait for the transaction to
  * be available via the API.
  * This currently polls the `getTransactionBlock` API to check for the transaction.
  */
  async waitForTransaction({ signal, timeout = 60 * 1e3, pollInterval = 2 * 1e3, ...input }) {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutSignal.addEventListener("abort", () => reject(timeoutSignal.reason));
    });
    timeoutPromise.catch(() => {
    });
    while (!timeoutSignal.aborted) {
      signal?.throwIfAborted();
      try {
        return await this.getTransactionBlock(input);
      } catch {
        await Promise.race([new Promise((resolve) => setTimeout(resolve, pollInterval)), timeoutPromise]);
      }
    }
    timeoutSignal.throwIfAborted();
    throw new Error("Unexpected error while waiting for transaction block.");
  }
};

// node_modules/@mysten/sui/dist/jsonRpc/network.mjs
function getJsonRpcFullnodeUrl(network) {
  switch (network) {
    case "mainnet":
      return "https://fullnode.mainnet.sui.io:443";
    case "testnet":
      return "https://fullnode.testnet.sui.io:443";
    case "devnet":
      return "https://fullnode.devnet.sui.io:443";
    case "localnet":
      return "http://127.0.0.1:9000";
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// site/checkout.ts
var EXECUTE_FEATURES = [
  "sui:signAndExecuteTransaction",
  "sui:signAndExecuteTransactionBlock"
];
var NETWORK_CHAINS = {
  mainnet: SUI_MAINNET_CHAIN,
  testnet: SUI_TESTNET_CHAIN,
  devnet: SUI_DEVNET_CHAIN,
  localnet: SUI_LOCALNET_CHAIN
};
function mountCheckout({
  target,
  intent,
  expired,
  config
}) {
  const walletApi = getWallets();
  const state = {
    ...config,
    wallets: [],
    selectedWalletName: "",
    account: null,
    digest: "",
    verification: null,
    status: expired ? {
      kind: "error",
      message: "This payment intent is expired. Create a fresh checkout link."
    } : {
      kind: "info",
      message: "Connect a Sui wallet to submit this testnet settlement transaction."
    }
  };
  const refreshWallets = () => {
    state.wallets = walletApi.get().filter((wallet) => isSuiExecutionWallet(wallet, state.network));
    if (!state.selectedWalletName && state.wallets[0]) {
      state.selectedWalletName = state.wallets[0].name;
    }
    if (state.selectedWalletName && !state.wallets.some((wallet) => wallet.name === state.selectedWalletName)) {
      state.selectedWalletName = state.wallets[0]?.name ?? "";
      state.account = null;
    }
    render();
  };
  walletApi.on("register", refreshWallets);
  walletApi.on("unregister", refreshWallets);
  refreshWallets();
  function render() {
    const selectedWallet = getSelectedWallet();
    const verifyPayload = buildVerifyPayload(intent, state);
    const canConnect = !expired && Boolean(selectedWallet);
    const canPay = canConnect && Boolean(state.account) && Boolean(state.coinType.trim()) && Number.isInteger(state.decimals) && state.decimals >= 0;
    const manualDigest = state.digest || "";
    target.innerHTML = `
      <section class="checkout-runtime-panel" aria-label="Wallet payment">
        <div class="checkout-runtime-head">
          <div>
            <span>Wallet handoff</span>
            <strong>${escapeHtml(state.network)} settlement</strong>
          </div>
          <span class="checkout-runtime-badge">v0.2 alpha</span>
        </div>

        <div class="checkout-runtime-grid">
          <label class="checkout-field">
            <span>Network</span>
            <select data-field="network" ${expired ? "disabled" : ""}>
              ${renderNetworkOptions(state.network)}
            </select>
          </label>
          <label class="checkout-field">
            <span>Decimals</span>
            <input data-field="decimals" inputmode="numeric" value="${escapeHtml(state.decimals)}" ${expired ? "disabled" : ""} />
          </label>
        </div>

        <label class="checkout-field">
          <span>Coin type</span>
          <input
            data-field="coinType"
            placeholder="0x...::usdc::USDC"
            value="${escapeHtml(state.coinType)}"
            ${expired ? "disabled" : ""}
          />
        </label>

        <label class="checkout-field">
          <span>RPC URL</span>
          <input
            data-field="rpcUrl"
            placeholder="${escapeHtml(getJsonRpcFullnodeUrl(state.network))}"
            value="${escapeHtml(state.rpcUrl)}"
            ${expired ? "disabled" : ""}
          />
        </label>

        <div class="checkout-wallet-row">
          <label class="checkout-field">
            <span>Wallet</span>
            <select data-field="wallet" ${expired || !state.wallets.length ? "disabled" : ""}>
              ${state.wallets.length ? state.wallets.map(
      (wallet) => `<option value="${escapeHtml(wallet.name)}" ${wallet.name === state.selectedWalletName ? "selected" : ""}>${escapeHtml(wallet.name)}</option>`
    ).join("") : `<option>No Sui wallet detected</option>`}
            </select>
          </label>
          <button type="button" data-action="refresh-wallets">Refresh</button>
        </div>

        ${state.account ? `<p class="checkout-account">Connected: <strong>${escapeHtml(shortAddress(state.account.address))}</strong></p>` : ""}

        <div class="checkout-runtime-actions">
          <button type="button" data-action="connect-wallet" ${canConnect ? "" : "disabled"}>Connect wallet</button>
          <button type="button" data-action="pay-wallet" ${canPay ? "" : "disabled"}>Pay and return digest</button>
        </div>

        <div class="checkout-digest-row">
          <label class="checkout-field">
            <span>Transaction digest</span>
            <input data-field="digest" placeholder="Paste digest to verify manually" value="${escapeHtml(manualDigest)}" />
          </label>
          <button type="button" data-action="verify-digest" ${state.digest ? "" : "disabled"}>Verify</button>
        </div>

        <p class="checkout-runtime-status" data-state="${state.status.kind}">
          ${escapeHtml(state.status.message)}
        </p>

        ${renderVerification(state.verification)}
        ${verifyPayload ? renderVerifyPayload(verifyPayload) : ""}
      </section>
    `;
    bindEvents();
  }
  function bindEvents() {
    const syncActionState = () => {
      const payButton = target.querySelector(
        '[data-action="pay-wallet"]'
      );
      const verifyButton = target.querySelector(
        '[data-action="verify-digest"]'
      );
      if (payButton) {
        payButton.disabled = expired || !getSelectedWallet() || !state.account || !state.coinType.trim() || !Number.isInteger(state.decimals) || state.decimals < 0;
      }
      if (verifyButton) {
        verifyButton.disabled = !state.digest;
      }
    };
    target.querySelector('[data-field="network"]')?.addEventListener("change", (event) => {
      state.network = readNetwork(event.currentTarget.value);
      state.account = null;
      state.verification = null;
      refreshWallets();
    });
    target.querySelector('[data-field="coinType"]')?.addEventListener("input", (event) => {
      state.coinType = event.currentTarget.value.trim();
      syncActionState();
    });
    target.querySelector('[data-field="decimals"]')?.addEventListener("input", (event) => {
      const value = Number(event.currentTarget.value);
      state.decimals = Number.isInteger(value) ? value : Number.NaN;
      syncActionState();
    });
    target.querySelector('[data-field="rpcUrl"]')?.addEventListener("input", (event) => {
      state.rpcUrl = event.currentTarget.value.trim();
    });
    target.querySelector('[data-field="wallet"]')?.addEventListener("change", (event) => {
      state.selectedWalletName = event.currentTarget.value;
      state.account = null;
      state.verification = null;
      render();
    });
    target.querySelector('[data-field="digest"]')?.addEventListener("input", (event) => {
      state.digest = event.currentTarget.value.trim();
      syncActionState();
    });
    target.querySelector('[data-action="refresh-wallets"]')?.addEventListener("click", refreshWallets);
    target.querySelector('[data-action="connect-wallet"]')?.addEventListener("click", () => void connectWallet());
    target.querySelector('[data-action="pay-wallet"]')?.addEventListener("click", () => void payWithWallet());
    target.querySelector('[data-action="verify-digest"]')?.addEventListener("click", () => void verifyDigest());
    target.querySelector('[data-action="copy-verify-payload"]')?.addEventListener("click", () => void copyVerifyPayload());
  }
  function getSelectedWallet() {
    return state.wallets.find((wallet) => wallet.name === state.selectedWalletName);
  }
  async function connectWallet() {
    const wallet = getSelectedWallet();
    if (!wallet) {
      setStatus("error", "No compatible Sui wallet was detected.");
      return;
    }
    try {
      setStatus("busy", `Requesting access from ${wallet.name}...`);
      const connect = getConnectFeature(wallet);
      const output = await connect.connect();
      const chain2 = NETWORK_CHAINS[state.network];
      const account = output.accounts.find((item) => item.chains.includes(chain2)) ?? wallet.accounts.find((item) => item.chains.includes(chain2)) ?? output.accounts[0] ?? wallet.accounts[0] ?? null;
      if (!account) {
        throw new Error(`${wallet.name} did not return a Sui account for ${state.network}.`);
      }
      state.account = account;
      setStatus("ok", `Connected ${shortAddress(account.address)} on ${state.network}.`);
    } catch (error) {
      state.account = null;
      setStatus("error", readableError(error));
    }
  }
  async function payWithWallet() {
    const wallet = getSelectedWallet();
    if (!wallet || !state.account) {
      setStatus("error", "Connect a wallet before submitting payment.");
      return;
    }
    if (!state.coinType.trim()) {
      setStatus("error", "Coin type is required when the intent uses a symbol like USDC.");
      return;
    }
    try {
      setStatus("busy", "Building the Sui transfer transaction...");
      const client = createSuiClient(state);
      const { transaction, amountAtomic } = await buildCoinObjectPaymentTransaction(
        client,
        intent,
        state.account.address,
        state.coinType.trim(),
        state.decimals
      );
      setStatus("busy", "Waiting for wallet signature and execution...");
      const result = await signAndExecuteTransaction(wallet, {
        account: state.account,
        chain: NETWORK_CHAINS[state.network],
        transaction
      });
      state.digest = result.digest;
      setStatus(
        "busy",
        `Digest returned: ${shortDigest(result.digest)}. Verifying receiver delta...`
      );
      await verifyDigest(amountAtomic);
    } catch (error) {
      setStatus("error", readableError(error));
    }
  }
  async function verifyDigest(precomputedAmountAtomic) {
    if (!state.digest) {
      setStatus("error", "Paste or submit a transaction digest first.");
      return;
    }
    if (!state.coinType.trim()) {
      setStatus("error", "Coin type is required before verification.");
      return;
    }
    try {
      setStatus("busy", "Checking transaction effects through Sui RPC...");
      const client = createSuiClient(state);
      const amountAtomic = precomputedAmountAtomic ?? decimalToAtomicAmount(intent.amount, state.decimals);
      const tx = await client.getTransactionBlock({
        digest: state.digest,
        options: {
          showBalanceChanges: true,
          showEffects: true,
          showInput: true
        }
      });
      const verification = verifyTransaction(tx, intent, {
        coinType: state.coinType.trim(),
        amountAtomic,
        expectedSender: state.account?.address
      });
      state.verification = verification;
      setStatus(
        verification.ok ? "ok" : "error",
        verification.ok ? "Payment verified. Send the payload to /payments/verify/sui before fulfillment." : `Verification failed: ${verification.errors.join(", ")}.`
      );
    } catch (error) {
      setStatus("error", readableError(error));
    }
  }
  async function copyVerifyPayload() {
    const payload = buildVerifyPayload(intent, state);
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatus("ok", "Verification payload copied.");
    } catch {
      setStatus("error", "Clipboard access failed.");
    }
  }
  function setStatus(kind, message) {
    state.status = { kind, message };
    render();
  }
}
function buildCoinObjectPaymentTransaction(client, intent, payer, coinType, decimals) {
  return (async () => {
    const amountAtomic = decimalToAtomicAmount(intent.amount, decimals);
    const coins = await collectCoins(client, payer, coinType, BigInt(amountAtomic));
    const transaction = new Transaction();
    const primary = transaction.objectRef(toObjectRef(coins[0]));
    const mergeSources = coins.slice(1).map((coin) => transaction.objectRef(toObjectRef(coin)));
    transaction.setSender(payer);
    if (mergeSources.length) {
      transaction.mergeCoins(primary, mergeSources);
    }
    const [paymentCoin] = transaction.splitCoins(primary, [amountAtomic]);
    transaction.transferObjects([paymentCoin], intent.receiver);
    return { transaction, amountAtomic };
  })();
}
async function collectCoins(client, owner, coinType, requiredAmount) {
  const coins = [];
  let total = 0n;
  let cursor;
  do {
    const page = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: 50
    });
    for (const coin of page.data) {
      coins.push(coin);
      total += BigInt(coin.balance);
      if (total >= requiredAmount) return coins;
    }
    cursor = page.nextCursor;
  } while (cursor);
  throw new Error(
    `Insufficient ${coinType} balance. Need ${requiredAmount.toString()} atomic units, found ${total.toString()}.`
  );
}
function verifyTransaction(tx, intent, options) {
  const errors = [];
  const status = tx.effects?.status?.status ?? "unknown";
  if (status !== "success") {
    errors.push("transaction_failed");
  }
  const receiverDelta = sumBalanceChanges(tx.balanceChanges, intent.receiver, options.coinType);
  if (receiverDelta <= 0n) {
    errors.push("receiver_payment_missing");
  } else if (receiverDelta !== BigInt(options.amountAtomic)) {
    errors.push("amount_mismatch");
  }
  const senderDelta = options.expectedSender ? sumBalanceChanges(tx.balanceChanges, options.expectedSender, options.coinType) : void 0;
  if (options.expectedSender && (!senderDelta || senderDelta >= 0n)) {
    errors.push("sender_mismatch");
  }
  return {
    ok: errors.length === 0,
    errors,
    status,
    receiverDelta: receiverDelta.toString(),
    senderDelta: senderDelta?.toString(),
    amountAtomic: options.amountAtomic
  };
}
function buildVerifyPayload(intent, state) {
  if (!state.digest || !state.coinType.trim()) return null;
  return {
    intent,
    txDigest: state.digest,
    coinType: state.coinType.trim(),
    decimals: state.decimals,
    expectedSender: state.account?.address,
    amountPolicy: "exact",
    options: {
      enforceExpiration: true
    }
  };
}
function createSuiClient(state) {
  return new SuiJsonRpcClient({
    network: state.network,
    url: state.rpcUrl || getJsonRpcFullnodeUrl(state.network)
  });
}
function isSuiExecutionWallet(wallet, network) {
  const chain2 = NETWORK_CHAINS[network];
  const hasChain = wallet.chains.includes(chain2);
  const hasConnect = Boolean(wallet.features["standard:connect"]);
  const hasExecute = EXECUTE_FEATURES.some((feature) => Boolean(wallet.features[feature]));
  return hasChain && hasConnect && hasExecute;
}
function getConnectFeature(wallet) {
  const feature = wallet.features["standard:connect"];
  if (!feature) {
    throw new Error(`${wallet.name} does not expose standard:connect.`);
  }
  return feature;
}
function toObjectRef(coin) {
  return {
    objectId: coin.coinObjectId,
    version: coin.version,
    digest: coin.digest
  };
}
function decimalToAtomicAmount(amount, decimals) {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount)) {
    throw new Error("Expected a positive decimal amount.");
  }
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Expected decimals to be a non-negative integer.");
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new Error("Amount has more decimal places than this coin supports.");
  }
  const scale = 10n ** BigInt(decimals);
  const wholeAtomic = BigInt(whole) * scale;
  const fractionAtomic = BigInt(fraction.padEnd(decimals, "0") || "0");
  return (wholeAtomic + fractionAtomic).toString();
}
function sumBalanceChanges(changes, owner, coinType) {
  return (changes ?? []).reduce((total, change) => {
    if (!sameCoinType(change.coinType, coinType)) return total;
    if (!sameAddress(ownerAddress(change.owner), owner)) return total;
    return total + BigInt(change.amount);
  }, 0n);
}
function ownerAddress(owner) {
  if (typeof owner === "string") return null;
  if ("AddressOwner" in owner) return owner.AddressOwner;
  if ("ConsensusAddressOwner" in owner) return owner.ConsensusAddressOwner.owner;
  return null;
}
function sameAddress(left, right) {
  return left?.toLowerCase() === right.toLowerCase();
}
function sameCoinType(left, right) {
  return left === right || left.toLowerCase() === right.toLowerCase();
}
function readNetwork(value) {
  return value === "mainnet" || value === "devnet" || value === "localnet" ? value : "testnet";
}
function renderNetworkOptions(selected) {
  return ["testnet", "mainnet", "devnet", "localnet"].map(
    (network) => `<option value="${network}" ${network === selected ? "selected" : ""}>${network}</option>`
  ).join("");
}
function renderVerification(result) {
  if (!result) return "";
  return `
    <div class="checkout-result" data-state="${result.ok ? "ok" : "error"}">
      <span>${result.ok ? "Verified" : "Not verified"}</span>
      <dl>
        <div><dt>Status</dt><dd>${escapeHtml(result.status)}</dd></div>
        <div><dt>Expected</dt><dd>${escapeHtml(result.amountAtomic)}</dd></div>
        <div><dt>Receiver delta</dt><dd>${escapeHtml(result.receiverDelta)}</dd></div>
        ${result.senderDelta ? `<div><dt>Sender delta</dt><dd>${escapeHtml(result.senderDelta)}</dd></div>` : ""}
      </dl>
      ${result.errors.length ? `<p>${escapeHtml(result.errors.join(", "))}</p>` : ""}
    </div>
  `;
}
function renderVerifyPayload(payload) {
  return `
    <div class="checkout-payload">
      <div>
        <span>Backend verify payload</span>
        <button type="button" data-action="copy-verify-payload">Copy</button>
      </div>
      <pre><code>${escapeHtml(JSON.stringify(payload, null, 2))}</code></pre>
    </div>
  `;
}
function shortAddress(address) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
function shortDigest(digest) {
  if (digest.length <= 18) return digest;
  return `${digest.slice(0, 8)}...${digest.slice(-6)}`;
}
function readableError(error) {
  return error instanceof Error ? error.message : String(error);
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export {
  mountCheckout
};
/*! Bundled license information:

@scure/base/index.js:
  (*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
