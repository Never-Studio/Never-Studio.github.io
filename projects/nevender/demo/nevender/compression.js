"use strict";

import { lzw_encode, lzw_decode } from "./lzw.js";

const LZW = false;
const METADATA = new Set(["j"]);

function compress(repr, recursion = false) {
  /*
  Object repr
    structure:
      {
        t: "a"|"j"|"n"|"u"|undefined,
        v: Any | undefined | null,
        uncompressed: boolean
          set to true: compresses repr again
          set to false: returns repr as is
      }




  boolean recursion
    set to false: returns the value .v only
    set to true: returns a json in the structure above
  */

  /*
  types:
    a: array
    j: json
    n: null type
    u: unknown
  */
  if (repr != null && repr != undefined) {
    if (repr.uncompressed || recursion) {
      // if repr is marked as uncompressed or a child of uncompressed data and therefore also uncompressed
      if (ArrayBuffer.isView(repr.v)) {
        let array = [];
        for (var i = 0; i < repr.v.length; i++) array[i] = repr.v[i];

        repr.v = array;
      }

      if (!repr.t) {
        // if no type is defined
        repr.t = "u";

        if (Array.isArray(repr.v)) {
          repr.t = "a";
        } else if (typeof repr.v === "object" && repr.v !== null) {
          repr.t = "j";
        } else if (repr.v === null || repr.v === undefined) {
          repr.t = "n";
        }
      }

      if (repr.t == "a") {
        // if type is array
        let newRepr = { t: repr.t };

        let metaData; // the genereated metadata
        let type;

        newRepr.v = [];

        for (const entry of repr.v) {
          const res = compress({ v: entry }, true); // recursively compress element

          if (METADATA.has(res.t)) {
            // if element has metadata
            if (JSON.stringify(metaData) !== JSON.stringify(res.v[1])) {
              // do nothing to store unrepeated metadata later
              metaData = res.v[1]; // store metadata metadata (second element) to compare later
            } else {
              // ignore repeated metadata
              res.v = res.v[0]; // omit metadata (second element) if it would be a repetition
            }
          }

          if (res.t == "u" || res.t == type) {
            // if type has no custom representation or the type is the same as last time
            // store only bare value
            newRepr.v.push(res.v);
          } else {
            // if type has custom representation or a different type than last time
            // store full repr
            newRepr.v.push(res);
          }

          type = res.t; // store current type to compare later
        }

        return newRepr;
      }

      if (repr.t == "j") {
        // if type is json
        let newRepr = { t: repr.t };

        newRepr.v = [[], []];

        let metaData; // the genereated metadata
        let type;

        for (const entry in repr.v) {
          const res = compress({ v: repr.v[entry] }, true); // recursively compress element

          if (METADATA.has(res.t)) {
            // if element has metadata
            if (JSON.stringify(metaData) !== JSON.stringify(res.v[1])) {
              // do nothing to store unrepeated metadata later
              metaData = res.v[1]; // store metadata metadata (second element) to compare later
            } else {
              // ignore repeated metadata
              res.v = res.v[0]; // omit metadata (second element) if it would be a repetition
            }
          }

          newRepr.v[1].push(entry);

          if (res.t == "u" || res.t == type) {
            // if type has no custom representation or the type is the same as last time
            // store only bare value
            newRepr.v[0].push(res.v);
          } else {
            // if type has custom representation or a different type than last time
            // store full repr
            newRepr.v[0].push(res);
          }
          type = res.t; // store current type to compare later
        }

        return newRepr;
      }

      if (repr.t == "n") {
        if (recursion) return { v: repr.v, t: "n" }; // return full repr if the data is needed by a higher order proccess
        return repr.v; // return exact same value if type has no representation
      }

      if (repr.t == "u") {
        if (recursion) return { v: repr.v, t: "u" }; // return full repr if the data is needed by a higher order proccess
        return repr.v; // return exact same value if type has no representation
      }

      throw new Error(`No type compression implemented for ${repr.t}`);
    }
  }
  // if repr is already compressed
  if (repr?.v == undefined && repr?.t == undefined) {
    console.error(
      `assumed the repr is compressed but it doesn't contain the neccessary keywords. repr: ${repr}`,
    );
  }

  return repr;
}

function decompress(repr, metadata = undefined, lasttype = undefined) {
  /*
  Object repr
    structure:
      {
        t: "a"|"j"|"n"|"u"| undefined,
        v: Any | undefined | null,
        uncompressed: boolean
      }


  any metadata
    metadata of the higher order object to be used in the lower order one
  */

  const TYPES = new Set(["a", "j", "n", "u"]);

  if (repr != null && repr != undefined) {
    if (repr.uncompressed) {
      // if repr is uncompressed return full repr
      return repr.v;
    }
  }

  if (repr?.t == undefined || !TYPES.has(repr.t)) {
    // if no type is defined or there is an accidental collision

    if (lasttype !== undefined && TYPES.has(lasttype)) {
      // if the type of the higher order is defined use it
      if (typeof repr === "object" && repr !== null) {
        repr = { t: lasttype, v: repr };
      }
    } else {
      return repr;
    }
  }

  if (repr?.t == "a") {
    // if the type of the repr is array
    const result = [];
    let metaData = metadata; // default metadata is the higher order metadata
    let type = lasttype; // default tyoe is the higher order tyoe

    for (let el of repr.v) {
      if (el?.t !== undefined && TYPES.has(el?.t)) {
        type = el.t; // store type if it is valid
      }

      if (METADATA.has(el?.t)) {
        // if type can have metadata
        if (el?.v[1]) {
          // if metadata exists store it
          metaData = el.v[1];
        } else {
          // if metadata doesnt exit use the last stored metadata
          if (el?.v !== undefined && el?.v !== null) el.v[1] = metaData;
        }
      }

      // decompress and store value of object
      result.push(decompress(el, metaData, type));
    }

    return result;
  }

  if (repr?.t == "j") {
    if (!Array.isArray(repr.v[0])) repr.v = [repr.v];

    // if the type of the repr is json
    const result = {};
    let type = lasttype; // default tyoe is the higher order tyoe
    let index = 0;
    let indexed = metadata; // default metadata is the higher order metadata

    if (repr.v[1] !== undefined && METADATA.has(repr.t)) {
      // if the repr has metadata set the default metadata to that metadata instead
      indexed = repr.v[1];
    }

    let metaData = metadata;

    for (let el of repr.v[0]) {
      if (el?.t !== undefined && TYPES.has(el?.t)) {
        // if the repr has a type store type as default
        type = el.t;
      }

      if (el?.v?.[1] !== undefined && METADATA.has(type)) {
        // if the repr has a metadata store the metaData as default
        metaData = el.v[1];
      }

      // decompress and store value of object
      result[indexed[index]] = decompress(el, metaData, type);
      index++;
    }

    return result;
  }

  if (repr?.hasOwnProperty) {
    if (repr.hasOwnProperty("v")) {
      // if the value of the repr exists return only the value
      return repr.v;
    }

    if (repr.hasOwnProperty("t")) {
      return undefined;
    }
  }

  return repr;
}

function compressString(repr, lzw = LZW) {
  if (repr == null || repr == undefined) {
    repr = { v: repr, uncompressed: true };
  } else if (!repr.uncompressed) {
    repr = { v: repr, uncompressed: true };
  }

  const text = JSON.stringify(repr.v) || "undefined";
  const tryCompress = (JSON.stringify(compress(repr)) || "undefined")
    .replaceAll(
      /(?:\'(?!true|false|null)([a-zA-Z\s][\sa-zA-Z0-9]*)\')|(?:\"(?!true|false|null)([a-zA-Z\s][\sa-zA-Z0-9]*)\")/gm,
      "$1$2",
    )
    .replaceAll("{t:a,v:[", "a[")
    .replaceAll("{t:j,v:[", "j[")
    .replaceAll("],[", "][")
    .replaceAll("][", "ü");

  if (tryCompress.length > text.length) {
    const res = text
      .replaceAll(
        /(?:\'(?!true|false|null)([a-zA-Z\s][\sa-zA-Z0-9\.]*)\')|(?:\"(?!true|false|null)([a-zA-Z\s][\sa-zA-Z0-9\.]*)\")/gm,
        "$1$2",
      )
      .replaceAll("],[", "][")
      .replaceAll("][", "ü");
    if (lzw) return lzw_encode(res);
    return res;
  }

  if (lzw) return lzw_encode(tryCompress);
  return tryCompress;
}

function decompressString(string, lzw = LZW) {
  if (typeof string !== "string") return string.v;

  if (lzw) string = lzw_decode(string);
  string = string
    .replaceAll("a[", "{t:a,v:[")
    .replaceAll("j[", "{t:j,v:[")
    .replaceAll("ü", "][")
    .replaceAll("][", "],[")
    .replaceAll(
      /(?!true|false|null)\b([a-zA-Z\s][\sa-zA-Z0-9\.]*)\b/gm,
      '"$1"',
    );

  return decompress(JSON.parse(string));
}

function test() {
  const testCases = [
    null,
    undefined,
    true,
    false,
    0,
    -1,
    NaN,
    Infinity,
    "",
    "text",

    { a: null, b: undefined, c: false },
    { a: "", b: [], c: {} },
    { a: [null, undefined, 0] },
    { nested: { deeper: { value: 123 } } },

    [
      { id: 1, tags: ["a", "b"] },
      { id: 2, tags: ["c"] },
      { id: 3, tags: [] },
    ],

    [
      { id: 1, meta: { active: true } },
      { id: 2, meta: { active: false } },
    ],

    [
      { a: 1, b: { c: 2 } },
      { a: 3, b: { c: 4 } },
    ],

    [{ a: [1, 2, 3] }, { a: [4, 5, 6] }],

    [{ a: [{ x: 1 }, { x: 2 }] }, { a: [{ x: 3 }, { x: 4 }] }],

    [{ value: 123 }, { value: 456 }],
    /abc/g,

    [{ fn: () => 123 }, { fn: () => 456 }],

    [Symbol("a"), Symbol("b")],

    {
      map: new Map([
        ["a", 1],
        ["b", 2],
      ]),
    },

    {
      set: new Set([1, 2, 3]),
    },

    [
      {
        users: [
          {
            profile: {
              name: "alice",
              roles: ["admin", "editor"],
            },
          },
        ],
      },
      {
        users: [
          {
            profile: {
              name: "bob",
              roles: ["viewer"],
            },
          },
        ],
      },
    ],

    [[{ a: 1 }], [{ a: 2 }], [{ a: 3 }]],

    [
      {
        a: {
          b: {
            c: {
              d: {
                e: {
                  f: 123,
                },
              },
            },
          },
        },
      },
    ],

    [
      { mixed: [1, "two", null, { x: true }] },
      { mixed: [3, "four", undefined, { x: false }] },
    ],

    [[], {}, [{ a: [] }], { b: {} }],

    {
      users: [
        {
          id: 1,
          posts: [
            { id: 101, title: "hello" },
            { id: 102, title: "world" },
          ],
        },
      ],
    },

    [
      {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      },
    ],

    [
      {
        coords: { lat: 50.1109, lng: 8.6821 },
      },
      {
        coords: { lat: 48.8566, lng: 2.3522 },
      },
    ],

    [
      {
        emptyString: "",
        zero: 0,
        falseVal: false,
        nullVal: null,
      },
    ],

    [
      {
        a: [{ b: [{ c: [{ d: 1 }] }] }],
      },
    ],

    Array.from({ length: 100 }, (_, i) => i),

    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      value: Math.random(),
    })),
    [
      {
        unicode: "こんにちは",
        emoji: "🫠",
      },
      {
        unicode: "привет",
        emoji: "🔥",
      },
    ],
    [
      {
        specialChars: "!@#$%^&*()",
      },
      {
        specialChars: "\n\t\r",
      },
    ],
    [[[[]]]],

    [{}, {}, {}],

    [{ a: 1 }, { a: "1" }, { a: true }],

    [
      { id: 1, data: null },
      { id: 2, data: [] },
      { id: 3, data: {} },
    ],

    [
      { value: Number.MAX_SAFE_INTEGER },
      { value: Number.MIN_SAFE_INTEGER },
      { value: Number.MAX_VALUE },
      { value: Number.MIN_VALUE },
    ],

    [{ float: 0.1 + 0.2 }, { float: Math.PI }, { float: Math.E }],

    [
      {
        deeply: {
          nested: {
            array: [
              {
                with: {
                  objects: [
                    {
                      inside: true,
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ],

    [
      {
        key: "duplicate",
        value: 1,
      },
      {
        key: "duplicate",
        value: 2,
      },
    ],

    [{ sparse: [, , , 4] }, { sparse: new Array(10) }],

    [Object.create(null), Object.freeze({ a: 1 }), Object.seal({ b: 2 })],

    [
      class TestClass {
        constructor() {
          this.value = 123;
        }
      },

      class AnotherClass {
        constructor() {
          this.value = 456;
        }
      },
    ],

    [
      {
        circular: (() => {
          const obj = {};
          obj.self = obj;
          return obj;
        })(),
      },
    ],

    [
      {
        mixedTypes: [1, "2", false, null, undefined, {}, [], () => {}],
      },
    ],

    [
      {
        dates: [],
      },
    ],

    [
      {
        regex: [/a/, /b/i, /c/gm],
      },
    ],

    [
      {
        typed: new Uint8Array([1, 2, 3]),
      },
      {
        typed: new Float32Array([1.1, 2.2]),
      },
    ],

    [
      {
        bigint: 999999999999999999999999999999999999,
      },
    ],

    [
      {
        map: new Map([[{ complex: true }, ["a", "b"]]]),
      },
    ],

    [
      {
        set: new Set([{ id: 1 }, { id: 2 }]),
      },
    ],

    [
      async function test() {
        return 123;
      },
    ],

    [
      function* generator() {
        yield 1;
        yield 2;
      },
    ],

    [
      {
        nan: NaN,
        infinity: Infinity,
        negativeInfinity: -Infinity,
      },
    ],

    [
      {
        escapeSequences: "\\n\\t\\r\\\\",
      },
    ],

    [
      {
        jsonLike: '{"a":1,"b":[1,2,3]}',
      },
    ],

    [
      {
        xmlLike: "<root><child>value</child></root>",
      },
    ],

    [
      {
        sqlLike: "SELECT * FROM users WHERE id = 1;",
      },
    ],

    [
      {
        htmlLike: "<div class='test'>hello</div>",
      },
    ],

    [
      {
        booleanMatrix: [
          [true, false],
          [false, true],
        ],
      },
    ],

    [
      {
        invalidNumbers: [NaN, Infinity, -Infinity],
      },
    ],

    [
      {
        emptyValues: {
          str: "",
          arr: [],
          obj: {},
          nil: null,
        },
      },
    ],

    [
      {
        coordinates: [
          { x: 0, y: 0 },
          { x: -9999, y: 9999 },
        ],
      },
    ],

    [
      {
        version: "1.0.0",
        semver: "^2.3.4",
      },
    ],

    [
      {
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
        },
      },
    ],

    [
      {
        fakeApiResponse: {
          success: true,
          data: {
            users: [
              { id: 1, name: "alice" },
              { id: 2, name: "bob" },
            ],
          },
        },
      },
    ],

    [
      {
        graph: {
          nodes: [{ id: "a" }, { id: "b" }],
          edges: [{ from: "a", to: "b" }],
        },
      },
    ],

    [
      {
        tree: {
          value: 1,
          left: {
            value: 2,
          },
          right: {
            value: 3,
          },
        },
      },
    ],

    [
      {
        localization: {
          en: "hello",
          de: "hallo",
          jp: "こんにちは",
        },
      },
    ],

    [
      {
        massiveArray: Array.from({ length: 1000 }, (_, i) => i),
      },
    ],

    [
      {
        randomObjects: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          active: i % 2 === 0,
          score: Math.random(),
        })),
      },
    ],
  ];

  let count1 = 0;
  let count2 = 0;
  let count3 = 0;

  for (let _case of testCases) {
    _case ??= "undefined";

    let compressed;
    let decompressed;
    let ratio;
    try {
      compressed = compressString(_case);
      decompressed = decompressString(compressed);
      ratio = compressed.length / JSON.stringify(_case).length;
    } catch (e) {
      console.log(e.message);
      console.log("normal error", _case);
      console.log(compressed);
      continue;
    }

    let lzwCompressed;
    let lzwDecompressed;
    let lzwRatio;
    try {
      lzwCompressed = lzw_encode(JSON.stringify(_case));
      lzwDecompressed = JSON.parse(lzw_decode(lzwCompressed));
      lzwRatio = lzwCompressed.length / JSON.stringify(_case).length;
    } catch (e) {
      console.log(e.message);
      console.log("lzw error", _case);
      console.log(lzwCompressed);
      continue;
    }

    let bothCompressed;
    let bothDecompressed;
    let bothRatio;
    try {
      bothCompressed = lzw_encode(compressString(_case));
      bothDecompressed = decompressString(lzw_decode(bothCompressed));
      bothRatio = bothCompressed.length / JSON.stringify(_case).length;
    } catch (e) {
      console.log(e.message);
      console.log("both error", _case);
      console.log(bothCompressed);
      continue;
    }

    const min = Math.min(ratio, lzwRatio, bothRatio);

    if (ratio == min) count1++;
    if (lzwRatio == min) count2++;
    if (bothRatio == min) count3++;

    console.log(bothRatio);

    if (JSON.stringify(bothDecompressed) !== JSON.stringify(_case)) {
      console.error("compression failed");
      console.log(bothDecompressed);
      console.log(JSON.stringify(_case));
    }

    if (JSON.stringify(decompressed) !== JSON.stringify(_case)) {
      console.error("compression failed");
      console.log(decompressed);
      console.log(JSON.stringify(_case));
    }

    if (JSON.stringify(lzwDecompressed) !== JSON.stringify(_case)) {
      console.error("lzw compression failed");
      console.log(lzwDecompressed);
      console.log(JSON.stringify(_case));
    }
  }

  console.log("normal:", count1);
  console.log("lzw:", count2);
  console.log("both:", count3);
}

//test();

export { decompressString, compressString, test };
